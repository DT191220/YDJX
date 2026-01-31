"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_js_1 = __importDefault(require("crypto-js"));
const database_1 = __importDefault(require("../config/database"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// 加密密钥从环境变量读取（与前端保持一致）
const ENCRYPT_KEY = process.env.ENCRYPT_KEY || 'YuanDongDrivingSchool2024!@#';
if (!process.env.ENCRYPT_KEY && process.env.NODE_ENV === 'production') {
    console.warn('[安全警告] ENCRYPT_KEY 环境变量未设置，使用默认值');
}
// 解密密码
function decryptPassword(encryptedData) {
    try {
        const key = crypto_js_1.default.enc.Utf8.parse(ENCRYPT_KEY.padEnd(32, '0').slice(0, 32));
        const iv = crypto_js_1.default.enc.Utf8.parse(ENCRYPT_KEY.slice(0, 16).padEnd(16, '0'));
        const decrypted = crypto_js_1.default.AES.decrypt(encryptedData, key, {
            iv: iv,
            mode: crypto_js_1.default.mode.CBC,
            padding: crypto_js_1.default.pad.Pkcs7
        });
        const decryptedStr = decrypted.toString(crypto_js_1.default.enc.Utf8);
        if (!decryptedStr) {
            return null;
        }
        return JSON.parse(decryptedStr);
    }
    catch (error) {
        console.error('密码解密失败:', error);
        return null;
    }
}
// 登录接口
router.post('/login', async (req, res) => {
    try {
        const { username, password, timestamp } = req.body;
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: '用户名和密码不能为空'
            });
        }
        // 解密密码
        let plainPassword = password;
        // 如果提供了时间戳，说明是加密后的密码
        if (timestamp) {
            const decrypted = decryptPassword(password);
            if (!decrypted) {
                return res.status(400).json({
                    success: false,
                    message: '密码解密失败，请重试'
                });
            }
            // 验证时间戳（5分钟内有效，防止重放攻击）
            const now = Date.now();
            const timeDiff = Math.abs(now - decrypted.timestamp);
            if (timeDiff > 5 * 60 * 1000) {
                return res.status(400).json({
                    success: false,
                    message: '请求已过期，请重新登录'
                });
            }
            plainPassword = decrypted.password;
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
        const isPasswordValid = await bcryptjs_1.default.compare(plainPassword, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: '用户名或密码错误'
            });
        }
        // 查询用户角色
        const [roles] = await database_1.default.query(`SELECT r.role_code, r.role_name FROM sys_roles r
       INNER JOIN sys_user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = ? LIMIT 1`, [user.id]);
        const roleList = roles;
        const roleCode = roleList.length > 0 ? roleList[0].role_code : 'USER';
        const roleName = roleList.length > 0 ? roleList[0].role_name : '普通用户';
        // 查询用户权限（通过角色关联）
        const [permissions] = await database_1.default.query(`SELECT DISTINCT p.permission_code 
       FROM sys_permissions p
       INNER JOIN sys_role_permissions rp ON p.id = rp.permission_id
       INNER JOIN sys_user_roles ur ON rp.role_id = ur.role_id
       WHERE ur.user_id = ? AND p.status = '启用'`, [user.id]);
        const permissionCodes = permissions.map(p => p.permission_code);
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
                    role: roleCode,
                    roleName: roleName
                },
                permissions: permissionCodes
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
