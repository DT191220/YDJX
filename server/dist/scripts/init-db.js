"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promise_1 = __importDefault(require("mysql2/promise"));
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
async function initDatabase() {
    try {
        // 先连接到MySQL服务器（不指定数据库）
        const connection = await promise_1.default.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '3306'),
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            multipleStatements: true
        });
        console.log('已连接到MySQL服务器');
        // 读取SQL文件
        const sqlFilePath = path_1.default.join(__dirname, '../../../database/init.sql');
        const sqlContent = fs_1.default.readFileSync(sqlFilePath, 'utf8');
        // 执行SQL脚本
        await connection.query(sqlContent);
        console.log('数据库初始化成功！');
        await connection.end();
        process.exit(0);
    }
    catch (error) {
        console.error('数据库初始化失败:', error);
        process.exit(1);
    }
}
initDatabase();
