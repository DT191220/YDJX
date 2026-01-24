// 权限类型定义
export interface Permission {
  id: number;
  permission_name: string;
  permission_code: string;
  permission_type: '菜单' | '按钮' | '接口';
  parent_id: number;
  path?: string;
  icon?: string;
  sort_order: number;
  status: '启用' | '禁用';
  created_at: string;
  updated_at: string;
  children?: Permission[];
}

export interface PermissionFormData {
  permission_name: string;
  permission_code: string;
  permission_type: '菜单' | '按钮' | '接口';
  parent_id: number;
  path?: string;
  icon?: string;
  sort_order: number;
  status: '启用' | '禁用';
}
