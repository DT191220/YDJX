"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const router = (0, express_1.Router)();
// 获取教练工资列表
router.get('/', async (req, res) => {
    try {
        const { limit = 50, offset = 0, salary_month, coach_name, status, sortBy = 'salary_month', sortOrder = 'desc' } = req.query;
        let query = 'SELECT * FROM coach_monthly_salary WHERE 1=1';
        const params = [];
        // 筛选条件
        if (salary_month) {
            query += ' AND salary_month = ?';
            params.push(salary_month);
        }
        if (coach_name) {
            query += ' AND coach_name LIKE ?';
            params.push(`%${coach_name}%`);
        }
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        // 排序
        const validSortColumns = ['salary_month', 'coach_name', 'gross_salary', 'net_salary', 'created_at'];
        const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'salary_month';
        const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${sortColumn} ${order}, id DESC`;
        // 获取总数
        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total').split('ORDER BY')[0];
        const [countResult] = await database_1.default.query(countQuery, params);
        const total = countResult[0].total;
        // 分页
        query += ' LIMIT ? OFFSET ?';
        params.push(Number(limit), Number(offset));
        const [rows] = await database_1.default.query(query, params);
        res.json({
            success: true,
            data: {
                list: rows,
                pagination: {
                    total,
                    limit: Number(limit),
                    offset: Number(offset)
                }
            }
        });
    }
    catch (error) {
        console.error('获取教练工资列表失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误: ' + error.message
        });
    }
});
// 生成指定月份的工资数据
router.post('/generate', async (req, res) => {
    try {
        const { salary_month } = req.body; // YYYY-MM格式
        if (!salary_month || !/^\d{4}-\d{2}$/.test(salary_month)) {
            return res.status(400).json({
                success: false,
                message: '请提供有效的月份（格式：YYYY-MM）'
            });
        }
        // 获取当前有效的工资配置
        const targetDate = `${salary_month}-01`;
        const configQuery = `
      SELECT * FROM salary_config 
      WHERE effective_date <= ? 
        AND (expiry_date IS NULL OR expiry_date >= ?)
      ORDER BY effective_date DESC
    `;
        const [configRows] = await database_1.default.query(configQuery, [targetDate, targetDate]);
        // 构建配置映射
        const configMap = new Map();
        configRows.forEach((row) => {
            if (!configMap.has(row.config_type)) {
                configMap.set(row.config_type, row.amount);
            }
        });
        const baseDailySalary = Number(configMap.get('base_daily_salary') || 0);
        const subject2Commission = Number(configMap.get('subject2_commission') || 0);
        const subject3Commission = Number(configMap.get('subject3_commission') || 0);
        const recruitmentCommission = Number(configMap.get('recruitment_commission') || 0);
        // 获取在职教练列表
        const [coaches] = await database_1.default.query("SELECT id, name FROM coaches WHERE status = '在职'");
        if (!Array.isArray(coaches) || coaches.length === 0) {
            return res.json({
                success: true,
                data: { generated: 0 },
                message: '没有在职教练，无需生成工资数据'
            });
        }
        // 计算月份范围
        const monthStart = `${salary_month}-01`;
        const monthEnd = new Date(salary_month + '-01');
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        const monthEndStr = monthEnd.toISOString().split('T')[0];
        let generatedCount = 0;
        for (const coach of coaches) {
            // 检查是否已存在该月份的工资记录
            const [existing] = await database_1.default.query('SELECT id FROM coach_monthly_salary WHERE coach_id = ? AND salary_month = ?', [coach.id, salary_month]);
            if (existing.length > 0) {
                continue; // 已存在，跳过
            }
            // 统计科目二通过数（该教练作为科二教练，学员在该月通过科二考试）
            const [subject2Result] = await database_1.default.query(`
        SELECT COUNT(*) as pass_count 
        FROM exam_registrations er
        JOIN exam_schedules es ON er.exam_schedule_id = es.id
        JOIN students s ON er.student_id = s.id
        WHERE s.coach_subject2_name = ?
          AND es.exam_type = '科目二'
          AND er.exam_result = '通过'
          AND es.exam_date >= ?
          AND es.exam_date < ?
      `, [coach.name, monthStart, monthEndStr]);
            const subject2PassCount = subject2Result[0]?.pass_count || 0;
            // 统计科目三通过数
            const [subject3Result] = await database_1.default.query(`
        SELECT COUNT(*) as pass_count 
        FROM exam_registrations er
        JOIN exam_schedules es ON er.exam_schedule_id = es.id
        JOIN students s ON er.student_id = s.id
        WHERE s.coach_subject3_name = ?
          AND es.exam_type = '科目三'
          AND er.exam_result = '通过'
          AND es.exam_date >= ?
          AND es.exam_date < ?
      `, [coach.name, monthStart, monthEndStr]);
            const subject3PassCount = subject3Result[0]?.pass_count || 0;
            // 统计新招学员数（该教练作为所属教练，学员在该月入学）
            const [newStudentResult] = await database_1.default.query(`
        SELECT COUNT(*) as student_count 
        FROM students
        WHERE coach_name = ?
          AND enrollment_date >= ?
          AND enrollment_date < ?
      `, [coach.name, monthStart, monthEndStr]);
            const newStudentCount = newStudentResult[0]?.student_count || 0;
            // 计算工资（默认出勤天数为0，需要手动填写）
            const attendanceDays = 0;
            const baseSalary = attendanceDays * baseDailySalary;
            const subject2Comm = subject2PassCount * subject2Commission;
            const subject3Comm = subject3PassCount * subject3Commission;
            const recruitmentComm = newStudentCount * recruitmentCommission;
            const grossSalary = baseSalary + subject2Comm + subject3Comm + recruitmentComm;
            // 插入工资记录
            await database_1.default.query(`
        INSERT INTO coach_monthly_salary 
        (coach_id, coach_name, salary_month, attendance_days, base_salary,
         subject2_pass_count, subject2_commission, subject3_pass_count, subject3_commission,
         new_student_count, recruitment_commission, gross_salary, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
      `, [
                coach.id,
                coach.name,
                salary_month,
                attendanceDays,
                baseSalary,
                subject2PassCount,
                subject2Comm,
                subject3PassCount,
                subject3Comm,
                newStudentCount,
                recruitmentComm,
                grossSalary
            ]);
            generatedCount++;
        }
        res.json({
            success: true,
            data: { generated: generatedCount },
            message: `成功生成 ${generatedCount} 条工资记录`
        });
    }
    catch (error) {
        console.error('生成工资数据失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误: ' + error.message
        });
    }
});
// 更新工资记录
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { attendance_days, bonus, deduction, deduction_reason, net_salary, status, remarks } = req.body;
        // 获取当前记录
        const [current] = await database_1.default.query('SELECT * FROM coach_monthly_salary WHERE id = ?', [id]);
        if (current.length === 0) {
            return res.status(404).json({
                success: false,
                message: '工资记录不存在'
            });
        }
        const record = current[0];
        // 计算月份范围
        const monthStart = `${record.salary_month}-01`;
        const monthEnd = new Date(record.salary_month + '-01');
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        const monthEndStr = monthEnd.toISOString().split('T')[0];
        // 重新统计科目二通过数
        const [subject2Result] = await database_1.default.query(`
      SELECT COUNT(*) as pass_count 
      FROM exam_registrations er
      JOIN exam_schedules es ON er.exam_schedule_id = es.id
      JOIN students s ON er.student_id = s.id
      WHERE s.coach_subject2_name = ?
        AND es.exam_type = '科目二'
        AND er.exam_result = '通过'
        AND es.exam_date >= ?
        AND es.exam_date < ?
    `, [record.coach_name, monthStart, monthEndStr]);
        const subject2PassCount = subject2Result[0]?.pass_count || 0;
        // 重新统计科目三通过数
        const [subject3Result] = await database_1.default.query(`
      SELECT COUNT(*) as pass_count 
      FROM exam_registrations er
      JOIN exam_schedules es ON er.exam_schedule_id = es.id
      JOIN students s ON er.student_id = s.id
      WHERE s.coach_subject3_name = ?
        AND es.exam_type = '科目三'
        AND er.exam_result = '通过'
        AND es.exam_date >= ?
        AND es.exam_date < ?
    `, [record.coach_name, monthStart, monthEndStr]);
        const subject3PassCount = subject3Result[0]?.pass_count || 0;
        // 重新统计新招学员数
        const [newStudentResult] = await database_1.default.query(`
      SELECT COUNT(*) as student_count 
      FROM students
      WHERE coach_name = ?
        AND enrollment_date >= ?
        AND enrollment_date < ?
    `, [record.coach_name, monthStart, monthEndStr]);
        const newStudentCount = newStudentResult[0]?.student_count || 0;
        // 获取当前有效的工资配置
        const targetDate = `${record.salary_month}-01`;
        const configQuery = `
      SELECT * FROM salary_config 
      WHERE effective_date <= ? 
        AND (expiry_date IS NULL OR expiry_date >= ?)
      ORDER BY effective_date DESC
    `;
        const [configRows] = await database_1.default.query(configQuery, [targetDate, targetDate]);
        const configMap = new Map();
        configRows.forEach((row) => {
            if (!configMap.has(row.config_type)) {
                configMap.set(row.config_type, row.amount);
            }
        });
        const baseDailySalary = Number(configMap.get('base_daily_salary') || 0);
        const subject2Commission = Number(configMap.get('subject2_commission') || 0);
        const subject3Commission = Number(configMap.get('subject3_commission') || 0);
        const recruitmentCommission = Number(configMap.get('recruitment_commission') || 0);
        // 重新计算
        const newAttendanceDays = attendance_days !== undefined ? Number(attendance_days) : Number(record.attendance_days);
        const newBonus = bonus !== undefined ? Number(bonus) : Number(record.bonus);
        const newDeduction = deduction !== undefined ? Number(deduction) : Number(record.deduction);
        const baseSalary = newAttendanceDays * baseDailySalary;
        const subject2Comm = Number(subject2PassCount) * subject2Commission;
        const subject3Comm = Number(subject3PassCount) * subject3Commission;
        const recruitmentComm = Number(newStudentCount) * recruitmentCommission;
        const grossSalary = baseSalary + subject2Comm + subject3Comm + recruitmentComm + newBonus - newDeduction;
        const updateQuery = `
      UPDATE coach_monthly_salary 
      SET attendance_days = ?, 
          base_salary = ?,
          subject2_pass_count = ?,
          subject2_commission = ?,
          subject3_pass_count = ?,
          subject3_commission = ?,
          new_student_count = ?,
          recruitment_commission = ?,
          bonus = ?, 
          deduction = ?, 
          deduction_reason = ?,
          gross_salary = ?,
          net_salary = ?,
          status = ?,
          remarks = ?
      WHERE id = ?
    `;
        await database_1.default.query(updateQuery, [
            newAttendanceDays,
            baseSalary,
            subject2PassCount,
            subject2Comm,
            subject3PassCount,
            subject3Comm,
            newStudentCount,
            recruitmentComm,
            newBonus,
            newDeduction,
            deduction_reason || record.deduction_reason,
            grossSalary,
            net_salary !== undefined ? net_salary : record.net_salary,
            status || record.status,
            remarks !== undefined ? remarks : record.remarks,
            id
        ]);
        res.json({
            success: true,
            message: '工资记录更新成功'
        });
    }
    catch (error) {
        console.error('更新工资记录失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误: ' + error.message
        });
    }
});
// 刷新指定月份的工资数据
router.post('/refresh', async (req, res) => {
    try {
        const { salary_month } = req.body;
        if (!salary_month || !/^\d{4}-\d{2}$/.test(salary_month)) {
            return res.status(400).json({
                success: false,
                message: '请提供有效的月份（格式：YYYY-MM）'
            });
        }
        // 获取该月份的所有工资记录
        const [salaries] = await database_1.default.query('SELECT * FROM coach_monthly_salary WHERE salary_month = ?', [salary_month]);
        if (!Array.isArray(salaries) || salaries.length === 0) {
            return res.json({
                success: true,
                data: { refreshed: 0 },
                message: '该月份没有工资记录'
            });
        }
        // 计算月份范围
        const monthStart = `${salary_month}-01`;
        const monthEnd = new Date(salary_month + '-01');
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        const monthEndStr = monthEnd.toISOString().split('T')[0];
        // 获取当前有效的工资配置
        const targetDate = monthStart;
        const configQuery = `
      SELECT * FROM salary_config 
      WHERE effective_date <= ? 
        AND (expiry_date IS NULL OR expiry_date >= ?)
      ORDER BY effective_date DESC
    `;
        const [configRows] = await database_1.default.query(configQuery, [targetDate, targetDate]);
        const configMap = new Map();
        configRows.forEach((row) => {
            if (!configMap.has(row.config_type)) {
                configMap.set(row.config_type, row.amount);
            }
        });
        const baseDailySalary = Number(configMap.get('base_daily_salary') || 0);
        const subject2Commission = Number(configMap.get('subject2_commission') || 0);
        const subject3Commission = Number(configMap.get('subject3_commission') || 0);
        const recruitmentCommission = Number(configMap.get('recruitment_commission') || 0);
        let refreshedCount = 0;
        for (const salary of salaries) {
            // 重新统计科目二通过数
            const [subject2Result] = await database_1.default.query(`
        SELECT COUNT(*) as pass_count 
        FROM exam_registrations er
        JOIN exam_schedules es ON er.exam_schedule_id = es.id
        JOIN students s ON er.student_id = s.id
        WHERE s.coach_subject2_name = ?
          AND es.exam_type = '科目二'
          AND er.exam_result = '通过'
          AND es.exam_date >= ?
          AND es.exam_date < ?
      `, [salary.coach_name, monthStart, monthEndStr]);
            const subject2PassCount = subject2Result[0]?.pass_count || 0;
            // 重新统计科目三通过数
            const [subject3Result] = await database_1.default.query(`
        SELECT COUNT(*) as pass_count 
        FROM exam_registrations er
        JOIN exam_schedules es ON er.exam_schedule_id = es.id
        JOIN students s ON er.student_id = s.id
        WHERE s.coach_subject3_name = ?
          AND es.exam_type = '科目三'
          AND er.exam_result = '通过'
          AND es.exam_date >= ?
          AND es.exam_date < ?
      `, [salary.coach_name, monthStart, monthEndStr]);
            const subject3PassCount = subject3Result[0]?.pass_count || 0;
            // 重新统计新招学员数
            const [newStudentResult] = await database_1.default.query(`
        SELECT COUNT(*) as student_count 
        FROM students
        WHERE coach_name = ?
          AND enrollment_date >= ?
          AND enrollment_date < ?
      `, [salary.coach_name, monthStart, monthEndStr]);
            const newStudentCount = newStudentResult[0]?.student_count || 0;
            // 重新计算工资
            const baseSalary = salary.attendance_days * baseDailySalary;
            const subject2Comm = subject2PassCount * subject2Commission;
            const subject3Comm = subject3PassCount * subject3Commission;
            const recruitmentComm = newStudentCount * recruitmentCommission;
            const grossSalary = baseSalary + subject2Comm + subject3Comm + recruitmentComm + salary.bonus - salary.deduction;
            // 更新工资记录
            await database_1.default.query(`
        UPDATE coach_monthly_salary 
        SET base_salary = ?,
            subject2_pass_count = ?,
            subject2_commission = ?,
            subject3_pass_count = ?,
            subject3_commission = ?,
            new_student_count = ?,
            recruitment_commission = ?,
            gross_salary = ?
        WHERE id = ?
      `, [
                baseSalary,
                subject2PassCount,
                subject2Comm,
                subject3PassCount,
                subject3Comm,
                newStudentCount,
                recruitmentComm,
                grossSalary,
                salary.id
            ]);
            refreshedCount++;
        }
        res.json({
            success: true,
            data: { refreshed: refreshedCount },
            message: `成功刷新 ${refreshedCount} 条工资记录`
        });
    }
    catch (error) {
        console.error('刷新工资数据失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误: ' + error.message
        });
    }
});
// 批量删除指定月份的工资记录
router.delete('/batch', async (req, res) => {
    try {
        const { salary_month } = req.query;
        if (!salary_month || !/^\d{4}-\d{2}$/.test(salary_month)) {
            return res.status(400).json({
                success: false,
                message: '请提供有效的月份（格式：YYYY-MM）'
            });
        }
        // 检查是否有已发放的工资记录
        const [paidRecords] = await database_1.default.query("SELECT COUNT(*) as count FROM coach_monthly_salary WHERE salary_month = ? AND status = 'paid'", [salary_month]);
        if (paidRecords[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: `该月份有 ${paidRecords[0].count} 条已发放的工资记录，不能删除`
            });
        }
        // 删除该月份的所有工资记录
        const [result] = await database_1.default.query('DELETE FROM coach_monthly_salary WHERE salary_month = ?', [salary_month]);
        res.json({
            success: true,
            data: { deleted: result.affectedRows },
            message: `成功删除 ${result.affectedRows} 条工资记录`
        });
    }
    catch (error) {
        console.error('批量删除工资记录失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误: ' + error.message
        });
    }
});
// 删除工资记录
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // 检查状态，已发放的不能删除
        const [record] = await database_1.default.query('SELECT status FROM coach_monthly_salary WHERE id = ?', [id]);
        if (record.length === 0) {
            return res.status(404).json({
                success: false,
                message: '工资记录不存在'
            });
        }
        if (record[0].status === 'paid') {
            return res.status(400).json({
                success: false,
                message: '已发放的工资不能删除'
            });
        }
        await database_1.default.query('DELETE FROM coach_monthly_salary WHERE id = ?', [id]);
        res.json({
            success: true,
            message: '工资记录删除成功'
        });
    }
    catch (error) {
        console.error('删除工资记录失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误: ' + error.message
        });
    }
});
exports.default = router;
