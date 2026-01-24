"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const router = (0, express_1.Router)();
// 获取考试场地列表
router.get('/', async (req, res) => {
    try {
        const { keyword = '', is_active = '' } = req.query;
        let whereClause = 'WHERE 1=1';
        const params = [];
        if (keyword) {
            whereClause += ' AND (name LIKE ? OR address LIKE ?)';
            const keywordPattern = `%${keyword}%`;
            params.push(keywordPattern, keywordPattern);
        }
        if (is_active !== '') {
            whereClause += ' AND is_active = ?';
            params.push(is_active === 'true' ? 1 : 0);
        }
        const [venues] = await database_1.default.query(`SELECT * FROM exam_venues ${whereClause} ORDER BY id DESC`, params);
        res.json({
            success: true,
            message: '获取考试场地列表成功',
            data: venues
        });
    }
    catch (error) {
        console.error('获取考试场地列表失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误: ' + error.message
        });
    }
});
// 获取启用的考试场地列表（用于下拉选择）
router.get('/enabled', async (req, res) => {
    try {
        const [venues] = await database_1.default.query('SELECT id, name, address FROM exam_venues WHERE is_active = 1 ORDER BY name');
        res.json({
            success: true,
            message: '获取启用场地列表成功',
            data: venues
        });
    }
    catch (error) {
        console.error('获取启用场地列表失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误: ' + error.message
        });
    }
});
// 获取单个考试场地详情
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [venues] = await database_1.default.query('SELECT * FROM exam_venues WHERE id = ?', [id]);
        if (venues.length === 0) {
            return res.status(404).json({
                success: false,
                message: '考试场地不存在'
            });
        }
        res.json({
            success: true,
            message: '获取考试场地详情成功',
            data: venues[0]
        });
    }
    catch (error) {
        console.error('获取考试场地详情失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误: ' + error.message
        });
    }
});
// 创建考试场地
router.post('/', async (req, res) => {
    try {
        const { name, address, is_active = true } = req.body;
        // 验证必填字段
        if (!name) {
            return res.status(400).json({
                success: false,
                message: '场地名称为必填项'
            });
        }
        // 检查场地名称是否已存在
        const [existing] = await database_1.default.query('SELECT id FROM exam_venues WHERE name = ?', [name]);
        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: '场地名称已存在'
            });
        }
        const [result] = await database_1.default.query('INSERT INTO exam_venues (name, address, is_active) VALUES (?, ?, ?)', [name, address, is_active ? 1 : 0]);
        res.json({
            success: true,
            message: '创建考试场地成功',
            data: { id: result.insertId }
        });
    }
    catch (error) {
        console.error('创建考试场地失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误: ' + error.message
        });
    }
});
// 更新考试场地
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, is_active } = req.body;
        // 验证必填字段
        if (!name) {
            return res.status(400).json({
                success: false,
                message: '场地名称为必填项'
            });
        }
        // 检查场地是否存在
        const [venues] = await database_1.default.query('SELECT id FROM exam_venues WHERE id = ?', [id]);
        if (venues.length === 0) {
            return res.status(404).json({
                success: false,
                message: '考试场地不存在'
            });
        }
        // 检查场地名称是否与其他场地重复
        const [existing] = await database_1.default.query('SELECT id FROM exam_venues WHERE name = ? AND id != ?', [name, id]);
        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: '场地名称已被其他场地使用'
            });
        }
        await database_1.default.query('UPDATE exam_venues SET name = ?, address = ?, is_active = ? WHERE id = ?', [name, address, is_active ? 1 : 0, id]);
        res.json({
            success: true,
            message: '更新考试场地成功'
        });
    }
    catch (error) {
        console.error('更新考试场地失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误: ' + error.message
        });
    }
});
// 删除考试场地
router.delete('/:id', async (req, res) => {
    const connection = await database_1.default.getConnection();
    try {
        const { id } = req.params;
        await connection.beginTransaction();
        // 检查是否有关联的考试安排
        const [schedules] = await connection.query('SELECT COUNT(*) as count FROM exam_schedules WHERE venue_id = ?', [id]);
        if (schedules[0].count > 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: '该场地已有关联的考试安排，无法删除'
            });
        }
        const [result] = await connection.query('DELETE FROM exam_venues WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: '考试场地不存在'
            });
        }
        await connection.commit();
        res.json({
            success: true,
            message: '删除考试场地成功'
        });
    }
    catch (error) {
        await connection.rollback();
        console.error('删除考试场地失败:', error);
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
