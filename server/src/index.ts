import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/database';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import roleRoutes from './routes/roles';
import permissionRoutes from './routes/permissions';
import dictRoutes from './routes/dicts';
import studentRoutes from './routes/students';
import classTypeRoutes from './routes/classTypes';
import paymentRoutes from './routes/payments';
import serviceConfigRoutes from './routes/serviceConfigs';
import examVenueRoutes from './routes/examVenues';
import examScheduleRoutes from './routes/examSchedules';
import studentProgressRoutes from './routes/studentProgress';
import studyPlanRoutes from './routes/studyPlans';
import examRegistrationRoutes from './routes/examRegistrations';
import examWarningRoutes from './routes/examWarnings';
import coachRoutes from './routes/coaches';
import salaryConfigRoutes from './routes/salaryConfig';
import coachSalaryRoutes from './routes/coachSalary';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 设置响应头字符编码
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/dicts', dictRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/class-types', classTypeRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/service-configs', serviceConfigRoutes);
app.use('/api/exam-venues', examVenueRoutes);
app.use('/api/exam-schedules', examScheduleRoutes);
app.use('/api/student-progress', studentProgressRoutes);
app.use('/api/study-plans', studyPlanRoutes);
app.use('/api/exam-registrations', examRegistrationRoutes);
app.use('/api/exam-warnings', examWarningRoutes);
app.use('/api/coaches', coachRoutes);
app.use('/api/salary-config', salaryConfigRoutes);
app.use('/api/coach-salary', coachSalaryRoutes);

// 健康检查接口
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '驾校通后端服务运行正常' });
});

// 测试数据库连接
app.get('/api/db-test', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.query('SELECT 1');
    connection.release();
    res.json({ status: 'ok', message: '数据库连接成功' });
  } catch (error) {
    console.error('数据库连接失败:', error);
    res.status(500).json({ 
      status: 'error', 
      message: '数据库连接失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

export default app;
