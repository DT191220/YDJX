"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const finance_1 = require("./finance");
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
        const [studentRows] = await connection.query('SELECT id, name, class_type_id, contract_amount, actual_amount, discount_amount, debt_amount, account_balance FROM students WHERE id = ?', [student_id]);
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
        // 更新学员的实收金额、账户余额和欠费金额
        const newActualAmount = parseFloat(student.actual_amount) + amountNum;
        const contractAmount = parseFloat(student.contract_amount);
        const discountAmount = parseFloat(student.discount_amount || 0);
        const currentBalance = parseFloat(student.account_balance || 0);
        // 计算新的欠费金额和账户余额
        // 欠费 = 合同金额 - 实收金额 - 减免金额
        let newDebtAmount = contractAmount - newActualAmount - discountAmount;
        let newAccountBalance = currentBalance;
        // 如果欠费为负数，说明有超额支付，转入账户余额
        if (newDebtAmount < 0) {
            newAccountBalance = currentBalance + Math.abs(newDebtAmount);
            newDebtAmount = 0;
        }
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
        await connection.query('UPDATE students SET actual_amount = ?, debt_amount = ?, account_balance = ?, payment_status = ?, enrollment_status = ? WHERE id = ?', [newActualAmount, newDebtAmount, newAccountBalance, paymentStatus, enrollmentStatus, student_id]);
        // === 自动创建财务凭证（仅记录学员缴费收入） ===
        try {
            // 获取科目映射
            const subjectMapping = await (0, finance_1.getSubjectCodes)(['BANK_DEPOSIT', 'TUITION_INCOME'], connection);
            // 简化凭证号生成：直接查询最大凭证号
            const paymentDateObj = new Date(payment_date);
            const year = paymentDateObj.getFullYear();
            const month = String(paymentDateObj.getMonth() + 1).padStart(2, '0');
            const yearMonth = `${year}${month}`;
            const [maxRows] = await connection.query(`SELECT voucher_no FROM finance_vouchers WHERE voucher_no LIKE ? ORDER BY id DESC LIMIT 1`, [`${yearMonth}-%`]);
            let seq = 1;
            if (maxRows.length > 0 && maxRows[0].voucher_no) {
                const lastSeq = parseInt(maxRows[0].voucher_no.split('-')[1], 10);
                seq = lastSeq + 1;
            }
            const voucherNo = `${yearMonth}-${String(seq).padStart(3, '0')}`;
            const [voucherResult] = await connection.query(`INSERT INTO finance_vouchers (voucher_no, voucher_date, description, creator_id, creator_name, source_type, source_id) 
         VALUES (?, ?, ?, 0, ?, 'student_payment', ?)`, [voucherNo, payment_date, `${student.name}缴费`, operator, result.insertId]);
            const voucherId = voucherResult.insertId;
            // 借：银行存款 - 收到的全部金额
            await connection.query(`INSERT INTO finance_voucher_items (voucher_id, entry_type, subject_code, amount, summary, seq) 
         VALUES (?, '借', ?, ?, '收到学员学费', 0)`, [voucherId, subjectMapping['BANK_DEPOSIT'], amountNum]);
            // 贷：学员学费 - 确认收入
            await connection.query(`INSERT INTO finance_voucher_items (voucher_id, entry_type, subject_code, amount, summary, seq) 
         VALUES (?, '贷', ?, ?, '学员缴费收入', 1)`, [voucherId, subjectMapping['TUITION_INCOME'], amountNum]);
            // 注：上缴相关凭证在"上缴确认"操作时单独生成
            console.log('学员缴费凭证创建成功:', voucherNo);
        }
        catch (financeError) {
            // 财务凭证创建失败不影响缴费主流程，仅记录日志
            console.error('自动创建财务凭证失败:', financeError.message, financeError.code);
        }
        await connection.commit();
        res.json({
            success: true,
            data: {
                id: result.insertId,
                new_actual_amount: newActualAmount,
                new_debt_amount: newDebtAmount,
                new_account_balance: newAccountBalance,
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
        const [studentRows] = await connection.query('SELECT id, contract_amount, actual_amount, discount_amount, debt_amount, account_balance, payment_status FROM students WHERE id = ?', [student_id]);
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
        const currentBalance = parseFloat(student.account_balance || 0);
        // 验证退费金额不能超过实收金额
        if (refundAmount > currentActualAmount) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: `退费金额不能超过实收金额 ¥${currentActualAmount.toFixed(2)}`
            });
        }
        // 计算退费后的金额
        const newActualAmount = currentActualAmount - refundAmount;
        const contractAmount = parseFloat(student.contract_amount);
        // 退费时需要从账户余额中先扣除
        let newAccountBalance = currentBalance;
        let amountToRefundFromBalance = Math.min(refundAmount, currentBalance);
        newAccountBalance = Math.max(0, currentBalance - refundAmount);
        // 计算新的欠费: 欠费 = 合同金额 - 实收金额 - 减免金额
        let newDebtAmount = contractAmount - newActualAmount - discountAmount;
        // 如果有从余额退款，需要增加对应的欠费
        if (amountToRefundFromBalance > 0) {
            newDebtAmount = Math.max(0, newDebtAmount);
        }
        // 退费后缴费状态设置为"已退费"
        const paymentStatus = '已退费';
        // 更新学员的实收金额、欠费金额、账户余额、缴费状态和报名状态
        await connection.query('UPDATE students SET actual_amount = ?, debt_amount = ?, account_balance = ?, payment_status = ?, enrollment_status = ? WHERE id = ?', [newActualAmount, newDebtAmount, newAccountBalance, paymentStatus, '已退费', student_id]);
        // 记录退费信息（作为负数缴费记录）
        await connection.query('INSERT INTO payment_records (student_id, amount, payment_date, payment_method, operator, notes) VALUES (?, ?, CURDATE(), ?, ?, ?)', [student_id, -refundAmount, '其他', operator, `退费：${notes || '学员退费'}`]);
        await connection.commit();
        res.json({
            success: true,
            data: {
                new_actual_amount: newActualAmount,
                new_debt_amount: newDebtAmount,
                new_account_balance: newAccountBalance,
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
        const [studentRows] = await connection.query('SELECT id, name, contract_amount, actual_amount, discount_amount, debt_amount, account_balance, payment_status FROM students WHERE id = ?', [student_id]);
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
        const currentBalance = parseFloat(student.account_balance || 0);
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
        let newDebtAmount = contractAmount - currentActualAmount - newDiscountAmount;
        let newAccountBalance = currentBalance;
        // 如果欠费为负数，说明有超额支付，转入账户余额
        if (newDebtAmount < 0) {
            newAccountBalance = currentBalance + Math.abs(newDebtAmount);
            newDebtAmount = 0;
        }
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
        // 同步更新缴费状态、报名状态、减免金额和账户余额
        await connection.query('UPDATE students SET discount_amount = ?, debt_amount = ?, account_balance = ?, payment_status = ?, enrollment_status = ? WHERE id = ?', [newDiscountAmount, newDebtAmount, newAccountBalance, paymentStatus, enrollmentStatus, student_id]);
        // 记录减免信息（作为负数缴费记录）
        await connection.query('INSERT INTO payment_records (student_id, amount, payment_date, payment_method, operator, notes) VALUES (?, ?, CURDATE(), ?, ?, ?)', [student_id, -discountAmount, '其他', operator, `减免：${notes || '费用减免'}`]);
        // === 生成减免凭证 ===
        try {
            // 获取科目映射
            const subjectMapping = await (0, finance_1.getSubjectCodes)(['TUITION_INCOME', 'OTHER_INCOME'], connection);
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const yearMonth = `${year}${month}`;
            const [maxRows] = await connection.query(`SELECT voucher_no FROM finance_vouchers WHERE voucher_no LIKE ? ORDER BY id DESC LIMIT 1`, [`${yearMonth}-%`]);
            let seq = 1;
            if (maxRows.length > 0 && maxRows[0].voucher_no) {
                const lastSeq = parseInt(maxRows[0].voucher_no.split('-')[1], 10);
                seq = lastSeq + 1;
            }
            const voucherNo = `${yearMonth}-${String(seq).padStart(3, '0')}`;
            const [voucherResult] = await connection.query(`INSERT INTO finance_vouchers (voucher_no, voucher_date, description, creator_id, creator_name, source_type, source_id) 
         VALUES (?, ?, ?, 0, ?, 'student_discount', ?)`, [voucherNo, today.toISOString().split('T')[0], `${student.name}费用减免`, operator, student_id]);
            const voucherId = voucherResult.insertId;
            // 借：学员学费 - 冲减收入（减免相当于减少应收）
            await connection.query(`INSERT INTO finance_voucher_items (voucher_id, entry_type, subject_code, amount, summary, seq) 
         VALUES (?, '借', ?, ?, '学员费用减免', 0)`, [voucherId, subjectMapping['TUITION_INCOME'], discountAmount]);
            // 贷：其他收入 - 减免优惠
            await connection.query(`INSERT INTO finance_voucher_items (voucher_id, entry_type, subject_code, amount, summary, seq) 
         VALUES (?, '贷', ?, ?, '减免优惠', 1)`, [voucherId, subjectMapping['OTHER_INCOME'], discountAmount]);
            console.log('减免凭证创建成功:', voucherNo);
        }
        catch (financeError) {
            console.error('创建减免凭证失败:', financeError.message, financeError.code);
        }
        await connection.commit();
        res.json({
            success: true,
            data: {
                new_discount_amount: newDiscountAmount,
                new_debt_amount: newDebtAmount,
                new_account_balance: newAccountBalance,
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
        const [studentRows] = await connection.query('SELECT id, name, contract_amount, actual_amount, discount_amount, account_balance FROM students WHERE id = ?', [record.student_id]);
        if (studentRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: '学员不存在'
            });
        }
        const student = studentRows[0];
        const discountAmount = parseFloat(student.discount_amount || 0);
        const currentBalance = parseFloat(student.account_balance || 0);
        const currentActualAmount = parseFloat(student.actual_amount);
        // 检查记录类型
        const recordAmount = parseFloat(record.amount);
        const isDiscountRecord = recordAmount < 0 && record.notes && record.notes.includes('减免');
        const isRefundRecord = recordAmount < 0 && record.notes && record.notes.includes('退费');
        // 删除缴费记录
        await connection.query('DELETE FROM payment_records WHERE id = ?', [id]);
        let newDiscountAmount = discountAmount;
        let newActualAmount = currentActualAmount;
        let newAccountBalance = currentBalance;
        if (isDiscountRecord) {
            // 如果是减免记录，回退减免金额
            newDiscountAmount = discountAmount + recordAmount; // recordAmount是负数，相加就是减少
        }
        else if (isRefundRecord) {
            // 如果是退费记录，需要恢复退费的金额
            // 退费时从实收金额中扣除了，删除退费记录应该加回实收金额
            newActualAmount = currentActualAmount - recordAmount; // recordAmount是负数，减去就是加上
            // 同时需要恢复退费时从账户余额中扣除的部分（如果有）
            // 由于退费逻辑可能从余额中扣除，这里不需要特殊处理余额，会在后续重新计算
        }
        else {
            // 如果是普通缴费记录，回退实收金额
            newActualAmount = currentActualAmount - recordAmount;
        }
        // 回退金额后重新计算: 欠费 = 合同金额 - 实收金额 - 减免金额
        const contractAmount = parseFloat(student.contract_amount);
        let newDebtAmount = contractAmount - newActualAmount - newDiscountAmount;
        // 重新计算账户余额：如果实收+减免超过合同，超出部分进入余额
        if (newDebtAmount < 0) {
            newAccountBalance = Math.abs(newDebtAmount);
            newDebtAmount = 0;
        }
        else {
            // 如果有欠费，余额应该为0（除非之前有其他来源的余额）
            newAccountBalance = 0;
        }
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
        // 同步更新缴费状态、报名状态、减免金额和账户余额
        await connection.query('UPDATE students SET actual_amount = ?, discount_amount = ?, debt_amount = ?, account_balance = ?, payment_status = ?, enrollment_status = ? WHERE id = ?', [newActualAmount, newDiscountAmount, newDebtAmount, newAccountBalance, paymentStatus, enrollmentStatus, record.student_id]);
        // === 生成冲销凭证（红字冲销） ===
        // 仅对正常缴费记录（金额>0）生成冲销凭证
        if (recordAmount > 0) {
            try {
                // 获取科目映射
                const subjectMapping = await (0, finance_1.getSubjectCodes)(['BANK_DEPOSIT', 'TUITION_INCOME'], connection);
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const yearMonth = `${year}${month}`;
                const [maxRows] = await connection.query(`SELECT voucher_no FROM finance_vouchers WHERE voucher_no LIKE ? ORDER BY id DESC LIMIT 1`, [`${yearMonth}-%`]);
                let seq = 1;
                if (maxRows.length > 0 && maxRows[0].voucher_no) {
                    const lastSeq = parseInt(maxRows[0].voucher_no.split('-')[1], 10);
                    seq = lastSeq + 1;
                }
                const voucherNo = `${yearMonth}-${String(seq).padStart(3, '0')}`;
                const [voucherResult] = await connection.query(`INSERT INTO finance_vouchers (voucher_no, voucher_date, description, creator_id, creator_name, source_type, source_id) 
           VALUES (?, ?, ?, 0, '系统', 'payment_reversal', ?)`, [voucherNo, today.toISOString().split('T')[0], `${student.name}缴费冲销`, id]);
                const voucherId = voucherResult.insertId;
                // 冲销凭证：与原凭证借贷方向相反
                // 借：学员学费 - 冲减收入
                await connection.query(`INSERT INTO finance_voucher_items (voucher_id, entry_type, subject_code, amount, summary, seq) 
           VALUES (?, '借', ?, ?, '冲销学员缴费收入', 0)`, [voucherId, subjectMapping['TUITION_INCOME'], recordAmount]);
                // 贷：银行存款 - 冲减资金流入
                await connection.query(`INSERT INTO finance_voucher_items (voucher_id, entry_type, subject_code, amount, summary, seq) 
           VALUES (?, '贷', ?, ?, '冲销收到学员学费', 1)`, [voucherId, subjectMapping['BANK_DEPOSIT'], recordAmount]);
                console.log('缴费冲销凭证创建成功:', voucherNo);
            }
            catch (financeError) {
                console.error('创建缴费冲销凭证失败:', financeError.message, financeError.code);
            }
        }
        // === 减免记录冲销凭证 ===
        if (isDiscountRecord) {
            const discountReverseAmount = Math.abs(recordAmount); // recordAmount是负数，取绝对值
            try {
                // 获取科目映射
                const subjectMapping = await (0, finance_1.getSubjectCodes)(['TUITION_INCOME', 'OTHER_INCOME'], connection);
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const yearMonth = `${year}${month}`;
                const [maxRows] = await connection.query(`SELECT voucher_no FROM finance_vouchers WHERE voucher_no LIKE ? ORDER BY id DESC LIMIT 1`, [`${yearMonth}-%`]);
                let seq = 1;
                if (maxRows.length > 0 && maxRows[0].voucher_no) {
                    const lastSeq = parseInt(maxRows[0].voucher_no.split('-')[1], 10);
                    seq = lastSeq + 1;
                }
                const voucherNo = `${yearMonth}-${String(seq).padStart(3, '0')}`;
                const [voucherResult] = await connection.query(`INSERT INTO finance_vouchers (voucher_no, voucher_date, description, creator_id, creator_name, source_type, source_id) 
           VALUES (?, ?, ?, 0, '系统', 'discount_reversal', ?)`, [voucherNo, today.toISOString().split('T')[0], `${student.name}减免冲销`, id]);
                const voucherId = voucherResult.insertId;
                // 冲销减免凭证：与原减免凭证借贷方向相反
                // 借：其他收入 - 冲销减免优惠
                await connection.query(`INSERT INTO finance_voucher_items (voucher_id, entry_type, subject_code, amount, summary, seq) 
           VALUES (?, '借', ?, ?, '冲销减免优惠', 0)`, [voucherId, subjectMapping['OTHER_INCOME'], discountReverseAmount]);
                // 贷：学员学费 - 恢复应收
                await connection.query(`INSERT INTO finance_voucher_items (voucher_id, entry_type, subject_code, amount, summary, seq) 
           VALUES (?, '贷', ?, ?, '恢复学员应收', 1)`, [voucherId, subjectMapping['TUITION_INCOME'], discountReverseAmount]);
                console.log('减免冲销凭证创建成功:', voucherNo);
            }
            catch (financeError) {
                console.error('创建减免冲销凭证失败:', financeError.message, financeError.code);
            }
        }
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
// 上缴确认接口（执行实际上缴操作并生成凭证）
router.post('/submit-confirm', async (req, res) => {
    const connection = await database_1.default.getConnection();
    try {
        await connection.beginTransaction();
        const { student_id, operator, remark } = req.body;
        // 验证必填字段
        if (!student_id || !operator) {
            return res.status(400).json({
                success: false,
                message: '学员ID和经办人为必填项'
            });
        }
        // 获取学员信息
        const [studentRows] = await connection.query(`SELECT s.*, ct.name as class_type_name 
       FROM students s 
       LEFT JOIN class_types ct ON s.class_type_id = ct.id 
       WHERE s.id = ?`, [student_id]);
        if (studentRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: '学员不存在'
            });
        }
        const student = studentRows[0];
        // 检查是否已上缴
        if (student.submit_status === '已上缴') {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: '该学员已完成上缴确认，不能重复操作'
            });
        }
        // 获取上缴配置（优先班型专属，回落全局）
        const config = await (0, finance_1.getActiveHeadquarterConfig)(connection, student.class_type_id);
        if (!config) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: '未找到有效的上缴配置，请先配置上缴规则'
            });
        }
        // 计算金额
        const contractAmount = parseFloat(student.contract_amount || 0);
        const actualAmount = parseFloat(student.actual_amount || 0);
        const accountBalance = parseFloat(student.account_balance || 0);
        const finalReceipt = actualAmount + accountBalance;
        // 计算上缴金额
        const submitAmount = (0, finance_1.calculateHeadquarterAmount)(contractAmount, config);
        const profit = finalReceipt - submitAmount;
        const submitDate = new Date().toISOString().split('T')[0];
        // 生成财务凭证：实际上缴款项给总校
        // 借：上缴总校费用 - 确认支出
        // 贷：银行存款 - 资金流出
        let voucherNo = '';
        try {
            // 获取科目映射
            const subjectMapping = await (0, finance_1.getSubjectCodes)(['BANK_DEPOSIT', 'HEADQUARTER_EXPENSE'], connection);
            // 简化凭证号生成：直接查询最大凭证号，避免依赖 finance_voucher_sequence 表
            const year = new Date().getFullYear();
            const month = String(new Date().getMonth() + 1).padStart(2, '0');
            const yearMonth = `${year}${month}`;
            const [maxRows] = await connection.query(`SELECT voucher_no FROM finance_vouchers WHERE voucher_no LIKE ? ORDER BY id DESC LIMIT 1`, [`${yearMonth}-%`]);
            let seq = 1;
            if (maxRows.length > 0 && maxRows[0].voucher_no) {
                const lastSeq = parseInt(maxRows[0].voucher_no.split('-')[1], 10);
                seq = lastSeq + 1;
            }
            voucherNo = `${yearMonth}-${String(seq).padStart(3, '0')}`;
            const [voucherResult] = await connection.query(`INSERT INTO finance_vouchers (voucher_no, voucher_date, description, creator_id, creator_name, source_type, source_id) 
         VALUES (?, ?, ?, 0, ?, 'submit_confirm', ?)`, [voucherNo, submitDate, `${student.name}上缴总校款项`, operator, student_id]);
            const voucherId = voucherResult.insertId;
            // 借：上缴总校费用 - 确认支出
            await connection.query(`INSERT INTO finance_voucher_items (voucher_id, entry_type, subject_code, amount, summary, seq) 
         VALUES (?, '借', ?, ?, '上缴总校款项', 0)`, [voucherId, subjectMapping['HEADQUARTER_EXPENSE'], submitAmount]);
            // 贷：银行存款 - 资金流出
            await connection.query(`INSERT INTO finance_voucher_items (voucher_id, entry_type, subject_code, amount, summary, seq) 
         VALUES (?, '贷', ?, ?, '支付总校上缴款', 1)`, [voucherId, subjectMapping['BANK_DEPOSIT'], submitAmount]);
            console.log('上缴凭证创建成功:', voucherNo);
        }
        catch (financeError) {
            console.error('创建上缴凭证失败:', financeError.message, financeError.code);
            // 凭证创建失败不影响主流程，继续执行，但清空凭证号
            voucherNo = '';
        }
        // 更新学员上缴状态
        await connection.query(`UPDATE students 
       SET submit_status = '已上缴', submit_amount = ?, submit_date = ?, submit_operator = ?
       WHERE id = ?`, [submitAmount, submitDate, operator, student_id]);
        // 记录上缴历史
        await connection.query(`INSERT INTO submit_records 
       (student_id, student_name, class_type_name, contract_amount, actual_amount, account_balance, 
        final_receipt, submit_amount, profit, config_id, config_name, config_type, config_value, 
        operator, submit_date, voucher_no, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            student_id,
            student.name,
            student.class_type_name || null,
            contractAmount,
            actualAmount,
            accountBalance,
            finalReceipt,
            submitAmount,
            profit,
            config.id,
            config.config_name,
            config.config_type,
            config.config_type === 'ratio'
                ? `${(Number(config.ratio) * 100).toFixed(2)}%`
                : `¥${Number(config.fixed_amount).toFixed(2)}`,
            operator,
            submitDate,
            voucherNo || null,
            remark || null
        ]);
        await connection.commit();
        res.json({
            success: true,
            data: {
                student_id,
                student_name: student.name,
                submit_amount: submitAmount,
                profit,
                voucher_no: voucherNo,
                submit_date: submitDate
            },
            message: '上缴确认成功'
        });
    }
    catch (error) {
        await connection.rollback();
        console.error('上缴确认失败:', error);
        res.status(500).json({
            success: false,
            message: '上缴确认失败: ' + error.message
        });
    }
    finally {
        connection.release();
    }
});
// 撤销上缴接口
router.post('/submit-revoke', async (req, res) => {
    const connection = await database_1.default.getConnection();
    try {
        await connection.beginTransaction();
        const { student_id, operator, remark } = req.body;
        // 验证必填字段
        if (!student_id || !operator) {
            return res.status(400).json({
                success: false,
                message: '学员ID和经办人为必填项'
            });
        }
        // 获取学员信息
        const [studentRows] = await connection.query(`SELECT s.*, ct.name as class_type_name 
       FROM students s 
       LEFT JOIN class_types ct ON s.class_type_id = ct.id 
       WHERE s.id = ?`, [student_id]);
        if (studentRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: '学员不存在'
            });
        }
        const student = studentRows[0];
        // 检查是否已上缴
        if (student.submit_status !== '已上缴') {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: '该学员未上缴，无需撤销'
            });
        }
        const submitAmount = parseFloat(student.submit_amount || 0);
        const revokeDate = new Date().toISOString().split('T')[0];
        // 生成冲销凭证：撤销上缴款项
        // 借：银行存款 - 资金流入（冲销原来的流出）
        // 贷：上缴总校费用 - 冲销支出
        let voucherNo = '';
        try {
            // 获取科目映射
            const subjectMapping = await (0, finance_1.getSubjectCodes)(['BANK_DEPOSIT', 'HEADQUARTER_EXPENSE'], connection);
            const year = new Date().getFullYear();
            const month = String(new Date().getMonth() + 1).padStart(2, '0');
            const yearMonth = `${year}${month}`;
            const [maxRows] = await connection.query(`SELECT voucher_no FROM finance_vouchers WHERE voucher_no LIKE ? ORDER BY id DESC LIMIT 1`, [`${yearMonth}-%`]);
            let seq = 1;
            if (maxRows.length > 0 && maxRows[0].voucher_no) {
                const lastSeq = parseInt(maxRows[0].voucher_no.split('-')[1], 10);
                seq = lastSeq + 1;
            }
            voucherNo = `${yearMonth}-${String(seq).padStart(3, '0')}`;
            const [voucherResult] = await connection.query(`INSERT INTO finance_vouchers (voucher_no, voucher_date, description, creator_id, creator_name, source_type, source_id) 
         VALUES (?, ?, ?, 0, ?, 'submit_revoke', ?)`, [voucherNo, revokeDate, `${student.name}撤销上缴`, operator, student_id]);
            const voucherId = voucherResult.insertId;
            // 借：银行存款 - 冲销资金流出
            await connection.query(`INSERT INTO finance_voucher_items (voucher_id, entry_type, subject_code, amount, summary, seq) 
         VALUES (?, '借', ?, ?, '撤销上缴款项', 0)`, [voucherId, subjectMapping['BANK_DEPOSIT'], submitAmount]);
            // 贷：上缴总校费用 - 冲销支出
            await connection.query(`INSERT INTO finance_voucher_items (voucher_id, entry_type, subject_code, amount, summary, seq) 
         VALUES (?, '贷', ?, ?, '冲销上缴总校费用', 1)`, [voucherId, subjectMapping['HEADQUARTER_EXPENSE'], submitAmount]);
            console.log('撤销上缴凭证创建成功:', voucherNo);
        }
        catch (financeError) {
            console.error('创建撤销上缴凭证失败:', financeError.message, financeError.code);
            voucherNo = '';
        }
        // 更新学员上缴状态为未上缴
        await connection.query(`UPDATE students 
       SET submit_status = '未上缴', submit_amount = 0, submit_date = NULL, submit_operator = NULL
       WHERE id = ?`, [student_id]);
        // 记录撤销操作到上缴记录表（金额为负数表示撤销）
        await connection.query(`INSERT INTO submit_records 
       (student_id, student_name, class_type_name, contract_amount, actual_amount, account_balance, 
        final_receipt, submit_amount, profit, config_id, config_name, config_type, config_value, 
        operator, submit_date, voucher_no, remark)
       VALUES (?, ?, ?, 0, 0, 0, 0, ?, 0, NULL, '撤销上缴', 'revoke', '', ?, ?, ?, ?)`, [
            student_id,
            student.name,
            student.class_type_name || null,
            -submitAmount, // 负数表示撤销
            operator,
            revokeDate,
            voucherNo || null,
            remark || '撤销上缴操作'
        ]);
        await connection.commit();
        res.json({
            success: true,
            data: {
                student_id,
                student_name: student.name,
                revoke_amount: submitAmount,
                voucher_no: voucherNo,
                revoke_date: revokeDate
            },
            message: '撤销上缴成功'
        });
    }
    catch (error) {
        await connection.rollback();
        console.error('撤销上缴失败:', error);
        res.status(500).json({
            success: false,
            message: '撤销上缴失败: ' + error.message
        });
    }
    finally {
        connection.release();
    }
});
// 获取上缴记录列表
router.get('/submit-records', async (req, res) => {
    try {
        const { limit = '10', offset = '0', keyword = '', start_date, end_date } = req.query;
        let sql = `SELECT * FROM submit_records WHERE 1=1`;
        const params = [];
        if (keyword) {
            sql += ' AND (student_name LIKE ? OR operator LIKE ?)';
            params.push(`%${keyword}%`, `%${keyword}%`);
        }
        if (start_date) {
            sql += ' AND submit_date >= ?';
            params.push(start_date);
        }
        if (end_date) {
            sql += ' AND submit_date <= ?';
            params.push(end_date);
        }
        // 获取总数
        const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
        const [countResult] = await database_1.default.query(countSql, params);
        const total = countResult[0].total;
        // 添加排序和分页
        sql += ' ORDER BY submit_date DESC, id DESC LIMIT ? OFFSET ?';
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
        console.error('获取上缴记录列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取上缴记录列表失败: ' + error.message
        });
    }
});
exports.default = router;
