"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// JWT密钥必须从环境变量读取，生产环境不允许使用默认值
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('[安全警告] JWT_SECRET 环境变量未设置！');
    if (process.env.NODE_ENV === 'production') {
        throw new Error('生产环境必须设置 JWT_SECRET 环境变量');
    }
}
const SECRET_KEY = JWT_SECRET || 'dev_only_secret_key_not_for_production';
const authMiddleware = (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: '未提供认证令牌' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(401).json({ message: '无效的认证令牌' });
    }
};
exports.authMiddleware = authMiddleware;
const generateToken = (user) => {
    return jsonwebtoken_1.default.sign(user, SECRET_KEY, { expiresIn: '24h' });
};
exports.generateToken = generateToken;
