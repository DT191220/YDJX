"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../config/database"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function updateAdminPassword() {
    try {
        const connection = await database_1.default.getConnection();
        console.log('已连接到数据库');
        const password = 'admin123';
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        await connection.query('UPDATE sys_users SET password = ? WHERE username = ?', [hashedPassword, 'admin']);
        console.log('管理员密码更新成功！');
        console.log('用户名: admin');
        console.log('密码: admin123');
        connection.release();
        process.exit(0);
    }
    catch (error) {
        console.error('密码更新失败:', error);
        process.exit(1);
    }
}
updateAdminPassword();
