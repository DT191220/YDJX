import { api } from './api';
import { SalaryConfig, SalaryConfigFormData, CoachMonthlySalary, CoachMonthlySalaryFormData } from '../types/salary';

interface PaginationParams {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface SalaryConfigListParams extends PaginationParams {
  config_type?: string;
  keyword?: string;
}

interface CoachSalaryListParams extends PaginationParams {
  salary_month?: string;
  coach_name?: string;
  status?: string;
}

// 工资配置相关API
export const salaryConfigService = {
  // 获取工资配置列表
  getSalaryConfigs: (params: SalaryConfigListParams) => {
    return api.get<{
      list: SalaryConfig[];
      pagination: { total: number; limit: number; offset: number };
    }>('/salary-config', { params });
  },

  // 获取当前有效配置
  getCurrentConfig: (month?: string) => {
    return api.get<SalaryConfig[]>('/salary-config/current', { 
      params: month ? { month } : undefined 
    });
  },

  // 创建工资配置
  createSalaryConfig: (data: SalaryConfigFormData) => {
    return api.post<{ id: number }>('/salary-config', data);
  },

  // 更新工资配置
  updateSalaryConfig: (id: number, data: SalaryConfigFormData) => {
    return api.put(`/salary-config/${id}`, data);
  },

  // 删除工资配置
  deleteSalaryConfig: (id: number) => {
    return api.delete(`/salary-config/${id}`);
  }
};

// 教练工资相关API
export const coachSalaryService = {
  // 获取教练工资列表
  getCoachSalaries: (params: CoachSalaryListParams) => {
    return api.get<{
      list: CoachMonthlySalary[];
      pagination: { total: number; limit: number; offset: number };
    }>('/coach-salary', params);
  },

  // 生成指定月份的工资数据
  generateSalary: (salary_month: string) => {
    return api.post<{ generated: number }>('/coach-salary/generate', { salary_month });
  },

  // 刷新指定月份的工资数据
  refreshSalary: (salary_month: string) => {
    return api.post<{ refreshed: number }>('/coach-salary/refresh', { salary_month });
  },

  // 批量删除指定月份的工资数据
  batchDeleteSalary: (salary_month: string) => {
    return api.delete<{ deleted: number }>(`/coach-salary/batch?salary_month=${salary_month}`);
  },

  // 更新工资记录
  updateCoachSalary: (id: number, data: CoachMonthlySalaryFormData) => {
    return api.put(`/coach-salary/${id}`, data);
  },

  // 删除工资记录
  deleteCoachSalary: (id: number) => {
    return api.delete(`/coach-salary/${id}`);
  }
};
