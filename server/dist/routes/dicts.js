"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const router = (0, express_1.Router)();
// ========== 字典类型管理 ==========
// 获取字典类型列表
router.get('/types', async (req, res) => {
    try {
        const { limit = '10', offset = '0', keyword = '', status = '', sortBy = 'id', sortOrder = 'desc' } = req.query;
        const limitNum = parseInt(limit);
        const offsetNum = parseInt(offset);
        let whereClause = 'WHERE 1=1';
        const params = [];
        if (keyword) {
            whereClause += ' AND (dict_name LIKE ? OR dict_type LIKE ?)';
            const keywordPattern = `%${keyword}%`;
            params.push(keywordPattern, keywordPattern);
        }
        if (status) {
            whereClause += ' AND status = ?';
            params.push(status);
        }
        // 获取总数
        const [countResult] = await database_1.default.query(`SELECT COUNT(*) as total FROM sys_dict_type ${whereClause}`, params);
        const total = countResult[0].total;
        // 获取字典类型列表
        const orderClause = `ORDER BY ${sortBy} ${sortOrder}`;
        const [types] = await database_1.default.query(`SELECT id, dict_name, dict_type, status, remark, created_at, updated_at
       FROM sys_dict_type 
       ${whereClause} 
       ${orderClause} 
       LIMIT ? OFFSET ?`, [...params, limitNum, offsetNum]);
        res.json({
            success: true,
            message: '获取字典类型列表成功',
            data: {
                list: types,
                pagination: {
                    total,
                    limit: limitNum,
                    offset: offsetNum
                }
            }
        });
    }
    catch (error) {
        console.error('获取字典类型列表失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});
// 获取单个字典类型
router.get('/types/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [types] = await database_1.default.query('SELECT * FROM sys_dict_type WHERE id = ?', [id]);
        const typeList = types;
        if (typeList.length === 0) {
            return res.status(404).json({
                success: false,
                message: '字典类型不存在'
            });
        }
        res.json({
            success: true,
            message: '获取字典类型成功',
            data: typeList[0]
        });
    }
    catch (error) {
        console.error('获取字典类型失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});
// 创建字典类型
router.post('/types', async (req, res) => {
    try {
        const { dict_name, dict_type, status, remark } = req.body;
        if (!dict_name || !dict_type) {
            return res.status(400).json({
                success: false,
                message: '字典名称和字典类型不能为空'
            });
        }
        // 检查字典类型是否已存在
        const [existing] = await database_1.default.query('SELECT id FROM sys_dict_type WHERE dict_type = ?', [dict_type]);
        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: '字典类型已存在'
            });
        }
        const [result] = await database_1.default.query(`INSERT INTO sys_dict_type (dict_name, dict_type, status, remark) 
       VALUES (?, ?, ?, ?)`, [dict_name, dict_type, status || '启用', remark || null]);
        res.status(201).json({
            success: true,
            message: '创建字典类型成功',
            data: { id: result.insertId }
        });
    }
    catch (error) {
        console.error('创建字典类型失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});
// 更新字典类型
router.put('/types/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { dict_name, dict_type, status, remark } = req.body;
        if (!dict_name || !dict_type) {
            return res.status(400).json({
                success: false,
                message: '字典名称和字典类型不能为空'
            });
        }
        // 检查字典类型是否存在
        const [existing] = await database_1.default.query('SELECT id FROM sys_dict_type WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: '字典类型不存在'
            });
        }
        // 检查字典类型是否与其他记录冲突
        const [duplicate] = await database_1.default.query('SELECT id FROM sys_dict_type WHERE dict_type = ? AND id != ?', [dict_type, id]);
        if (duplicate.length > 0) {
            return res.status(400).json({
                success: false,
                message: '字典类型已存在'
            });
        }
        await database_1.default.query(`UPDATE sys_dict_type 
       SET dict_name = ?, dict_type = ?, status = ?, remark = ?
       WHERE id = ?`, [dict_name, dict_type, status, remark || null, id]);
        res.json({
            success: true,
            message: '更新字典类型成功'
        });
    }
    catch (error) {
        console.error('更新字典类型失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});
// 删除字典类型
router.delete('/types/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // 获取该字典类型的 dict_type 值
        const [typeResult] = await database_1.default.query('SELECT dict_type FROM sys_dict_type WHERE id = ?', [id]);
        if (typeResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: '字典类型不存在'
            });
        }
        const dict_type = typeResult[0].dict_type;
        // 检查是否存在关联的字典数据
        const [data] = await database_1.default.query('SELECT COUNT(*) as count FROM sys_dict_data WHERE dict_type = ?', [dict_type]);
        if (data[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: '该字典类型下有字典数据，无法删除'
            });
        }
        await database_1.default.query('DELETE FROM sys_dict_type WHERE id = ?', [id]);
        res.json({
            success: true,
            message: '删除字典类型成功'
        });
    }
    catch (error) {
        console.error('删除字典类型失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});
// ========== 字典数据管理 ==========
// 获取字典数据列表（根据字典类型ID）
router.get('/types/:id/data', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.query;
        let whereClause = 'WHERE dict_type = (SELECT dict_type FROM sys_dict_type WHERE id = ?)';
        const params = [id];
        if (status) {
            whereClause += ' AND status = ?';
            params.push(status);
        }
        const [data] = await database_1.default.query(`SELECT id, dict_type, dict_label, dict_value, sort_order, 
              status, remark, created_at, updated_at
       FROM sys_dict_data 
       ${whereClause}
       ORDER BY sort_order ASC, id ASC`, params);
        res.json({
            success: true,
            message: '获取字典数据列表成功',
            data: data
        });
    }
    catch (error) {
        console.error('获取字典数据列表失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});
// 创建字典数据
router.post('/data', async (req, res) => {
    try {
        console.log('收到创建字典数据请求，body:', req.body);
        const { dict_type_id, dict_label, dict_value, sort_order, status, remark } = req.body;
        if (!dict_type_id || !dict_label || !dict_value) {
            console.log('验证失败: dict_type_id=', dict_type_id, 'dict_label=', dict_label, 'dict_value=', dict_value);
            return res.status(400).json({
                success: false,
                message: '字典类型、标签和值不能为空'
            });
        }
        // 检查字典类型是否存在，并获取 dict_type
        console.log('查询字典类型ID:', dict_type_id);
        const [typeExists] = await database_1.default.query('SELECT dict_type FROM sys_dict_type WHERE id = ?', [dict_type_id]);
        console.log('字典类型查询结果:', typeExists);
        if (typeExists.length === 0) {
            return res.status(400).json({
                success: false,
                message: '字典类型不存在'
            });
        }
        const dict_type = typeExists[0].dict_type;
        console.log('获取到的 dict_type:', dict_type);
        // 检查同一字典类型下值是否重复
        const [duplicate] = await database_1.default.query('SELECT id FROM sys_dict_data WHERE dict_type = ? AND dict_value = ?', [dict_type, dict_value]);
        if (duplicate.length > 0) {
            return res.status(400).json({
                success: false,
                message: '该字典类型下值已存在'
            });
        }
        console.log('准备插入数据:', { dict_type, dict_label, dict_value, sort_order, status, remark });
        const [result] = await database_1.default.query(`INSERT INTO sys_dict_data 
       (dict_type, dict_label, dict_value, sort_order, status, remark) 
       VALUES (?, ?, ?, ?, ?, ?)`, [dict_type, dict_label, dict_value, sort_order || 0, status || '启用', remark || null]);
        console.log('插入成功，ID:', result.insertId);
        res.status(201).json({
            success: true,
            message: '创建字典数据成功',
            data: { id: result.insertId }
        });
    }
    catch (error) {
        console.error('创建字典数据失败:', error);
        console.error('请求数据:', req.body);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : '服务器错误'
        });
    }
});
// 更新字典数据
router.put('/data/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { dict_type_id, dict_label, dict_value, sort_order, status, remark } = req.body;
        if (!dict_type_id || !dict_label || !dict_value) {
            return res.status(400).json({
                success: false,
                message: '字典类型、标签和值不能为空'
            });
        }
        // 检查是否存在
        const [existing] = await database_1.default.query('SELECT dict_type FROM sys_dict_data WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: '字典数据不存在'
            });
        }
        // 获取新的 dict_type
        const [typeExists] = await database_1.default.query('SELECT dict_type FROM sys_dict_type WHERE id = ?', [dict_type_id]);
        if (typeExists.length === 0) {
            return res.status(400).json({
                success: false,
                message: '字典类型不存在'
            });
        }
        const dict_type = typeExists[0].dict_type;
        // 检查同一字典类型下值是否重复
        const [duplicate] = await database_1.default.query('SELECT id FROM sys_dict_data WHERE dict_type = ? AND dict_value = ? AND id != ?', [dict_type, dict_value, id]);
        if (duplicate.length > 0) {
            return res.status(400).json({
                success: false,
                message: '该字典类型下值已存在'
            });
        }
        await database_1.default.query(`UPDATE sys_dict_data 
       SET dict_type = ?, dict_label = ?, dict_value = ?, 
           sort_order = ?, status = ?, remark = ?
       WHERE id = ?`, [dict_type, dict_label, dict_value, sort_order, status, remark || null, id]);
        res.json({
            success: true,
            message: '更新字典数据成功'
        });
    }
    catch (error) {
        console.error('更新字典数据失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});
// 删除字典数据
router.delete('/data/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await database_1.default.query('DELETE FROM sys_dict_data WHERE id = ?', [id]);
        res.json({
            success: true,
            message: '删除字典数据成功'
        });
    }
    catch (error) {
        console.error('删除字典数据失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});
exports.default = router;
