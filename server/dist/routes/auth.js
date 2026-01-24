"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = __importDefault(require("../config/database"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// 登录接口
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: '用户名和密码不能为空'
            });
        }
        // 查询用户
        const [users] = await database_1.default.query('SELECT id, username, password, real_name, status FROM sys_users WHERE username = ?', [username]);
        const userList = users;
        if (userList.length === 0) {
            return res.status(401).json({
                success: false,
                message: '用户名或密码错误'
            });
        }
        const user = userList[0];
        // 检查用户状态
        if (user.status !== '启用') {
            return res.status(403).json({
                success: false,
                message: '账号已被禁用'
            });
        }
        // 验证密码
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: '用户名或密码错误'
            });
        }
        // 查询用户角色
        const [roles] = await database_1.default.query(`SELECT r.role_code FROM sys_roles r
       INNER JOIN sys_user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = ? LIMIT 1`, [user.id]);
        const roleList = roles;
        const roleCode = roleList.length > 0 ? roleList[0].role_code : 'USER';
        // 生成token
        const token = (0, auth_1.generateToken)({
            id: user.id,
            username: user.username,
            role: roleCode
        });
        // 更新最后登录时间
        await database_1.default.query('UPDATE sys_users SET last_login_at = NOW() WHERE id = ?', [user.id]);
        res.json({
            success: true,
            message: '登录成功',
            data: {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    realName: user.real_name,
                    role: roleCode
                }
            }
        });
    }
    catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});
// 获取当前用户信息
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: '未提供认证令牌' });
        }
        // 这里应该解析token获取用户信息，简化处理
        res.json({ message: '获取用户信息成功' });
    }
    catch (error) {
        console.error('获取用户信息失败:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});
exports.default = router;
