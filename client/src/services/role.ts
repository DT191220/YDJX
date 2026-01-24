import { api } from './api';
import { Role, RoleFormData, RoleListParams } from '../types/role';

export const roleService = {
  getRoles: (params: RoleListParams) => {
    const query = new URLSearchParams();
    query.append('limit', params.limit.toString());
    query.append('offset', params.offset.toString());
    if (params.keyword) query.append('keyword', params.keyword);
    if (params.status) query.append('status', params.status);
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.sortOrder) query.append('sortOrder', params.sortOrder);
    
    return api.get<{ list: Role[], pagination: { total: number, limit: number, offset: number } }>(`/roles?${query.toString()}`);
  },

  getRole: (id: number) => api.get<Role>(`/roles/${id}`),

  createRole: (data: RoleFormData) => api.post<{ id: number }>('/roles', data),

  updateRole: (id: number, data: RoleFormData) =>
    api.put(`/roles/${id}`, data),

  deleteRole: (id: number) => api.delete(`/roles/${id}`),

  updateRoleStatus: (id: number, status: string) =>
    api.put(`/roles/${id}/status`, { status }),

  getRolePermissions: (id: number) => api.get(`/roles/${id}/permissions`),

  assignPermissions: (id: number, permissionIds: number[]) =>
    api.put(`/roles/${id}/permissions`, { permission_ids: permissionIds }),
};
