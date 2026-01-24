import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function initSystemTables() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'yuandong_driving_school',
      multipleStatements: true
    });

    console.log('已连接到数据库');

    const sqlFilePath = path.join(__dirname, '../../../database/system-tables.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    await connection.query(sqlContent);
    console.log('系统管理表初始化成功！');

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('系统管理表初始化失败:', error);
    process.exit(1);
  }
}

initSystemTables();
