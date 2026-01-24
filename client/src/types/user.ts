// 用户类型定义
export interface User {
  id: number;
  username: string;
  real_name: string;
  phone?: string;
  email?: string;
  avatar?: string;
  status: '启用' | '禁用';
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  roles?: string; // 角色名称，逗号分隔
}

export interface UserFormData {
  username: string;
  password?: string;
  real_name: string;
  phone?: string;
  email?: string;
  status: '启用' | '禁用';
  role_ids?: number[];
}

export interface UserListParams {
  limit: number;
  offset: number;
  keyword?: string;
  status?: '启用' | '禁用';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
