import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function initDatabase() {
  try {
    // 先连接到MySQL服务器（不指定数据库）
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });

    console.log('已连接到MySQL服务器');

    // 读取SQL文件
    const sqlFilePath = path.join(__dirname, '../../../database/init.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // 执行SQL脚本
    await connection.query(sqlContent);
    console.log('数据库初始化成功！');

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  }
}

initDatabase();
