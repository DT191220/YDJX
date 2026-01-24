import { Coach, CoachFormData, CoachQueryParams } from '../types/coach';
import { get, post, put, del } from './api';

export const coachService = {
  // 获取教练列表
  getCoaches: (params: CoachQueryParams) => {
    return get<{ list: Coach[]; pagination: { total: number; limit: number; offset: number } }>(
      '/coaches',
      params
    );
  },

  // 获取单个教练详情
  getCoach: (id: number) => {
    return get<Coach>(`/coaches/${id}`);
  },

  // 创建教练
  createCoach: (data: CoachFormData) => {
    return post<{ id: number }>('/coaches', data);
  },

  // 更新教练信息
  updateCoach: (id: number, data: CoachFormData) => {
    return put(`/coaches/${id}`, data);
  },

  // 删除教练
  deleteCoach: (id: number) => {
    return del(`/coaches/${id}`);
  }
};
