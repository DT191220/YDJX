import pool from '../config/database';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function updateAdminPassword() {
  try {
    const connection = await pool.getConnection();
    console.log('已连接到数据库');

    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await connection.query(
      'UPDATE sys_users SET password = ? WHERE username = ?',
      [hashedPassword, 'admin']
    );
    
    console.log('管理员密码更新成功！');
    console.log('用户名: admin');
    console.log('密码: admin123');
    
    connection.release();
    process.exit(0);
  } catch (error) {
    console.error('密码更新失败:', error);
    process.exit(1);
  }
}

updateAdminPassword();
