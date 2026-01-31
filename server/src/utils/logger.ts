import fs from 'fs';
import path from 'path';

// 日志级别
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// 日志配置
const LOG_DIR = process.env.LOG_DIR || './logs';
const LOG_LEVEL = (process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')) as LogLevel;
const LOG_TO_FILE = process.env.LOG_TO_FILE !== 'false';
const LOG_RETENTION_DAYS = parseInt(process.env.LOG_RETENTION_DAYS || '30', 10);
const LOG_MAX_SIZE_MB = parseInt(process.env.LOG_MAX_SIZE_MB || '100', 10);
const LOG_MAX_SIZE_BYTES = LOG_MAX_SIZE_MB * 1024 * 1024;

// 确保日志目录存在
if (LOG_TO_FILE && !fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// 日志级别优先级
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// 格式化日期
function formatDate(date: Date): string {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

// 获取日志文件名
function getLogFileName(level: LogLevel, index: number = 0): string {
  const date = new Date().toISOString().split('T')[0];
  const suffix = index > 0 ? `.${index}` : '';
  return path.join(LOG_DIR, `${level}-${date}${suffix}.log`);
}

// 检查文件大小并获取可用文件名
function getAvailableLogFile(level: LogLevel): string {
  let index = 0;
  let fileName = getLogFileName(level, index);
  
  while (fs.existsSync(fileName)) {
    try {
      const stats = fs.statSync(fileName);
      if (stats.size < LOG_MAX_SIZE_BYTES) {
        return fileName;
      }
      index++;
      fileName = getLogFileName(level, index);
    } catch {
      return fileName;
    }
  }
  
  return fileName;
}

// 清理过期日志
function cleanupOldLogs(): void {
  if (!LOG_TO_FILE || !fs.existsSync(LOG_DIR)) return;
  
  try {
    const files = fs.readdirSync(LOG_DIR);
    const now = Date.now();
    const maxAge = LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    
    files.forEach(file => {
      if (!file.endsWith('.log')) return;
      
      const filePath = path.join(LOG_DIR, file);
      try {
        const stats = fs.statSync(filePath);
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          console.log(`[Logger] 已清理过期日志: ${file}`);
        }
      } catch {
        // 忽略单个文件错误
      }
    });
  } catch (err) {
    console.error('清理日志失败:', err);
  }
}

// 启动时清理一次过期日志
if (LOG_TO_FILE) {
  cleanupOldLogs();
  // 每天定时清理
  setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000);
}

// 写入日志文件
function writeToFile(level: LogLevel, message: string): void {
  if (!LOG_TO_FILE) return;
  
  const fileName = getAvailableLogFile(level);
  const logLine = `${message}\n`;
  
  fs.appendFile(fileName, logLine, (err) => {
    if (err) {
      console.error('写入日志文件失败:', err);
    }
  });
}

// 格式化日志消息
function formatMessage(level: LogLevel, message: string, meta?: Record<string, any>): string {
  const timestamp = formatDate(new Date());
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

// 判断是否应该记录该级别的日志
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[LOG_LEVEL];
}

// 日志对象
export const logger = {
  debug(message: string, meta?: Record<string, any>): void {
    if (!shouldLog('debug')) return;
    const formatted = formatMessage('debug', message, meta);
    console.debug(formatted);
    writeToFile('debug', formatted);
  },

  info(message: string, meta?: Record<string, any>): void {
    if (!shouldLog('info')) return;
    const formatted = formatMessage('info', message, meta);
    console.info(formatted);
    writeToFile('info', formatted);
  },

  warn(message: string, meta?: Record<string, any>): void {
    if (!shouldLog('warn')) return;
    const formatted = formatMessage('warn', message, meta);
    console.warn(formatted);
    writeToFile('warn', formatted);
  },

  error(message: string, error?: Error | Record<string, any>): void {
    if (!shouldLog('error')) return;
    const meta = error instanceof Error 
      ? { message: error.message, stack: error.stack }
      : error;
    const formatted = formatMessage('error', message, meta);
    console.error(formatted);
    writeToFile('error', formatted);
  },
};

export default logger;
