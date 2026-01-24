"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const security_1 = require("../utils/security");
const router = (0, express_1.Router)();
// 获取角色列表（支持分页、搜索、排序）
router.get('/', async (req, res) => {
    try {
        const { limit = '10', offset = '0', keyword = '', status = '', sortBy = 'id', sortOrder = 'desc' } = req.query;
        const limitNum = parseInt(limit);
        const offsetNum = parseInt(offset);
        // 构建查询条件
        let whereClause = 'WHERE 1=1';
        const params = [];
        if (keyword) {
            whereClause += ' AND (role_name LIKE ? OR role_code LIKE ? OR description LIKE ?)';
            const keywordPattern = `%${keyword}%`;
            params.push(keywordPattern, keywordPattern, keywordPattern);
        }
        if (status) {
            whereClause += ' AND status = ?';
            params.push(status);
        }
        // 获取总数
        const [countResult] = await database_1.default.query(`SELECT COUNT(*) as total FROM sys_roles ${whereClause}`, params);
        const total = countResult[0].total;
        // 获取角色列表 - 使用白名单验证排序参数
        const validColumns = ['id', 'role_name', 'role_code', 'status', 'sort_order', 'created_at', 'updated_at'];
        const { sortColumn, order } = (0, security_1.validateSortParams)(sortBy, sortOrder, validColumns, 'id');
        const orderClause = `ORDER BY ${sortColumn} ${order}`;
        const [roles] = await database_1.default.query(`SELECT id, role_name, role_code, description, status, sort_order, 
              created_at, updated_at
       FROM sys_roles 
       ${whereClause} 
       ${orderClause} 
       LIMIT ? OFFSET ?`, [...params, limitNum, offsetNum]);
        res.json({
            success: true,
            message: '获取角色列表成功',
            data: {
                list: roles,
                pagination: {
                    total,
                    limit: limitNum,
                    offset: offsetNum
                }
            }
        });
    }
    catch (error) {
        console.error('获取角色列表失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});
// 获取单个角色
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [roles] = await database_1.default.query('SELECT * FROM sys_roles WHERE id = ?', [id]);
        const roleList = roles;
        if (roleList.length === 0) {
            return res.status(404).json({
                success: false,
                message: '角色不存在'
            });
        }
        res.json({
            success: true,
            message: '获取角色成功',
            data: roleList[0]
        });
    }
    catch (error) {
        console.error('获取角色失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});
// 创建角色
router.post('/', async (req, res) => {
    try {
        const { role_name, role_code, description, status, sort_order } = req.body;
        // 验证必填字段
        if (!role_name || !role_code) {
            return res.status(400).json({
                success: false,
                message: '角色名称和角色编码不能为空'
            });
        }
        // 检查角色编码是否已存在
        const [existing] = await database_1.default.query('SELECT id FROM sys_roles WHERE role_code = ?', [role_code]);
        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: '角色编码已存在'
            });
        }
        // 插入角色
        const [result] = await database_1.default.query(`INSERT INTO sys_roles (role_name, role_code, description, status, sort_order) 
       VALUES (?, ?, ?, ?, ?)`, [role_name, role_code, description || null, status || '启用', sort_order || 0]);
        res.status(201).json({
            success: true,
            message: '创建角色成功',
            data: { id: result.insertId }
        });
    }
    catch (error) {
        console.error('创建角色失败:', error);
        const err = error;
        // 处理数据库唯一约束错误
        if (err.code === 'ER_DUP_ENTRY') {
            if (err.sqlMessage.includes('role_name')) {
                return res.status(400).json({
                    success: false,
                    message: '角色名称已存在'
                });
            }
            if (err.sqlMessage.includes('role_code')) {
                return res.status(400).json({
                    success: false,
                    message: '角色编码已存在'
                });
            }
        }
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});
// 更新角色
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { role_name, role_code, description, status, sort_order } = req.body;
        // 验证必填字段
        if (!role_name || !role_code) {
            return res.status(400).json({
                success: false,
                message: '角色名称和角色编码不能为空'
            });
        }
        // 检查角色是否存在
        const [existing] = await database_1.default.query('SELECT id FROM sys_roles WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: '角色不存在'
            });
        }
        // 检查角色编码是否与其他角色冲突
        const [duplicate] = await database_1.default.query('SELECT id FROM sys_roles WHERE role_code = ? AND id != ?', [role_code, id]);
        if (duplicate.length > 0) {
            return res.status(400).json({
                success: false,
                message: '角色编码已存在'
            });
        }
        // 更新角色
        await database_1.default.query(`UPDATE sys_roles 
       SET role_name = ?, role_code = ?, description = ?, status = ?, sort_order = ?
       WHERE id = ?`, [role_name, role_code, description || null, status, sort_order || 0, id]);
        res.json({
            success: true,
            message: '更新角色成功'
        });
    }
    catch (error) {
        console.error('更新角色失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});
// 删除角色
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // 检查角色是否存在
        const [existing] = await database_1.default.query('SELECT id FROM sys_roles WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: '角色不存在'
            });
        }
        // 检查是否有用户关联此角色
        const [users] = await database_1.default.query('SELECT COUNT(*) as count FROM sys_user_roles WHERE role_id = ?', [id]);
        if (users[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: '该角色已关联用户，无法删除'
            });
        }
        // 删除角色
        await database_1.default.query('DELETE FROM sys_roles WHERE id = ?', [id]);
        res.json({
            success: true,
            message: '删除角色成功'
        });
    }
    catch (error) {
        console.error('删除角色失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});
// 修改角色状态
router.put('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status || !['启用', '禁用'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: '状态参数无效'
            });
        }
        await database_1.default.query('UPDATE sys_roles SET status = ? WHERE id = ?', [status, id]);
        res.json({
            success: true,
            message: '修改状态成功'
        });
    }
    catch (error) {
        console.error('修改角色状态失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});
// 获取角色的权限列表
router.get('/:id/permissions', async (req, res) => {
    try {
        const { id } = req.params;
        const [permissions] = await database_1.default.query(`SELECT p.id, p.permission_name, p.permission_code
       FROM sys_permissions p
       INNER JOIN sys_role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = ?`, [id]);
        res.json({
            success: true,
            message: '获取权限列表成功',
            data: permissions
        });
    }
    catch (error) {
        console.error('获取角色权限失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});
// 分配权限给角色
router.put('/:id/permissions', async (req, res) => {
    const connection = await database_1.default.getConnection();
    try {
        const { id } = req.params;
        const { permission_ids } = req.body;
        if (!Array.isArray(permission_ids)) {
            return res.status(400).json({
                success: false,
                message: '权限ID列表格式错误'
            });
        }
        await connection.beginTransaction();
        // 删除原有权限
        await connection.query('DELETE FROM sys_role_permissions WHERE role_id = ?', [id]);
        // 插入新权限
        if (permission_ids.length > 0) {
            const values = permission_ids.map(permId => [id, permId]);
            await connection.query('INSERT INTO sys_role_permissions (role_id, permission_id) VALUES ?', [values]);
        }
        await connection.commit();
        res.json({
            success: true,
            message: '分配权限成功'
        });
    }
    catch (error) {
        await connection.rollback();
        console.error('分配权限失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
    finally {
        connection.release();
    }
});
exports.default = router;
