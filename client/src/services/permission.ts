import { api } from './api';
import { Permission, PermissionFormData } from '../types/permission';

export const permissionService = {
  getPermissions: () => api.get<Permission[]>('/permissions'),

  getPermissionTree: () => api.get<Permission[]>('/permissions/tree'),

  getPermission: (id: number) => api.get<Permission>(`/permissions/${id}`),

  createPermission: (data: PermissionFormData) =>
    api.post<{ id: number }>('/permissions', data),

  updatePermission: (id: number, data: PermissionFormData) =>
    api.put(`/permissions/${id}`, data),

  deletePermission: (id: number) => api.delete(`/permissions/${id}`),
};
