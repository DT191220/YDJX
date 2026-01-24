import { api } from './api';
import { DictType, DictData, DictTypeFormData, DictDataFormData } from '../types/dict';

export const dictService = {
  // 字典类型
  getDictTypes: (params: { 
    limit: number; 
    offset: number; 
    keyword?: string; 
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    const query = new URLSearchParams();
    query.append('limit', params.limit.toString());
    query.append('offset', params.offset.toString());
    if (params.keyword) query.append('keyword', params.keyword);
    if (params.status) query.append('status', params.status);
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.sortOrder) query.append('sortOrder', params.sortOrder);
    return api.get<{ list: DictType[]; pagination: { total: number; limit: number; offset: number } }>(`/dicts/types?${query.toString()}`);
  },

  getDictTypeById: (id: number) => api.get<DictType>(`/dicts/types/${id}`),

  createDictType: (data: DictTypeFormData) =>
    api.post<DictType>('/dicts/types', data),

  updateDictType: (id: number, data: DictTypeFormData) =>
    api.put<DictType>(`/dicts/types/${id}`, data),

  deleteDictType: (id: number) => api.delete(`/dicts/types/${id}`),

  // 字典数据
  getDictData: (dictTypeId: number) => {
    return api.get<DictData[]>(`/dicts/types/${dictTypeId}/data`);
  },

  // 根据字典类型标识获取字典数据（供组件使用）
  getDictByType: (dictType: string) => {
    return api.get<DictData[]>(`/dicts/by-type/${dictType}`);
  },

  getDictDataById: (id: number) => api.get<DictData>(`/dicts/data/${id}`),

  createDictData: (data: DictDataFormData) =>
    api.post<DictData>('/dicts/data', data),

  updateDictData: (id: number, data: DictDataFormData) =>
    api.put<DictData>(`/dicts/data/${id}`, data),

  deleteDictData: (id: number) => api.delete(`/dicts/data/${id}`),
};
