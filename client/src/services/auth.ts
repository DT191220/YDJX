import CryptoJS from 'crypto-js';
import { api } from './api';

// 加密密钥（与后端保持一致）
const ENCRYPT_KEY = 'YuanDongDrivingSchool2024!@#';

// 加密密码
function encryptPassword(password: string, timestamp: number): string {
  // 使用时间戳作为盐值，增加安全性
  const data = JSON.stringify({ password, timestamp });
  const key = CryptoJS.enc.Utf8.parse(ENCRYPT_KEY.padEnd(32, '0').slice(0, 32));
  const iv = CryptoJS.enc.Utf8.parse(ENCRYPT_KEY.slice(0, 16).padEnd(16, '0'));
  
  const encrypted = CryptoJS.AES.encrypt(data, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  
  return encrypted.toString();
}

export interface LoginParams {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    username: string;
    realName: string;
    role: string;
  };
  permissions?: string[];
}

export const authService = {
  login: (params: LoginParams) => {
    const timestamp = Date.now();
    const encryptedPassword = encryptPassword(params.password, timestamp);
    
    return api.post<LoginResponse>('/auth/login', {
      username: params.username,
      password: encryptedPassword,
      timestamp
    });
  },

  getCurrentUser: () => api.get('/auth/me'),
};
