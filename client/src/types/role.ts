// 角色类型定义
export interface Role {
  id: number;
  role_name: string;
  role_code: string;
  description?: string;
  status: '启用' | '禁用';
  created_at: string;
  updated_at: string;
  permission_count?: number;
  user_count?: number;
}

export interface RoleFormData {
  role_name: string;
  role_code: string;
  description?: string;
  status: '启用' | '禁用';
  permission_ids?: number[];
}

export interface RoleListParams {
  limit: number;
  offset: number;
  keyword?: string;
  status?: '启用' | '禁用';
}
