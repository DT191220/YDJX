"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const security_1 = require("../utils/security");
const router = (0, express_1.Router)();
// 身份证号校验函数
function validateIdCard(idCard) {
    if (!/^\d{17}[\dXx]$/.test(idCard)) {
        return false;
    }
    // 加权因子
    const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    // 校验码对应值
    const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
    let sum = 0;
    for (let i = 0; i < 17; i++) {
        sum += parseInt(idCard[i]) * weights[i];
    }
    const checkCode = checkCodes[sum % 11];
    return idCard[17].toUpperCase() === checkCode;
}
// 从身份证号提取出生日期和计算年龄
function extractInfoFromIdCard(idCard) {
    const year = idCard.substring(6, 10);
    const month = idCard.substring(10, 12);
    const day = idCard.substring(12, 14);
    const birthDate = `${year}-${month}-${day}`;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return { birthDate, age };
}
// 获取学员列表（支持高级查询和分页）
router.get('/', async (req, res) => {
    try {
        const { limit = '10', offset = '0', keyword = '', status = '', enrollment_date_start = '', enrollment_date_end = '', coach_name = '', sortBy = 'id', sortOrder = 'desc' } = req.query;
        const limitNum = parseInt(limit);
        const offsetNum = parseInt(offset);
        // 构建查询条件
        let whereClause = 'WHERE 1=1';
        const params = [];
        // 移除过滤规则，显示所有报名状态的学员
        // whereClause += ` AND enrollment_status NOT IN ('咨询中', '预约报名')`;
        if (keyword) {
            whereClause += ' AND (name LIKE ? OR id_card LIKE ? OR phone LIKE ?)';
            const keywordPattern = `%${keyword}%`;
            params.push(keywordPattern, keywordPattern, keywordPattern);
        }
        if (status) {
            whereClause += ' AND enrollment_status = ?';
            params.push(status);
        }
        if (enrollment_date_start) {
            whereClause += ' AND enrollment_date >= ?';
            params.push(enrollment_date_start);
        }
        if (enrollment_date_end) {
            whereClause += ' AND enrollment_date <= ?';
            params.push(enrollment_date_end);
        }
        if (coach_name) {
            whereClause += ' AND coach_name LIKE ?';
            params.push(`%${coach_name}%`);
        }
        // 获取总数
        const [countResult] = await database_1.default.query(`SELECT COUNT(*) as total FROM students ${whereClause}`, params);
        const total = countResult[0].total;
        // 获取学员列表 - 使用白名单验证排序参数
        const validColumns = ['id', 'name', 'phone', 'gender', 'birth_date', 'age', 'enrollment_status', 'enrollment_date', 'coach_name', 'class_type_id', 'license_type', 'created_at', 'updated_at'];
        const { sortColumn, order } = (0, security_1.validateSortParams)(sortBy, sortOrder, validColumns, 'id');
        const orderClause = `ORDER BY ${sortColumn} ${order}`;
        const [students] = await database_1.default.query(`SELECT s.id, s.name, s.id_card, s.phone, s.gender, 
              DATE_FORMAT(s.birth_date, '%Y-%m-%d') as birth_date, 
              s.age, s.address, 
              s.native_place, s.enrollment_status as status, 
              DATE_FORMAT(s.enrollment_date, '%Y-%m-%d') as enrollment_date, 
              s.medical_history,
              s.has_driving_experience, s.driving_years, s.previous_school_history,
              s.emergency_contact, s.emergency_phone, s.coach_id, s.coach_name,
              s.coach_subject2_name, s.coach_subject3_name,
              s.class_type_id, ct.name as class_type_name, s.license_type,
              s.contract_amount, s.actual_amount, s.discount_amount, s.debt_amount, s.account_balance, s.payment_status,
              (s.contract_amount - s.discount_amount) as payable_amount,
              s.registrar_id, s.registrar_name, s.created_at, s.updated_at
       FROM students s
       LEFT JOIN class_types ct ON s.class_type_id = ct.id
       ${whereClause} 
       ${orderClause} 
       LIMIT ? OFFSET ?`, [...params, limitNum, offsetNum]);
        res.json({
            success: true,
            message: '获取学员列表成功',
            data: {
                list: students,
                pagination: {
                    total,
                    limit: limitNum,
                    offset: offsetNum
                }
            }
        });
    }
    catch (error) {
        console.error('获取学员列表失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});
// 获取单个学员详情
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [students] = await database_1.default.query(`SELECT s.id, s.name, s.id_card, s.phone, s.gender, 
              DATE_FORMAT(s.birth_date, '%Y-%m-%d') as birth_date, 
              s.age, s.address,
              s.native_place, s.enrollment_status as status, 
              DATE_FORMAT(s.enrollment_date, '%Y-%m-%d') as enrollment_date, 
              s.medical_history,
              s.has_driving_experience, s.driving_years, s.previous_school_history,
              s.emergency_contact, s.emergency_phone, s.coach_id, s.coach_name,
              s.coach_subject2_name, s.coach_subject3_name,
              s.class_type_id, ct.name as class_type_name, s.license_type,
              s.contract_amount, s.actual_amount, s.discount_amount, s.debt_amount, s.account_balance, s.payment_status,
              (s.contract_amount - s.discount_amount) as payable_amount,
              s.registrar_id, s.registrar_name, s.created_at, s.updated_at
       FROM students s
       LEFT JOIN class_types ct ON s.class_type_id = ct.id
       WHERE s.id = ?`, [id]);
        const studentList = students;
        if (studentList.length === 0) {
            return res.status(404).json({
                success: false,
                message: '学员不存在'
            });
        }
        res.json({
            success: true,
            message: '获取学员信息成功',
            data: studentList[0]
        });
    }
    catch (error) {
        console.error('获取学员信息失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});
// 创建学员
router.post('/', async (req, res) => {
    try {
        console.log('收到创建学员请求，原始body:', JSON.stringify(req.body));
        const { name, id_card, phone, gender, address, native_place, status, enrollment_date, medical_history, has_driving_experience, driving_years, previous_school_history, emergency_contact, emergency_phone, coach_id, coach_name, coach_subject2_name, coach_subject3_name, class_type_id, license_type } = req.body;
        console.log('解析后的gender:', gender, 'Buffer:', Buffer.from(gender).toString('hex'));
        // 验证必填字段
        if (!name || !id_card || !phone || !gender) {
            return res.status(400).json({
                success: false,
                message: '姓名、身份证号、手机号码、性别为必填项'
            });
        }
        // 身份证号格式校验
        if (!validateIdCard(id_card)) {
            return res.status(400).json({
                success: false,
                message: '身份证号格式不正确'
            });
        }
        // 检查身份证号是否已存在
        const [existing] = await database_1.default.query('SELECT id FROM students WHERE id_card = ?', [id_card]);
        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: '该身份证号已存在'
            });
        }
        // 当报名状态为"报名未缴费"时，报名日期和驾照类型必填
        if (status === '报名未缴费') {
            if (!enrollment_date) {
                return res.status(400).json({
                    success: false,
                    message: '报名状态为"报名未缴费"时，报名日期为必填项'
                });
            }
            if (!license_type) {
                return res.status(400).json({
                    success: false,
                    message: '报名状态为"报名未缴费"时，驾照类型为必填项'
                });
            }
        }
        // 从身份证号提取出生日期和年龄
        const { birthDate, age } = extractInfoFromIdCard(id_card);
        // 获取当前登录用户信息作为登记人（从token中获取）
        const registrar_id = req.user?.id || null;
        const registrar_name = req.user?.username || null;
        console.log('准备插入数据:', {
            name, gender, status, has_driving_experience,
            name_hex: Buffer.from(name).toString('hex'),
            gender_hex: Buffer.from(gender).toString('hex')
        });
        // 如果选择了班型，获取班型的合同金额并快照到学员记录
        let contractAmount = 0;
        if (class_type_id) {
            const [classTypes] = await database_1.default.query('SELECT contract_amount FROM class_types WHERE id = ?', [class_type_id]);
            if (classTypes.length > 0) {
                // 快照当前班型价格作为学员的合同金额（历史价格）
                contractAmount = classTypes[0].contract_amount;
            }
        }
        // 插入学员信息
        const [result] = await database_1.default.query(`INSERT INTO students 
       (name, id_card, phone, gender, birth_date, age, address, native_place,
        enrollment_status, enrollment_date, medical_history, has_driving_experience,
        driving_years, previous_school_history, emergency_contact, emergency_phone,
        coach_id, coach_name, coach_subject2_name, coach_subject3_name,
        class_type_id, license_type, contract_amount, registrar_id, registrar_name) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            name, id_card, phone, gender, birthDate, age, address || null, native_place || null,
            status || '咨询中', enrollment_date || null, medical_history || null,
            has_driving_experience || '无', driving_years || 0, previous_school_history || null,
            emergency_contact || null, emergency_phone || null, coach_id || null,
            coach_name || null, coach_subject2_name || null, coach_subject3_name || null,
            class_type_id || null, license_type || 'C1', contractAmount, registrar_id, registrar_name
        ]);
        res.status(201).json({
            success: true,
            message: '创建学员成功',
            data: { id: result.insertId }
        });
    }
    catch (error) {
        console.error('创建学员失败:', error);
        // 处理重复键错误
        if (error.code === 'ER_DUP_ENTRY') {
            if (error.sqlMessage?.includes('id_card')) {
                return res.status(400).json({
                    success: false,
                    message: '该身份证号已存在'
                });
            }
        }
        res.status(500).json({
            success: false,
            message: error.message || '服务器错误'
        });
    }
});
// 更新学员信息
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, id_card, phone, gender, address, native_place, status, enrollment_date, medical_history, has_driving_experience, driving_years, previous_school_history, emergency_contact, emergency_phone, coach_id, coach_name, coach_subject2_name, coach_subject3_name, class_type_id, license_type } = req.body;
        // 验证必填字段
        if (!name || !id_card || !phone || !gender) {
            return res.status(400).json({
                success: false,
                message: '姓名、身份证号、手机号码、性别为必填项'
            });
        }
        // 身份证号格式校验
        if (!validateIdCard(id_card)) {
            return res.status(400).json({
                success: false,
                message: '身份证号格式不正确'
            });
        }
        // 检查学员是否存在
        const [existing] = await database_1.default.query('SELECT id FROM students WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: '学员不存在'
            });
        }
        // 检查身份证号是否与其他学员冲突
        const [duplicate] = await database_1.default.query('SELECT id FROM students WHERE id_card = ? AND id != ?', [id_card, id]);
        if (duplicate.length > 0) {
            return res.status(400).json({
                success: false,
                message: '该身份证号已存在'
            });
        }
        // 从身份证号提取出生日期和年龄
        const { birthDate, age } = extractInfoFromIdCard(id_card);
        // 检查学员当前状态（用于校验报名状态和合同金额）
        const [currentStudentRows] = await database_1.default.query('SELECT enrollment_status, payment_status, contract_amount, enrollment_date, license_type FROM students WHERE id = ?', [id]);
        const currentStudent = currentStudentRows[0];
        // 校验报名状态：如果学员已产生缴费行为，不允许手动修改报名状态
        if (currentStudent.payment_status && currentStudent.payment_status !== '未缴费') {
            // 检查是否尝试修改报名状态
            if (status && status !== currentStudent.enrollment_status) {
                return res.status(400).json({
                    success: false,
                    message: '该学员已产生缴费记录，报名状态由缴费状态自动同步，不允许手动修改'
                });
            }
        }
        // 当报名状态为"报名未缴费"时，报名日期和驾照类型必填
        if (status === '报名未缴费') {
            if (!enrollment_date) {
                return res.status(400).json({
                    success: false,
                    message: '报名状态为"报名未缴费"时，报名日期为必填项'
                });
            }
            if (!license_type) {
                return res.status(400).json({
                    success: false,
                    message: '报名状态为"报名未缴费"时，驾照类型为必填项'
                });
            }
        }
        // 校验：如果学员当前状态为"报名未缴费"，不允许修改报名状态、报名日期、驾照类型
        if (currentStudent.enrollment_status === '报名未缴费') {
            // 检查是否尝试修改报名状态
            if (status && status !== currentStudent.enrollment_status) {
                return res.status(400).json({
                    success: false,
                    message: '已完成报名的学员，报名状态不允许手动修改'
                });
            }
            // 检查是否尝试修改报名日期
            const currentEnrollmentDate = currentStudent.enrollment_date
                ? new Date(currentStudent.enrollment_date).toISOString().split('T')[0]
                : null;
            if (enrollment_date && enrollment_date !== currentEnrollmentDate) {
                return res.status(400).json({
                    success: false,
                    message: '已完成报名的学员，报名日期不允许修改'
                });
            }
            // 检查是否尝试修改驾照类型
            if (license_type && license_type !== currentStudent.license_type) {
                return res.status(400).json({
                    success: false,
                    message: '已完成报名的学员，驾照类型不允许修改'
                });
            }
        }
        // 如果更新了班型，获取班型的合同金额
        // 注意：只有在学员还未报名时才更新合同金额，已报名学员的合同金额不受班型价格变更影响
        let contractAmount = null;
        if (class_type_id) {
            // 只有在学员未报名时（咨询中、预约报名）才允许更新合同金额
            if (currentStudent.enrollment_status === '咨询中' || currentStudent.enrollment_status === '预约报名') {
                const [classTypes] = await database_1.default.query('SELECT contract_amount FROM class_types WHERE id = ?', [class_type_id]);
                if (classTypes.length > 0) {
                    contractAmount = classTypes[0].contract_amount;
                }
            }
            // 如果学员已报名，保留原有合同金额（历史价格）
        }
        // 更新学员信息
        await database_1.default.query(`UPDATE students 
       SET name = ?, id_card = ?, phone = ?, gender = ?, birth_date = ?, age = ?,
           address = ?, native_place = ?, enrollment_status = ?, enrollment_date = ?,
           medical_history = ?, has_driving_experience = ?, driving_years = ?,
           previous_school_history = ?, emergency_contact = ?, emergency_phone = ?,
           coach_id = ?, coach_name = ?, coach_subject2_name = ?, coach_subject3_name = ?,
           class_type_id = ?, license_type = ?${contractAmount !== null ? ', contract_amount = ?' : ''}
       WHERE id = ?`, contractAmount !== null
            ? [
                name, id_card, phone, gender, birthDate, age, address || null, native_place || null,
                status, enrollment_date || null, medical_history || null,
                has_driving_experience || '无', driving_years || 0, previous_school_history || null,
                emergency_contact || null, emergency_phone || null, coach_id || null,
                coach_name || null, coach_subject2_name || null, coach_subject3_name || null,
                class_type_id || null, license_type || 'C1', contractAmount, id
            ]
            : [
                name, id_card, phone, gender, birthDate, age, address || null, native_place || null,
                status, enrollment_date || null, medical_history || null,
                has_driving_experience || '无', driving_years || 0, previous_school_history || null,
                emergency_contact || null, emergency_phone || null, coach_id || null,
                coach_name || null, coach_subject2_name || null, coach_subject3_name || null,
                class_type_id || null, license_type || 'C1', id
            ]);
        res.json({
            success: true,
            message: '更新学员信息成功'
        });
    }
    catch (error) {
        console.error('更新学员信息失败:', error);
        // 处理重复键错误
        if (error.code === 'ER_DUP_ENTRY') {
            if (error.sqlMessage?.includes('id_card')) {
                return res.status(400).json({
                    success: false,
                    message: '该身份证号已存在'
                });
            }
        }
        res.status(500).json({
            success: false,
            message: error.message || '服务器错误'
        });
    }
});
// 删除学员
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // 检查学员是否存在
        const [existing] = await database_1.default.query('SELECT id, enrollment_status FROM students WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: '学员不存在'
            });
        }
        // 删除学员
        await database_1.default.query('DELETE FROM students WHERE id = ?', [id]);
        res.json({
            success: true,
            message: '删除学员成功'
        });
    }
    catch (error) {
        console.error('删除学员失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});
// 获取招生统计数据
router.get('/statistics/enrollment', async (req, res) => {
    try {
        const { year } = req.query;
        const targetYear = year ? parseInt(year) : new Date().getFullYear();
        // 月度招生统计（按报名日期统计，排除咨询中和预约报名状态）
        const [monthlyData] = await database_1.default.query(`
      SELECT 
        DATE_FORMAT(enrollment_date, '%Y-%m') as month,
        COUNT(*) as count
      FROM students
      WHERE YEAR(enrollment_date) = ?
        AND enrollment_status NOT IN ('咨询中', '预约报名')
      GROUP BY DATE_FORMAT(enrollment_date, '%Y-%m')
      ORDER BY month
    `, [targetYear]);
        // 按班型统计
        const [byClassType] = await database_1.default.query(`
      SELECT 
        ct.name as class_type_name,
        COUNT(*) as count
      FROM students s
      LEFT JOIN class_types ct ON s.class_type_id = ct.id
      WHERE YEAR(s.enrollment_date) = ?
        AND s.enrollment_status NOT IN ('咨询中', '预约报名')
      GROUP BY s.class_type_id, ct.name
      ORDER BY count DESC
    `, [targetYear]);
        // 按教练统计
        const [byCoach] = await database_1.default.query(`
      SELECT 
        coach_name,
        COUNT(*) as count
      FROM students
      WHERE YEAR(enrollment_date) = ?
        AND enrollment_status NOT IN ('咨询中', '预约报名')
        AND coach_name IS NOT NULL AND coach_name != ''
      GROUP BY coach_name
      ORDER BY count DESC
    `, [targetYear]);
        // 年度总计
        const [yearTotal] = await database_1.default.query(`
      SELECT COUNT(*) as total
      FROM students
      WHERE YEAR(enrollment_date) = ?
        AND enrollment_status NOT IN ('咨询中', '预约报名')
    `, [targetYear]);
        // 获取上一年同期数据用于同比计算
        const [lastYearTotal] = await database_1.default.query(`
      SELECT COUNT(*) as total
      FROM students
      WHERE YEAR(enrollment_date) = ?
        AND enrollment_status NOT IN ('咨询中', '预约报名')
    `, [targetYear - 1]);
        // 构建完整的12个月数据
        const monthlyStats = [];
        for (let m = 1; m <= 12; m++) {
            const monthStr = `${targetYear}-${String(m).padStart(2, '0')}`;
            const found = monthlyData.find(item => item.month === monthStr);
            monthlyStats.push({
                month: monthStr,
                monthName: `${m}月`,
                count: found ? found.count : 0
            });
        }
        res.json({
            success: true,
            data: {
                year: targetYear,
                yearTotal: yearTotal[0]?.total || 0,
                lastYearTotal: lastYearTotal[0]?.total || 0,
                monthlyStats,
                byClassType,
                byCoach
            }
        });
    }
    catch (error) {
        console.error('获取招生统计数据失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});
exports.default = router;
