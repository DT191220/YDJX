import CryptoJS from 'crypto-js';
import { api } from './api';
import { User, UserFormData, UserListParams } from '../types/user';

// 加密密钥（与后端保持一致）
const ENCRYPT_KEY = 'YuanDongDrivingSchool2024!@#';

// 加密密码
function encryptPassword(password: string): string {
  const timestamp = Date.now();
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

export const userService = {
  getList: (params: UserListParams) => {
    const query = new URLSearchParams();
    query.append('limit', params.limit.toString());
    query.append('offset', params.offset.toString());
    if (params.keyword) query.append('keyword', params.keyword);
    if (params.status) query.append('status', params.status);
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.sortOrder) query.append('sortOrder', params.sortOrder);
    
    return api.get<User[]>(`/users?${query.toString()}`);
  },

  getById: (id: number) => api.get<User>(`/users/${id}`),

  create: (data: UserFormData) => {
    const payload = { ...data };
    if (payload.password) {
      payload.password = encryptPassword(payload.password);
      (payload as any).passwordEncrypted = true;
    }
    return api.post<User>('/users', payload);
  },

  update: (id: number, data: UserFormData) => {
    const payload = { ...data };
    if (payload.password) {
      payload.password = encryptPassword(payload.password);
      (payload as any).passwordEncrypted = true;
    }
    return api.put<User>(`/users/${id}`, payload);
  },

  delete: (id: number) => api.delete(`/users/${id}`),

  updateStatus: (id: number, status: '启用' | '禁用') =>
    api.put(`/users/${id}/status`, { status }),

  getRoles: (id: number) => api.get(`/users/${id}/roles`),

  assignRoles: (id: number, roleIds: number[]) =>
    api.put(`/users/${id}/roles`, { role_ids: roleIds }),
};
