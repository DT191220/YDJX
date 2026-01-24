"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// 获取用户列表
router.get('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const { limit = '10', offset = '0', keyword, status, sortBy = 'created_at', sortOrder = 'desc' } = req.query;
        const params = [];
        let whereClause = 'WHERE 1=1';
        if (keyword) {
            whereClause += ' AND (u.username LIKE ? OR u.real_name LIKE ? OR u.phone LIKE ?)';
            const keywordPattern = `%${keyword}%`;
            params.push(keywordPattern, keywordPattern, keywordPattern);
        }
        if (status) {
            whereClause += ' AND u.status = ?';
            params.push(status);
        }
        // 获取总数
        const [countResult] = await database_1.default.query(`SELECT COUNT(DISTINCT u.id) as total FROM sys_users u ${whereClause}`, params);
        const total = countResult[0].total;
        // 获取列表
        const orderClause = `ORDER BY u.${sortBy} ${sortOrder}`;
        params.push(Number(limit), Number(offset));
        const [users] = await database_1.default.query(`SELECT 
        u.id, u.username, u.real_name, u.phone, u.email, 
        u.status, u.created_at, u.last_login_at,
        GROUP_CONCAT(r.role_name) as roles
      FROM sys_users u
      LEFT JOIN sys_user_roles ur ON u.id = ur.user_id
      LEFT JOIN sys_roles r ON ur.role_id = r.id
      ${whereClause}
      GROUP BY u.id
      ${orderClause}
      LIMIT ? OFFSET ?`, params);
        res.json({
            success: true,
            data: users,
            pagination: {
                total,
                limit: Number(limit),
                offset: Number(offset),
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('获取用户列表失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});
// 获取单个用户
router.get('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const [users] = await database_1.default.query('SELECT id, username, real_name, phone, email, avatar, status, created_at, updated_at, last_login_at FROM sys_users WHERE id = ?', [id]);
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }
        res.json({ success: true, data: users[0] });
    }
    catch (error) {
        console.error('获取用户失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});
// 创建用户
router.post('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const { username, password, real_name, phone, email, status = '启用', role_ids } = req.body;
        if (!username || !password || !real_name) {
            return res.status(400).json({ success: false, message: '用户名、密码和真实姓名不能为空' });
        }
        // 检查用户名是否已存在
        const [existing] = await database_1.default.query('SELECT id FROM sys_users WHERE username = ?', [username]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: '用户名已存在' });
        }
        // 加密密码
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const connection = await database_1.default.getConnection();
        try {
            await connection.beginTransaction();
            // 插入用户
            const [result] = await connection.query('INSERT INTO sys_users (username, password, real_name, phone, email, status) VALUES (?, ?, ?, ?, ?, ?)', [username, hashedPassword, real_name, phone, email, status]);
            const userId = result.insertId;
            // 分配角色
            if (role_ids && role_ids.length > 0) {
                const roleValues = role_ids.map((roleId) => [userId, roleId]);
                await connection.query('INSERT INTO sys_user_roles (user_id, role_id) VALUES ?', [roleValues]);
            }
            await connection.commit();
            res.json({ success: true, message: '用户创建成功', data: { id: userId } });
        }
        catch (error) {
            await connection.rollback();
            throw error;
        }
        finally {
            connection.release();
        }
    }
    catch (error) {
        console.error('创建用户失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});
// 更新用户
router.put('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { real_name, phone, email, status, password, role_ids } = req.body;
        const connection = await database_1.default.getConnection();
        try {
            await connection.beginTransaction();
            const updates = [];
            const params = [];
            if (real_name) {
                updates.push('real_name = ?');
                params.push(real_name);
            }
            if (phone !== undefined) {
                updates.push('phone = ?');
                params.push(phone);
            }
            if (email !== undefined) {
                updates.push('email = ?');
                params.push(email);
            }
            if (status) {
                updates.push('status = ?');
                params.push(status);
            }
            if (password) {
                const hashedPassword = await bcryptjs_1.default.hash(password, 10);
                updates.push('password = ?');
                params.push(hashedPassword);
            }
            if (updates.length > 0) {
                params.push(id);
                await connection.query(`UPDATE sys_users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, params);
            }
            // 更新角色
            if (role_ids !== undefined) {
                await connection.query('DELETE FROM sys_user_roles WHERE user_id = ?', [id]);
                if (role_ids.length > 0) {
                    const roleValues = role_ids.map((roleId) => [id, roleId]);
                    await connection.query('INSERT INTO sys_user_roles (user_id, role_id) VALUES ?', [roleValues]);
                }
            }
            await connection.commit();
            res.json({ success: true, message: '用户更新成功' });
        }
        catch (error) {
            await connection.rollback();
            throw error;
        }
        finally {
            connection.release();
        }
    }
    catch (error) {
        console.error('更新用户失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});
// 删除用户
router.delete('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        await database_1.default.query('DELETE FROM sys_users WHERE id = ?', [id]);
        res.json({ success: true, message: '用户删除成功' });
    }
    catch (error) {
        console.error('删除用户失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});
// 更新用户状态
router.put('/:id/status', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        await database_1.default.query('UPDATE sys_users SET status = ?, updated_at = NOW() WHERE id = ?', [status, id]);
        res.json({ success: true, message: '状态更新成功' });
    }
    catch (error) {
        console.error('更新状态失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});
// 获取用户角色
router.get('/:id/roles', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const [roles] = await database_1.default.query(`SELECT r.* FROM sys_roles r
       INNER JOIN sys_user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = ?`, [id]);
        res.json({ success: true, data: roles });
    }
    catch (error) {
        console.error('获取用户角色失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});
// 分配用户角色
router.put('/:id/roles', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { role_ids } = req.body;
        const connection = await database_1.default.getConnection();
        try {
            await connection.beginTransaction();
            await connection.query('DELETE FROM sys_user_roles WHERE user_id = ?', [id]);
            if (role_ids && role_ids.length > 0) {
                const roleValues = role_ids.map((roleId) => [id, roleId]);
                await connection.query('INSERT INTO sys_user_roles (user_id, role_id) VALUES ?', [roleValues]);
            }
            await connection.commit();
            res.json({ success: true, message: '角色分配成功' });
        }
        catch (error) {
            await connection.rollback();
            throw error;
        }
        finally {
            connection.release();
        }
    }
    catch (error) {
        console.error('分配角色失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});
exports.default = router;
