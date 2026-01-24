"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const router = (0, express_1.Router)();
// 获取学员的缴费记录列表
router.get('/student/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        const [rows] = await database_1.default.query('SELECT * FROM payment_records WHERE student_id = ? ORDER BY payment_date DESC, created_at DESC', [studentId]);
        res.json({
            success: true,
            data: rows
        });
    }
    catch (error) {
        console.error('获取缴费记录失败:', error);
        res.status(500).json({
            success: false,
            message: '获取缴费记录失败: ' + error.message
        });
    }
});
// 创建缴费记录
router.post('/', async (req, res) => {
    const connection = await database_1.default.getConnection();
    try {
        await connection.beginTransaction();
        const { student_id, amount, payment_date, payment_method, operator, notes } = req.body;
        // 验证必填字段
        if (!student_id || !amount || !payment_date || !payment_method || !operator) {
            return res.status(400).json({
                success: false,
                message: '学员、金额、缴费日期、缴费方式和经办人为必填项'
            });
        }
        // 验证金额格式
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            return res.status(400).json({
                success: false,
                message: '缴费金额必须为正数'
            });
        }
        // 检查学员是否存在
        const [studentRows] = await connection.query('SELECT id, contract_amount, actual_amount, discount_amount, debt_amount FROM students WHERE id = ?', [student_id]);
        if (studentRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: '学员不存在'
            });
        }
        const student = studentRows[0];
        // 插入缴费记录
        const [result] = await connection.query('INSERT INTO payment_records (student_id, amount, payment_date, payment_method, operator, notes) VALUES (?, ?, ?, ?, ?, ?)', [student_id, amountNum, payment_date, payment_method, operator, notes]);
        // 更新学员的实收金额和欠费金额
        const newActualAmount = parseFloat(student.actual_amount) + amountNum;
        const contractAmount = parseFloat(student.contract_amount);
        const discountAmount = parseFloat(student.discount_amount || 0);
        const newDebtAmount = contractAmount - newActualAmount - discountAmount;
        // 自动更新缴费状态（考虑减免金额）
        let paymentStatus = '未缴费';
        let enrollmentStatus = '报名未缴费';
        if (newActualAmount + discountAmount >= contractAmount) {
            paymentStatus = '已缴费';
            enrollmentStatus = '报名已缴费';
        }
        else if (newActualAmount + discountAmount > 0) {
            paymentStatus = '部分缴费';
            enrollmentStatus = '报名部分缴费';
        }
        // 同步更新缴费状态(payment_status)和报名状态(enrollment_status)
        await connection.query('UPDATE students SET actual_amount = ?, debt_amount = ?, payment_status = ?, enrollment_status = ? WHERE id = ?', [newActualAmount, newDebtAmount, paymentStatus, enrollmentStatus, student_id]);
        await connection.commit();
        res.json({
            success: true,
            data: {
                id: result.insertId,
                new_actual_amount: newActualAmount,
                new_debt_amount: newDebtAmount,
                payment_status: paymentStatus
            },
            message: '缴费记录创建成功'
        });
    }
    catch (error) {
        await connection.rollback();
        console.error('创建缴费记录失败:', error);
        res.status(500).json({
            success: false,
            message: '创建缴费记录失败: ' + error.message
        });
    }
    finally {
        connection.release();
    }
});
// 退费接口
router.post('/refund', async (req, res) => {
    const connection = await database_1.default.getConnection();
    try {
        await connection.beginTransaction();
        const { student_id, amount, operator, notes } = req.body;
        // 验证必填字段
        if (!student_id || !amount || !operator) {
            return res.status(400).json({
                success: false,
                message: '学员ID、退费金额和经办人为必填项'
            });
        }
        // 验证金额格式
        const refundAmount = parseFloat(amount);
        if (isNaN(refundAmount) || refundAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: '退费金额必须为正数'
            });
        }
        // 检查学员是否存在并获取当前金额信息
        const [studentRows] = await connection.query('SELECT id, contract_amount, actual_amount, discount_amount, debt_amount, payment_status FROM students WHERE id = ?', [student_id]);
        if (studentRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: '学员不存在'
            });
        }
        const student = studentRows[0];
        const currentActualAmount = parseFloat(student.actual_amount);
        const discountAmount = parseFloat(student.discount_amount || 0);
        // 验证退费金额不能超过实收金额
        if (refundAmount > currentActualAmount) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: `退费金额不能超过实收金额 ¥${currentActualAmount.toFixed(2)}`
            });
        }
        // 计算退费后的金额: 欠费 = 合同金额 - 实收金额 - 减免金额
        const newActualAmount = currentActualAmount - refundAmount;
        const contractAmount = parseFloat(student.contract_amount);
        const newDebtAmount = contractAmount - newActualAmount - discountAmount;
        // 退费后缴费状态设置为"已退费"
        const paymentStatus = '已退费';
        // 更新学员的实收金额、欠费金额、缴费状态和报名状态
        await connection.query('UPDATE students SET actual_amount = ?, debt_amount = ?, payment_status = ?, enrollment_status = ? WHERE id = ?', [newActualAmount, newDebtAmount, paymentStatus, '已退费', student_id]);
        // 记录退费信息（作为负数缴费记录）
        await connection.query('INSERT INTO payment_records (student_id, amount, payment_date, payment_method, operator, notes) VALUES (?, ?, CURDATE(), ?, ?, ?)', [student_id, -refundAmount, '其他', operator, `退费：${notes || '学员退费'}`]);
        await connection.commit();
        res.json({
            success: true,
            data: {
                new_actual_amount: newActualAmount,
                new_debt_amount: newDebtAmount,
                payment_status: paymentStatus,
                refund_amount: refundAmount
            },
            message: '退费成功'
        });
    }
    catch (error) {
        await connection.rollback();
        console.error('退费失败:', error);
        res.status(500).json({
            success: false,
            message: '退费失败: ' + error.message
        });
    }
    finally {
        connection.release();
    }
});
// 减免接口
router.post('/discount', async (req, res) => {
    const connection = await database_1.default.getConnection();
    try {
        await connection.beginTransaction();
        const { student_id, amount, operator, notes } = req.body;
        // 验证必填字段
        if (!student_id || !amount || !operator) {
            return res.status(400).json({
                success: false,
                message: '学员ID、减免金额和经办人为必填项'
            });
        }
        // 验证金额格式
        const discountAmount = parseFloat(amount);
        if (isNaN(discountAmount) || discountAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: '减免金额必须为正数'
            });
        }
        // 检查学员是否存在并获取当前金额信息
        const [studentRows] = await connection.query('SELECT id, contract_amount, actual_amount, discount_amount, debt_amount, payment_status FROM students WHERE id = ?', [student_id]);
        if (studentRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: '学员不存在'
            });
        }
        const student = studentRows[0];
        const currentActualAmount = parseFloat(student.actual_amount);
        const currentDiscountAmount = parseFloat(student.discount_amount || 0);
        const contractAmount = parseFloat(student.contract_amount);
        // 累加减免金额
        const newDiscountAmount = currentDiscountAmount + discountAmount;
        // 验证减免金额不能超过合同金额
        if (newDiscountAmount > contractAmount) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: `累计减免金额不能超过合同金额 ¥${contractAmount.toFixed(2)}`
            });
        }
        // 计算新的欠费金额: 欠费 = 合同金额 - 实收金额 - 减免金额
        const newDebtAmount = contractAmount - currentActualAmount - newDiscountAmount;
        // 重新计算缴费状态和报名状态
        let paymentStatus = '未缴费';
        let enrollmentStatus = '报名未缴费';
        if (currentActualAmount + newDiscountAmount >= contractAmount) {
            paymentStatus = '已缴费';
            enrollmentStatus = '报名已缴费';
        }
        else if (currentActualAmount + newDiscountAmount > 0) {
            paymentStatus = '部分缴费';
            enrollmentStatus = '报名部分缴费';
        }
        // 同步更新缴费状态、报名状态和减免金额
        await connection.query('UPDATE students SET discount_amount = ?, debt_amount = ?, payment_status = ?, enrollment_status = ? WHERE id = ?', [newDiscountAmount, newDebtAmount, paymentStatus, enrollmentStatus, student_id]);
        // 记录减免信息（作为负数缴费记录）
        await connection.query('INSERT INTO payment_records (student_id, amount, payment_date, payment_method, operator, notes) VALUES (?, ?, CURDATE(), ?, ?, ?)', [student_id, -discountAmount, '其他', operator, `减免：${notes || '费用减免'}`]);
        await connection.commit();
        res.json({
            success: true,
            data: {
                new_discount_amount: newDiscountAmount,
                new_debt_amount: newDebtAmount,
                payment_status: paymentStatus,
                discount_amount: discountAmount
            },
            message: '减免成功'
        });
    }
    catch (error) {
        await connection.rollback();
        console.error('减免失败:', error);
        res.status(500).json({
            success: false,
            message: '减免失败: ' + error.message
        });
    }
    finally {
        connection.release();
    }
});
// 删除缴费记录（需要回退金额）
router.delete('/:id', async (req, res) => {
    const connection = await database_1.default.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        // 获取缴费记录
        const [recordRows] = await connection.query('SELECT * FROM payment_records WHERE id = ?', [id]);
        if (recordRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: '缴费记录不存在'
            });
        }
        const record = recordRows[0];
        // 获取学员信息
        const [studentRows] = await connection.query('SELECT id, contract_amount, actual_amount, discount_amount FROM students WHERE id = ?', [record.student_id]);
        if (studentRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: '学员不存在'
            });
        }
        const student = studentRows[0];
        const discountAmount = parseFloat(student.discount_amount || 0);
        // 检查是否是减免记录（金额为负数）
        const isDiscountRecord = parseFloat(record.amount) < 0;
        // 删除缴费记录
        await connection.query('DELETE FROM payment_records WHERE id = ?', [id]);
        let newDiscountAmount = discountAmount;
        let newActualAmount;
        if (isDiscountRecord) {
            // 如果是减免记录，回退减免金额
            newDiscountAmount = discountAmount + parseFloat(record.amount); // record.amount是负数，相加就是减少
            newActualAmount = parseFloat(student.actual_amount);
        }
        else {
            // 如果是普通缴费记录，回退实收金额
            newActualAmount = parseFloat(student.actual_amount) - parseFloat(record.amount);
        }
        // 回退金额: 欠费 = 合同金额 - 实收金额 - 减免金额
        const contractAmount = parseFloat(student.contract_amount);
        const newDebtAmount = contractAmount - newActualAmount - newDiscountAmount;
        // 重新计算缴费状态和报名状态
        let paymentStatus = '未缴费';
        let enrollmentStatus = '报名未缴费';
        if (newActualAmount + newDiscountAmount >= contractAmount) {
            paymentStatus = '已缴费';
            enrollmentStatus = '报名已缴费';
        }
        else if (newActualAmount + newDiscountAmount > 0) {
            paymentStatus = '部分缴费';
            enrollmentStatus = '报名部分缴费';
        }
        // 同步更新缴费状态、报名状态和减免金额
        await connection.query('UPDATE students SET actual_amount = ?, discount_amount = ?, debt_amount = ?, payment_status = ?, enrollment_status = ? WHERE id = ?', [newActualAmount, newDiscountAmount, newDebtAmount, paymentStatus, enrollmentStatus, record.student_id]);
        await connection.commit();
        res.json({
            success: true,
            message: '缴费记录删除成功'
        });
    }
    catch (error) {
        await connection.rollback();
        console.error('删除缴费记录失败:', error);
        res.status(500).json({
            success: false,
            message: '删除缴费记录失败: ' + error.message
        });
    }
    finally {
        connection.release();
    }
});
// 获取欠费学员列表（用于欠费提醒）
router.get('/debts', async (req, res) => {
    try {
        const { limit = '10', offset = '0', keyword = '' } = req.query;
        let sql = `
      SELECT 
        s.id, s.name, s.phone, s.id_card, 
        s.contract_amount, s.actual_amount, s.debt_amount, s.payment_status,
        ct.name as class_type_name,
        s.enrollment_date
      FROM students s
      LEFT JOIN class_types ct ON s.class_type_id = ct.id
      WHERE s.debt_amount > 0 AND s.payment_status != '已退费'
    `;
        const params = [];
        // 关键字搜索
        if (keyword) {
            sql += ' AND (s.name LIKE ? OR s.phone LIKE ? OR s.id_card LIKE ?)';
            params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
        }
        // 获取总数
        const countSql = sql.replace(/SELECT[\s\S]+FROM/, 'SELECT COUNT(*) as total FROM');
        const [countResult] = await database_1.default.query(countSql, params);
        const total = countResult[0].total;
        // 添加排序和分页
        sql += ' ORDER BY s.debt_amount DESC, s.enrollment_date ASC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        const [rows] = await database_1.default.query(sql, params);
        res.json({
            success: true,
            data: {
                list: rows,
                total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    }
    catch (error) {
        console.error('获取欠费学员列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取欠费学员列表失败: ' + error.message
        });
    }
});
// 获取缴费统计信息
router.get('/statistics/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        // 获取学员缴费信息
        const [studentRows] = await database_1.default.query(`SELECT 
        s.id, s.name, s.contract_amount, s.actual_amount, s.debt_amount, s.payment_status,
        ct.name as class_type_name
       FROM students s
       LEFT JOIN class_types ct ON s.class_type_id = ct.id
       WHERE s.id = ?`, [studentId]);
        if (studentRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '学员不存在'
            });
        }
        const student = studentRows[0];
        // 获取缴费次数
        const [countRows] = await database_1.default.query('SELECT COUNT(*) as payment_count FROM payment_records WHERE student_id = ?', [studentId]);
        // 获取最后一次缴费信息
        const [lastPaymentRows] = await database_1.default.query('SELECT payment_date, amount FROM payment_records WHERE student_id = ? ORDER BY payment_date DESC, created_at DESC LIMIT 1', [studentId]);
        res.json({
            success: true,
            data: {
                student_info: student,
                payment_count: countRows[0].payment_count,
                last_payment: lastPaymentRows.length > 0 ? lastPaymentRows[0] : null
            }
        });
    }
    catch (error) {
        console.error('获取缴费统计信息失败:', error);
        res.status(500).json({
            success: false,
            message: '获取缴费统计信息失败: ' + error.message
        });
    }
});
exports.default = router;
