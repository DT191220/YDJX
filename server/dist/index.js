"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = __importDefault(require("./config/database"));
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const roles_1 = __importDefault(require("./routes/roles"));
const permissions_1 = __importDefault(require("./routes/permissions"));
const dicts_1 = __importDefault(require("./routes/dicts"));
const students_1 = __importDefault(require("./routes/students"));
const classTypes_1 = __importDefault(require("./routes/classTypes"));
const payments_1 = __importDefault(require("./routes/payments"));
const serviceConfigs_1 = __importDefault(require("./routes/serviceConfigs"));
const examVenues_1 = __importDefault(require("./routes/examVenues"));
const examSchedules_1 = __importDefault(require("./routes/examSchedules"));
const studentProgress_1 = __importDefault(require("./routes/studentProgress"));
const studyPlans_1 = __importDefault(require("./routes/studyPlans"));
const examRegistrations_1 = __importDefault(require("./routes/examRegistrations"));
const examWarnings_1 = __importDefault(require("./routes/examWarnings"));
const coaches_1 = __importDefault(require("./routes/coaches"));
const salaryConfig_1 = __importDefault(require("./routes/salaryConfig"));
const coachSalary_1 = __importDefault(require("./routes/coachSalary"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// 中间件
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// 设置响应头字符编码
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});
// 路由
app.use('/api/auth', auth_1.default);
app.use('/api/users', users_1.default);
app.use('/api/roles', roles_1.default);
app.use('/api/permissions', permissions_1.default);
app.use('/api/dicts', dicts_1.default);
app.use('/api/students', students_1.default);
app.use('/api/class-types', classTypes_1.default);
app.use('/api/payments', payments_1.default);
app.use('/api/service-configs', serviceConfigs_1.default);
app.use('/api/exam-venues', examVenues_1.default);
app.use('/api/exam-schedules', examSchedules_1.default);
app.use('/api/student-progress', studentProgress_1.default);
app.use('/api/study-plans', studyPlans_1.default);
app.use('/api/exam-registrations', examRegistrations_1.default);
app.use('/api/exam-warnings', examWarnings_1.default);
app.use('/api/coaches', coaches_1.default);
app.use('/api/salary-config', salaryConfig_1.default);
app.use('/api/coach-salary', coachSalary_1.default);
// 健康检查接口
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: '驾校通后端服务运行正常' });
});
// 测试数据库连接
app.get('/api/db-test', async (req, res) => {
    try {
        const connection = await database_1.default.getConnection();
        await connection.query('SELECT 1');
        connection.release();
        res.json({ status: 'ok', message: '数据库连接成功' });
    }
    catch (error) {
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
exports.default = app;
