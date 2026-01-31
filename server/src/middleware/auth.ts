import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// JWT密钥必须从环境变量读取，生产环境不允许使用默认值
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('[安全警告] JWT_SECRET 环境变量未设置！');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('生产环境必须设置 JWT_SECRET 环境变量');
  }
}
const SECRET_KEY = JWT_SECRET || 'dev_only_secret_key_not_for_production';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: '未提供认证令牌' });
    }

    const decoded = jwt.verify(token, SECRET_KEY) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: '无效的认证令牌' });
  }
};

export const generateToken = (user: { id: number; username: string; role: string }) => {
  return jwt.sign(user, SECRET_KEY, { expiresIn: '24h' });
};
