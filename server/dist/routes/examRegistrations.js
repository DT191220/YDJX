"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const router = (0, express_1.Router)();
// 获取考试报名列表
router.get('/', async (req, res) => {
    try {
        const { student_id = '', exam_schedule_id = '', exam_result = '' } = req.query;
        let whereClause = 'WHERE 1=1';
        const params = [];
        if (student_id) {
            whereClause += ' AND er.student_id = ?';
            params.push(student_id);
        }
        if (exam_schedule_id) {
            whereClause += ' AND er.exam_schedule_id = ?';
            params.push(exam_schedule_id);
        }
        if (exam_result) {
            whereClause += ' AND er.exam_result = ?';
            params.push(exam_result);
        }
        const [registrations] = await database_1.default.query(`SELECT 
         er.*,
         s.name as student_name,
         s.phone as student_phone,
         es.exam_date,
         es.exam_type,
         ev.name as venue_name
       FROM exam_registrations er
       INNER JOIN students s ON er.student_id = s.id
       INNER JOIN exam_schedules es ON er.exam_schedule_id = es.id
       LEFT JOIN exam_venues ev ON es.venue_id = ev.id
       ${whereClause}
       ORDER BY es.exam_date DESC, er.registration_date DESC`, params);
        res.json({
            success: true,
            message: '获取考试报名列表成功',
            data: registrations
        });
    }
    catch (error) {
        console.error('获取考试报名列表失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误: ' + error.message
        });
    }
});
// 获取单个考试报名详情
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [registrations] = await database_1.default.query(`SELECT 
         er.*,
         s.name as student_name,
         s.phone as student_phone,
         es.exam_date,
         es.exam_type,
         ev.name as venue_name
       FROM exam_registrations er
       INNER JOIN students s ON er.student_id = s.id
       INNER JOIN exam_schedules es ON er.exam_schedule_id = es.id
       LEFT JOIN exam_venues ev ON es.venue_id = ev.id
       WHERE er.id = ?`, [id]);
        if (registrations.length === 0) {
            return res.status(404).json({
                success: false,
                message: '考试报名记录不存在'
            });
        }
        res.json({
            success: true,
            message: '获取考试报名详情成功',
            data: registrations[0]
        });
    }
    catch (error) {
        console.error('获取考试报名详情失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误: ' + error.message
        });
    }
});
// 创建考试报名
router.post('/', async (req, res) => {
    const connection = await database_1.default.getConnection();
    try {
        const { student_id, exam_schedule_id, notes } = req.body;
        if (!student_id || !exam_schedule_id) {
            return res.status(400).json({
                success: false,
                message: '学员ID和考试安排ID为必填项'
            });
        }
        await connection.beginTransaction();
        // 检查学员是否存在
        const [students] = await connection.query('SELECT id, enrollment_status FROM students WHERE id = ?', [student_id]);
        if (students.length === 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: '学员不存在'
            });
        }
        // 检查学员是否已废考
        if (students[0].enrollment_status === '废考') {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: '该学员已废考,无法报名考试'
            });
        }
        // 检查考试安排是否存在
        const [schedules] = await connection.query('SELECT id, exam_type, capacity, arranged_count FROM exam_schedules WHERE id = ?', [exam_schedule_id]);
        if (schedules.length === 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: '考试安排不存在'
            });
        }
        const schedule = schedules[0];
        // 检查是否已达到容量上限
        if (schedule.arranged_count >= schedule.capacity) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: '该考试安排已满,无法报名'
            });
        }
        // 检查学员对该科目的资格
        const [progress] = await connection.query('SELECT exam_qualification FROM student_exam_progress WHERE student_id = ?', [student_id]);
        if (progress.length > 0 && progress[0].exam_qualification === '已作废') {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: '该学员驾考资格已作废,无法报名考试'
            });
        }
        // 检查是否已报名该考试
        const [existing] = await connection.query('SELECT id FROM exam_registrations WHERE student_id = ? AND exam_schedule_id = ?', [student_id, exam_schedule_id]);
        if (existing.length > 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: '该学员已报名此考试'
            });
        }
        // 创建报名记录
        const [result] = await connection.query(`INSERT INTO exam_registrations (student_id, exam_schedule_id, notes)
       VALUES (?, ?, ?)`, [student_id, exam_schedule_id, notes]);
        // 更新考试安排的已安排人数
        await connection.query('UPDATE exam_schedules SET arranged_count = arranged_count + 1 WHERE id = ?', [exam_schedule_id]);
        await connection.commit();
        res.json({
            success: true,
            message: '考试报名成功',
            data: { id: result.insertId }
        });
    }
    catch (error) {
        await connection.rollback();
        console.error('创建考试报名失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误: ' + error.message
        });
    }
    finally {
        connection.release();
    }
});
// 更新考试结果
router.put('/:id/result', async (req, res) => {
    const connection = await database_1.default.getConnection();
    try {
        const { id } = req.params;
        const { exam_result, exam_score, notes } = req.body;
        if (!exam_result || !['通过', '未通过'].includes(exam_result)) {
            return res.status(400).json({
                success: false,
                message: '考试结果必须为"通过"或"未通过"'
            });
        }
        await connection.beginTransaction();
        // 获取报名记录
        const [registrations] = await connection.query(`SELECT er.*, es.exam_type 
       FROM exam_registrations er
       INNER JOIN exam_schedules es ON er.exam_schedule_id = es.id
       WHERE er.id = ?`, [id]);
        if (registrations.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: '考试报名记录不存在'
            });
        }
        const registration = registrations[0];
        const { student_id, exam_type } = registration;
        // 更新考试结果
        await connection.query('UPDATE exam_registrations SET exam_result = ?, exam_score = ?, notes = ? WHERE id = ?', [exam_result, exam_score, notes, id]);
        // 确保学员有进度记录
        const [progressCheck] = await connection.query('SELECT id FROM student_exam_progress WHERE student_id = ?', [student_id]);
        if (progressCheck.length === 0) {
            await connection.query('INSERT INTO student_exam_progress (student_id) VALUES (?)', [student_id]);
        }
        // 获取科目字段前缀
        const subjectMap = {
            '科目一': 'subject1',
            '科目二': 'subject2',
            '科目三': 'subject3',
            '科目四': 'subject4'
        };
        const subjectPrefix = subjectMap[exam_type];
        if (!subjectPrefix) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: '无效的考试类型'
            });
        }
        // 更新统计字段
        if (exam_result === '通过') {
            // 通过: total_count+1, failed_count清零, status='已通过', pass_date=今天
            await connection.query(`UPDATE student_exam_progress 
         SET ${subjectPrefix}_total_count = ${subjectPrefix}_total_count + 1,
             ${subjectPrefix}_failed_count = 0,
             ${subjectPrefix}_status = '已通过',
             ${subjectPrefix}_pass_date = CURDATE()
         WHERE student_id = ?`, [student_id]);
        }
        else {
            // 未通过: total_count+1, failed_count+1, status='未通过'
            await connection.query(`UPDATE student_exam_progress 
         SET ${subjectPrefix}_total_count = ${subjectPrefix}_total_count + 1,
             ${subjectPrefix}_failed_count = ${subjectPrefix}_failed_count + 1,
             ${subjectPrefix}_status = '未通过'
         WHERE student_id = ?`, [student_id]);
            // 获取最新的failed_count
            const [updated] = await connection.query(`SELECT ${subjectPrefix}_failed_count as failed_count FROM student_exam_progress WHERE student_id = ?`, [student_id]);
            const failedCount = updated[0].failed_count;
            // 根据连续未通过次数触发预警
            if (failedCount === 3) {
                // 3次预警
                await connection.query(`INSERT INTO exam_warning_logs (student_id, warning_type, warning_subject, warning_content)
           VALUES (?, '3次预警', ?, ?)`, [student_id, exam_type, `学员${exam_type}已连续3次未通过，请注意考试安排`]);
            }
            else if (failedCount === 4) {
                // 4次预警
                await connection.query(`INSERT INTO exam_warning_logs (student_id, warning_type, warning_subject, warning_content)
           VALUES (?, '4次预警', ?, ?)`, [student_id, exam_type, `⚠️ 学员${exam_type}已连续4次未通过，请慎重约考第5次考试`]);
            }
            else if (failedCount >= 5) {
                // 资格作废
                await connection.query(`UPDATE student_exam_progress 
           SET exam_qualification = '已作废',
               disqualified_date = CURDATE(),
               disqualified_reason = ?
           WHERE student_id = ?`, [`${exam_type}连续5次未通过`, student_id]);
                // 更新学员主表状态为"废考"
                await connection.query(`UPDATE students SET enrollment_status = '废考' WHERE id = ?`, [student_id]);
                // 记录资格作废预警
                await connection.query(`INSERT INTO exam_warning_logs (student_id, warning_type, warning_subject, warning_content)
           VALUES (?, '资格作废', ?, ?)`, [student_id, exam_type, `❌ 学员${exam_type}连续5次未通过，驾考资格已作废`]);
            }
        }
        // 重新计算总进度
        const [finalProgress] = await connection.query(`SELECT 
         subject1_status, subject2_status, subject3_status, subject4_status
       FROM student_exam_progress WHERE student_id = ?`, [student_id]);
        let totalProgress = 0;
        if (finalProgress[0].subject1_status === '已通过')
            totalProgress += 25;
        if (finalProgress[0].subject2_status === '已通过')
            totalProgress += 25;
        if (finalProgress[0].subject3_status === '已通过')
            totalProgress += 25;
        if (finalProgress[0].subject4_status === '已通过')
            totalProgress += 25;
        await connection.query('UPDATE student_exam_progress SET total_progress = ? WHERE student_id = ?', [totalProgress, student_id]);
        await connection.commit();
        res.json({
            success: true,
            message: '更新考试结果成功'
        });
    }
    catch (error) {
        await connection.rollback();
        console.error('更新考试结果失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误: ' + error.message
        });
    }
    finally {
        connection.release();
    }
});
// 删除考试报名
router.delete('/:id', async (req, res) => {
    const connection = await database_1.default.getConnection();
    try {
        const { id } = req.params;
        await connection.beginTransaction();
        // 获取报名记录
        const [registrations] = await connection.query('SELECT exam_schedule_id FROM exam_registrations WHERE id = ?', [id]);
        if (registrations.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: '考试报名记录不存在'
            });
        }
        const { exam_schedule_id } = registrations[0];
        // 删除报名记录
        await connection.query('DELETE FROM exam_registrations WHERE id = ?', [id]);
        // 更新考试安排的已安排人数
        await connection.query('UPDATE exam_schedules SET arranged_count = arranged_count - 1 WHERE id = ?', [exam_schedule_id]);
        await connection.commit();
        res.json({
            success: true,
            message: '删除考试报名成功'
        });
    }
    catch (error) {
        await connection.rollback();
        console.error('删除考试报名失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误: ' + error.message
        });
    }
    finally {
        connection.release();
    }
});
exports.default = router;
