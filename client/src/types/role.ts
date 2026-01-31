// 角色类型定义
export interface Role {
  id: number;
  role_name: string;
  role_code: string;
  description?: string;
  status: '启用' | '禁用';
  sort_order?: number;
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
  sort_order?: number;
  permission_ids?: number[];
}

export interface RoleListParams {
  limit: number;
  offset: number;
  keyword?: string;
  status?: '启用' | '禁用' | '';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
