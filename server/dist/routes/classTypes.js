"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const router = (0, express_1.Router)();
// 获取班型列表（支持分页和筛选）
router.get('/', async (req, res) => {
    try {
        const { limit = '10', offset = '0', keyword = '', status = '' } = req.query;
        let sql = 'SELECT * FROM class_types WHERE 1=1';
        const params = [];
        // 关键字搜索（班型名称或描述）
        if (keyword) {
            sql += ' AND (name LIKE ? OR description LIKE ?)';
            params.push(`%${keyword}%`, `%${keyword}%`);
        }
        // 状态筛选
        if (status) {
            sql += ' AND status = ?';
            params.push(status);
        }
        // 获取总数
        const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
        const [countResult] = await database_1.default.query(countSql, params);
        const total = countResult[0].total;
        // 添加排序和分页
        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
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
        console.error('获取班型列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取班型列表失败: ' + error.message
        });
    }
});
// 获取所有启用的班型（用于下拉选择）
// 注意：这个路由必须放在 /:id 之前，否则会被 /:id 拦截
router.get('/list/enabled', async (req, res) => {
    try {
        const [rows] = await database_1.default.query('SELECT id, name, contract_amount FROM class_types WHERE status = "启用" ORDER BY contract_amount ASC');
        res.json({
            success: true,
            data: rows
        });
    }
    catch (error) {
        console.error('获取启用班型列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取启用班型列表失败: ' + error.message
        });
    }
});
// 获取单个班型详情（包含服务配置）
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // 获取班型基本信息
        const [classTypeRows] = await database_1.default.query('SELECT * FROM class_types WHERE id = ?', [id]);
        if (classTypeRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '班型不存在'
            });
        }
        const classType = classTypeRows[0];
        // 获取服务配置
        const [serviceRows] = await database_1.default.query('SELECT * FROM service_configs WHERE class_type_id = ? ORDER BY FIELD(subject, "科目一", "科目二", "科目三", "科目四")', [id]);
        res.json({
            success: true,
            data: {
                ...classType,
                services: serviceRows
            }
        });
    }
    catch (error) {
        console.error('获取班型详情失败:', error);
        res.status(500).json({
            success: false,
            message: '获取班型详情失败: ' + error.message
        });
    }
});
// 创建班型
router.post('/', async (req, res) => {
    try {
        const { name, contract_amount, description, status = '启用' } = req.body;
        // 验证必填字段
        if (!name || !contract_amount) {
            return res.status(400).json({
                success: false,
                message: '班型名称和合同金额为必填项'
            });
        }
        // 验证金额格式
        if (isNaN(parseFloat(contract_amount)) || parseFloat(contract_amount) < 0) {
            return res.status(400).json({
                success: false,
                message: '合同金额必须为正数'
            });
        }
        // 检查班型名称是否已存在
        const [existingRows] = await database_1.default.query('SELECT id FROM class_types WHERE name = ?', [name]);
        if (existingRows.length > 0) {
            return res.status(400).json({
                success: false,
                message: '班型名称已存在'
            });
        }
        // 插入班型
        const [result] = await database_1.default.query('INSERT INTO class_types (name, contract_amount, description, status) VALUES (?, ?, ?, ?)', [name, contract_amount, description, status]);
        const insertId = result.insertId;
        res.json({
            success: true,
            data: { id: insertId },
            message: '班型创建成功'
        });
    }
    catch (error) {
        console.error('创建班型失败:', error);
        res.status(500).json({
            success: false,
            message: '创建班型失败: ' + error.message
        });
    }
});
// 更新班型
router.put('/:id', async (req, res) => {
    const connection = await database_1.default.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const { name, contract_amount, description, status, price_change_notes } = req.body;
        // 检查班型是否存在并获取当前价格
        const [existingRows] = await connection.query('SELECT id, contract_amount FROM class_types WHERE id = ?', [id]);
        if (existingRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: '班型不存在'
            });
        }
        const currentClassType = existingRows[0];
        const oldContractAmount = parseFloat(currentClassType.contract_amount);
        const newContractAmount = parseFloat(contract_amount);
        // 验证必填字段
        if (!name || !contract_amount) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: '班型名称和合同金额为必填项'
            });
        }
        // 验证金额格式
        if (isNaN(newContractAmount) || newContractAmount < 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: '合同金额必须为正数'
            });
        }
        // 检查班型名称是否与其他班型重复
        const [duplicateRows] = await connection.query('SELECT id FROM class_types WHERE name = ? AND id != ?', [name, id]);
        if (duplicateRows.length > 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: '班型名称已存在'
            });
        }
        // 如果价格发生变化，将旧价格记录到历史表
        if (oldContractAmount !== newContractAmount) {
            await connection.query(`INSERT INTO class_type_price_history 
         (class_type_id, contract_amount, effective_date, created_by, notes) 
         VALUES (?, ?, NOW(), ?, ?)`, [
                id,
                oldContractAmount,
                req.user?.username || 'system',
                price_change_notes || `价格从 ${oldContractAmount} 调整为 ${newContractAmount}`
            ]);
        }
        // 更新班型
        await connection.query('UPDATE class_types SET name = ?, contract_amount = ?, description = ?, status = ? WHERE id = ?', [name, newContractAmount, description, status, id]);
        await connection.commit();
        res.json({
            success: true,
            message: '班型更新成功',
            data: {
                price_changed: oldContractAmount !== newContractAmount,
                old_price: oldContractAmount,
                new_price: newContractAmount
            }
        });
    }
    catch (error) {
        await connection.rollback();
        console.error('更新班型失败:', error);
        res.status(500).json({
            success: false,
            message: '更新班型失败: ' + error.message
        });
    }
    finally {
        connection.release();
    }
});
// 删除班型
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // 检查是否有学员使用该班型
        const [studentRows] = await database_1.default.query('SELECT COUNT(*) as count FROM students WHERE class_type_id = ?', [id]);
        const studentCount = studentRows[0].count;
        if (studentCount > 0) {
            return res.status(400).json({
                success: false,
                message: `该班型下有 ${studentCount} 名学员，无法删除`
            });
        }
        // 删除班型（会级联删除服务配置）
        const [result] = await database_1.default.query('DELETE FROM class_types WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: '班型不存在'
            });
        }
        res.json({
            success: true,
            message: '班型删除成功'
        });
    }
    catch (error) {
        console.error('删除班型失败:', error);
        res.status(500).json({
            success: false,
            message: '删除班型失败: ' + error.message
        });
    }
});
exports.default = router;
