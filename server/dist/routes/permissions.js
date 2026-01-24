"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const router = (0, express_1.Router)();
// 获取权限树（完整树形结构）
router.get('/tree', async (req, res) => {
    try {
        // 获取所有权限
        const [permissions] = await database_1.default.query(`SELECT id, permission_name, permission_code, permission_type, 
              parent_id, route_path, icon, sort_order, status, 
              created_at, updated_at
       FROM sys_permissions 
       ORDER BY sort_order ASC, id ASC`);
        // 构建树形结构
        const permissionList = permissions;
        const tree = buildTree(permissionList, null);
        res.json({
            success: true,
            message: '获取权限树成功',
            data: tree
        });
    }
    catch (error) {
        console.error('获取权限树失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});
// 获取权限列表（支持分页、搜索）
router.get('/', async (req, res) => {
    try {
        const { limit = '10', offset = '0', keyword = '', permission_type = '', status = '', sortBy = 'sort_order', sortOrder = 'asc' } = req.query;
        const limitNum = parseInt(limit);
        const offsetNum = parseInt(offset);
        // 构建查询条件
        let whereClause = 'WHERE 1=1';
        const params = [];
        if (keyword) {
            whereClause += ' AND (permission_name LIKE ? OR permission_code LIKE ?)';
            const keywordPattern = `%${keyword}%`;
            params.push(keywordPattern, keywordPattern);
        }
        if (permission_type) {
            whereClause += ' AND permission_type = ?';
            params.push(permission_type);
        }
        if (status) {
            whereClause += ' AND status = ?';
            params.push(status);
        }
        // 获取总数
        const [countResult] = await database_1.default.query(`SELECT COUNT(*) as total FROM sys_permissions ${whereClause}`, params);
        const total = countResult[0].total;
        // 获取权限列表
        const orderClause = `ORDER BY ${sortBy} ${sortOrder}`;
        const [permissions] = await database_1.default.query(`SELECT p.*, 
              (SELECT permission_name FROM sys_permissions WHERE id = p.parent_id) as parent_name
       FROM sys_permissions p
       ${whereClause} 
       ${orderClause} 
       LIMIT ? OFFSET ?`, [...params, limitNum, offsetNum]);
        res.json({
            success: true,
            message: '获取权限列表成功',
            data: {
                list: permissions,
                pagination: {
                    total,
                    limit: limitNum,
                    offset: offsetNum
                }
            }
        });
    }
    catch (error) {
        console.error('获取权限列表失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});
// 获取单个权限
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [permissions] = await database_1.default.query('SELECT * FROM sys_permissions WHERE id = ?', [id]);
        const permissionList = permissions;
        if (permissionList.length === 0) {
            return res.status(404).json({
                success: false,
                message: '权限不存在'
            });
        }
        res.json({
            success: true,
            message: '获取权限成功',
            data: permissionList[0]
        });
    }
    catch (error) {
        console.error('获取权限失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});
// 创建权限
router.post('/', async (req, res) => {
    try {
        const { permission_name, permission_code, permission_type, parent_id, route_path, icon, sort_order, status } = req.body;
        // 验证必填字段
        if (!permission_name || !permission_code || !permission_type) {
            return res.status(400).json({
                success: false,
                message: '权限名称、权限编码和权限类型不能为空'
            });
        }
        // 检查权限编码是否已存在
        const [existing] = await database_1.default.query('SELECT id FROM sys_permissions WHERE permission_code = ?', [permission_code]);
        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: '权限编码已存在'
            });
        }
        // 如果有父级，检查父级是否存在
        if (parent_id) {
            const [parent] = await database_1.default.query('SELECT id FROM sys_permissions WHERE id = ?', [parent_id]);
            if (parent.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: '父级权限不存在'
                });
            }
        }
        // 插入权限
        const [result] = await database_1.default.query(`INSERT INTO sys_permissions 
       (permission_name, permission_code, permission_type, parent_id, 
        route_path, icon, sort_order, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
            permission_name,
            permission_code,
            permission_type,
            parent_id || null,
            route_path || null,
            icon || null,
            sort_order || 0,
            status || '启用'
        ]);
        res.status(201).json({
            success: true,
            message: '创建权限成功',
            data: { id: result.insertId }
        });
    }
    catch (error) {
        console.error('创建权限失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});
// 更新权限
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { permission_name, permission_code, permission_type, parent_id, route_path, icon, sort_order, status } = req.body;
        // 验证必填字段
        if (!permission_name || !permission_code || !permission_type) {
            return res.status(400).json({
                success: false,
                message: '权限名称、权限编码和权限类型不能为空'
            });
        }
        // 检查权限是否存在
        const [existing] = await database_1.default.query('SELECT id FROM sys_permissions WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: '权限不存在'
            });
        }
        // 检查权限编码是否与其他权限冲突
        const [duplicate] = await database_1.default.query('SELECT id FROM sys_permissions WHERE permission_code = ? AND id != ?', [permission_code, id]);
        if (duplicate.length > 0) {
            return res.status(400).json({
                success: false,
                message: '权限编码已存在'
            });
        }
        // 如果有父级，检查父级是否存在且不能是自己
        if (parent_id) {
            if (parent_id === parseInt(id)) {
                return res.status(400).json({
                    success: false,
                    message: '不能将自己设置为父级'
                });
            }
            const [parent] = await database_1.default.query('SELECT id FROM sys_permissions WHERE id = ?', [parent_id]);
            if (parent.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: '父级权限不存在'
                });
            }
            // 检查是否会形成循环引用
            if (await hasCircularReference(id, parent_id)) {
                return res.status(400).json({
                    success: false,
                    message: '不能设置为子孙节点的父级，会形成循环引用'
                });
            }
        }
        // 更新权限
        await database_1.default.query(`UPDATE sys_permissions 
       SET permission_name = ?, permission_code = ?, permission_type = ?, 
           parent_id = ?, route_path = ?, icon = ?, sort_order = ?, status = ?
       WHERE id = ?`, [
            permission_name,
            permission_code,
            permission_type,
            parent_id || null,
            route_path || null,
            icon || null,
            sort_order || 0,
            status,
            id
        ]);
        res.json({
            success: true,
            message: '更新权限成功'
        });
    }
    catch (error) {
        console.error('更新权限失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});
// 删除权限
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // 检查权限是否存在
        const [existing] = await database_1.default.query('SELECT id FROM sys_permissions WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: '权限不存在'
            });
        }
        // 检查是否有子权限
        const [children] = await database_1.default.query('SELECT COUNT(*) as count FROM sys_permissions WHERE parent_id = ?', [id]);
        if (children[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: '该权限下有子权限，无法删除'
            });
        }
        // 检查是否有角色关联此权限
        const [roles] = await database_1.default.query('SELECT COUNT(*) as count FROM sys_role_permissions WHERE permission_id = ?', [id]);
        if (roles[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: '该权限已关联角色，无法删除'
            });
        }
        // 删除权限
        await database_1.default.query('DELETE FROM sys_permissions WHERE id = ?', [id]);
        res.json({
            success: true,
            message: '删除权限成功'
        });
    }
    catch (error) {
        console.error('删除权限失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});
// 辅助函数：构建树形结构
function buildTree(list, parentId) {
    const result = [];
    for (const item of list) {
        if (item.parent_id === parentId) {
            const children = buildTree(list, item.id);
            if (children.length > 0) {
                item.children = children;
            }
            result.push(item);
        }
    }
    return result;
}
// 辅助函数：检查是否会形成循环引用
async function hasCircularReference(id, targetParentId) {
    let currentId = targetParentId;
    while (currentId !== null) {
        if (currentId === parseInt(id)) {
            return true;
        }
        const [result] = await database_1.default.query('SELECT parent_id FROM sys_permissions WHERE id = ?', [currentId]);
        const rows = result;
        if (rows.length === 0) {
            break;
        }
        currentId = rows[0].parent_id;
    }
    return false;
}
exports.default = router;
