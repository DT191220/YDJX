import { api } from './api';
import { 
  ExpenseConfig, 
  ExpenseConfigFormData, 
  MonthlyExpense, 
  MonthlyExpenseListParams,
  ExpenseSubject 
} from '../types/operationExpense';

export const operationExpenseService = {
  // ========== 支出配置 ==========
  
  // 获取支出配置列表
  getConfigs: (isActive?: boolean) => {
    const params = isActive !== undefined ? `?is_active=${isActive}` : '';
    return api.get<ExpenseConfig[]>(`/operation-expense/configs${params}`);
  },

  // 获取可用的支出科目列表
  getExpenseSubjects: () => {
    return api.get<ExpenseSubject[]>('/operation-expense/expense-subjects');
  },

  // 新增支出配置
  createConfig: (data: ExpenseConfigFormData) => {
    return api.post<{ id: number }>('/operation-expense/configs', data);
  },

  // 更新支出配置
  updateConfig: (id: number, data: ExpenseConfigFormData) => {
    return api.put(`/operation-expense/configs/${id}`, data);
  },

  // 删除支出配置
  deleteConfig: (id: number) => {
    return api.delete(`/operation-expense/configs/${id}`);
  },

  // ========== 月度支出 ==========

  // 获取月度支出记录
  getMonthlyExpenses: (params: MonthlyExpenseListParams) => {
    const query = new URLSearchParams();
    if (params.expense_month) query.append('expense_month', params.expense_month);
    if (params.status) query.append('status', params.status);
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.offset) query.append('offset', params.offset.toString());
    
    return api.get<{
      list: MonthlyExpense[];
      pagination: { total: number; limit: number; offset: number };
    }>(`/operation-expense/monthly?${query.toString()}`);
  },

  // 生成月度支出记录
  generateMonthly: (expense_month: string) => {
    return api.post('/operation-expense/monthly/generate', { expense_month });
  },

  // 确认支付
  confirmPayment: (id: number, remark?: string) => {
    return api.put<{ voucher_no: string }>(`/operation-expense/monthly/${id}/pay`, { remark });
  },

  // 更新月度支出记录
  updateMonthly: (id: number, data: { amount: number; remark?: string }) => {
    return api.put(`/operation-expense/monthly/${id}`, data);
  },

  // 删除月度支出记录
  deleteMonthly: (id: number) => {
    return api.delete(`/operation-expense/monthly/${id}`);
  },

  // 批量删除月度支出记录
  batchDeleteMonthly: (month: string) => {
    return api.delete(`/operation-expense/monthly/batch/${month}`);
  },
};
