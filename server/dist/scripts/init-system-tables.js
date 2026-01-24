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
async function initSystemTables() {
    try {
        const connection = await promise_1.default.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '3306'),
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'yuandong_driving_school',
            multipleStatements: true
        });
        console.log('已连接到数据库');
        const sqlFilePath = path_1.default.join(__dirname, '../../../database/system-tables.sql');
        const sqlContent = fs_1.default.readFileSync(sqlFilePath, 'utf8');
        await connection.query(sqlContent);
        console.log('系统管理表初始化成功！');
        await connection.end();
        process.exit(0);
    }
    catch (error) {
        console.error('系统管理表初始化失败:', error);
        process.exit(1);
    }
}
initSystemTables();
