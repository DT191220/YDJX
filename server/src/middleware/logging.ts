import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// 请求日志中间件
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // 记录请求信息
  const requestInfo = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('User-Agent'),
  };
  
  logger.info(`请求开始: ${req.method} ${req.originalUrl}`, requestInfo);
  
  // 监听响应完成事件
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const responseInfo = {
      ...requestInfo,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    };
    
    if (res.statusCode >= 400) {
      logger.warn(`请求完成: ${req.method} ${req.originalUrl} ${res.statusCode}`, responseInfo);
    } else {
      logger.info(`请求完成: ${req.method} ${req.originalUrl} ${res.statusCode}`, responseInfo);
    }
  });
  
  next();
};

// 全局错误处理中间件
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // 记录错误
  logger.error(`服务器错误: ${req.method} ${req.originalUrl}`, {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });
  
  // 返回错误响应
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? '服务器内部错误' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

// 404 处理中间件
export const notFoundHandler = (req: Request, res: Response): void => {
  logger.warn(`404 未找到: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: '请求的资源不存在',
    path: req.originalUrl,
  });
};

export default { requestLogger, errorHandler, notFoundHandler };
