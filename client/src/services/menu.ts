import { api } from './api';

// 菜单类型定义
export interface Menu {
  id: number;
  menu_name: string;
  menu_path: string | null;
  permission_code: string | null;
  parent_id: number;
  menu_type: 'group' | 'menu';
  icon: string | null;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  children?: Menu[];
}

export interface MenuFormData {
  menu_name: string;
  menu_path?: string;
  permission_code?: string;
  parent_id?: number;
  menu_type: 'group' | 'menu';
  icon?: string;
  sort_order?: number;
  is_visible?: boolean;
}

export const menuService = {
  // 获取菜单列表（树形结构）
  getMenus: (flat?: boolean) =>
    api.get<Menu[]>('/menus', flat ? { flat: 'true' } : undefined),

  // 根据用户权限获取菜单
  getUserMenus: (permissions: string[]) =>
    api.get<Menu[]>('/menus/user-menus', { permissions: permissions.join(',') }),

  // 获取单个菜单
  getMenu: (id: number) =>
    api.get<Menu>(`/menus/${id}`),

  // 创建菜单
  createMenu: (data: MenuFormData) =>
    api.post<{ id: number }>('/menus', data),

  // 更新菜单
  updateMenu: (id: number, data: Partial<MenuFormData>) =>
    api.put(`/menus/${id}`, data),

  // 删除菜单
  deleteMenu: (id: number) =>
    api.delete(`/menus/${id}`),

  // 批量更新排序
  batchUpdateSort: (items: { id: number; sort_order: number; parent_id: number }[]) =>
    api.put('/menus/batch/sort', { items }),
};

export default menuService;
