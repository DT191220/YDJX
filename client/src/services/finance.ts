import { api } from './api';

// 类型定义
export interface Subject {
  id: number;
  subject_code: string;
  subject_name: string;
  subject_type: '资产' | '负债' | '权益' | '收入' | '支出';
  balance_direction: '借' | '贷';
  parent_code?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface VoucherItem {
  id?: number;
  voucher_id?: number;
  entry_type: '借' | '贷';
  subject_code: string;
  subject_name?: string;
  amount: number | string;
  summary?: string;
  seq?: number;
}

export interface Voucher {
  id: number;
  voucher_no: string;
  voucher_date: string;
  description: string;
  creator_id: number;
  creator_name: string;
  source_type: 'student_payment' | 'coach_salary' | 'manual';
  source_id?: number;
  status: 'draft' | 'posted';
  created_at: string;
  total_debit?: number;
  total_credit?: number;
  items?: VoucherItem[];
}

export interface VoucherListParams {
  start_date?: string;
  end_date?: string;
  subject_code?: string;
  source_type?: string;
  keyword?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface CreateVoucherData {
  voucher_date: string;
  description: string;
  creator_id?: number;
  creator_name?: string;
  items: VoucherItem[];
}

export interface SubjectFormData {
  subject_code: string;
  subject_name: string;
  subject_type: string;
  balance_direction: string;
  parent_code?: string;
  is_active?: boolean;
  sort_order?: number;
}

// 总校上缴配置
export interface HeadquarterConfig {
  id: number;
  class_type_id?: number | null;
  class_type_name?: string;
  class_type_contract_amount?: number;
  class_type_status?: string;
  config_name: string;
  config_type: 'ratio' | 'fixed';
  ratio?: number;
  fixed_amount?: number;
  effective_date: string;
  expire_date?: string;
  is_active: boolean;
  remark?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface HeadquarterConfigFormData {
  class_type_id?: number | null;
  config_name: string;
  config_type: 'ratio' | 'fixed';
  ratio?: number;
  fixed_amount?: number;
  effective_date: string;
  expire_date?: string;
  is_active?: boolean;
  remark?: string;
  created_by?: number;
}

// 报表相关类型
export interface ProfitReportItem {
  subject_code: string;
  subject_name: string;
  amount: number;
}

// 分摊费用项
export interface AllocatedItem {
  id: number;
  expense_name: string;
  subject_code: string;
  subject_name: string;
  total_amount: number;
  monthly_amount: number;
}

export interface ProfitReport {
  yearMonth: string;
  incomeItems: ProfitReportItem[];
  expenseItems: ProfitReportItem[];
  allocatedItems: AllocatedItem[];
  totalIncome: number;
  totalExpense: number;
  totalAllocated: number;
  netProfit: number;
}

// 年度利润汇总
export interface MonthlyProfitData {
  month: number;
  income: number;
  expense: number;
  allocated: number;
  netProfit: number;
}

export interface YearlyProfitReport {
  year: number;
  monthlyData: MonthlyProfitData[];
  yearlyTotal: {
    totalIncome: number;
    totalExpense: number;
    totalAllocated: number;
    netProfit: number;
  };
}

// 费用分摊配置
export interface ExpenseAllocation {
  id: number;
  expense_name: string;
  subject_code: string;
  subject_name?: string;
  total_amount: number;
  allocation_year: number;
  allocation_method: 'average' | 'custom';
  monthly_amount: number;
  start_month: number;
  end_month: number;
  remark?: string;
  is_active: boolean;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface ExpenseAllocationFormData {
  expense_name: string;
  subject_code: string;
  total_amount: number;
  allocation_year: number;
  allocation_method?: 'average' | 'custom';
  monthly_amount?: number;
  start_month?: number;
  end_month?: number;
  remark?: string;
  is_active?: boolean;
  created_by?: number;
}

// 科目用途映射
export interface SubjectMapping {
  id: number;
  usage_code: string;
  usage_name: string;
  subject_code: string;
  subject_name?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BalanceDetailItem {
  voucher_date: string;
  voucher_no: string;
  description: string;
  entry_type: '借' | '贷';
  subject_code: string;
  subject_name: string;
  subject_type: string;
  amount: number;
  summary?: string;
}

export interface SubjectBalanceItem {
  subject_code: string;
  subject_name: string;
  subject_type: string;
  balance_direction: '借' | '贷';
  total_debit: number;
  total_credit: number;
  balance: number;
  balance_direction_text: string;
  balance_abs: number;
}

// 科目管理 API
export const financeService = {
  // 获取科目列表
  getSubjects: (params?: { type?: string; is_active?: string }) =>
    api.get<Subject[]>('/finance/subjects', params),

  // 创建科目
  createSubject: (data: SubjectFormData) =>
    api.post<{ id: number }>('/finance/subjects', data),

  // 更新科目
  updateSubject: (id: number, data: Partial<SubjectFormData>) =>
    api.put(`/finance/subjects/${id}`, data),

  // 删除科目
  deleteSubject: (id: number) =>
    api.delete(`/finance/subjects/${id}`),

  // 获取凭证列表
  getVouchers: (params?: VoucherListParams) =>
    api.get<{ list: Voucher[]; total: number; limit: number; offset: number }>('/finance/vouchers', params),

  // 获取凭证详情
  getVoucherDetail: (id: number) =>
    api.get<Voucher>(`/finance/vouchers/${id}`),

  // 创建凭证
  createVoucher: (data: CreateVoucherData) =>
    api.post<{ id: number; voucher_no: string }>('/finance/vouchers', data),

  // 删除凭证
  deleteVoucher: (id: number) =>
    api.delete(`/finance/vouchers/${id}`),

  // ========================================
  // 总校上缴配置 API
  // ========================================

  // 获取上缴配置列表
  getHeadquarterConfigs: (params?: { is_active?: string }) =>
    api.get<HeadquarterConfig[]>('/finance/headquarter-config', params),

  // 获取当前生效的配置（支持按班型查询）
  getActiveHeadquarterConfig: (classTypeId?: number) =>
    api.get<HeadquarterConfig | null>('/finance/headquarter-config/active', classTypeId ? { class_type_id: classTypeId } : undefined),

  // 创建上缴配置
  createHeadquarterConfig: (data: HeadquarterConfigFormData) =>
    api.post<{ id: number }>('/finance/headquarter-config', data),

  // 更新上缴配置
  updateHeadquarterConfig: (id: number, data: Partial<HeadquarterConfigFormData>) =>
    api.put(`/finance/headquarter-config/${id}`, data),

  // 删除上缴配置
  deleteHeadquarterConfig: (id: number) =>
    api.delete(`/finance/headquarter-config/${id}`),

  // ========================================
  // 财务报表 API
  // ========================================

  // 月度利润表（含分摊费用）
  getProfitMonthly: (yearMonth: string) =>
    api.get<ProfitReport>(`/finance/reports/profit-monthly?yearMonth=${yearMonth}`),

  // 年度利润汇总
  getProfitYearly: (year: number) =>
    api.get<YearlyProfitReport>(`/finance/reports/profit-yearly?year=${year}`),

  // 收支明细表
  getBalanceDetail: (params: { startDate: string; endDate: string; subjectType?: string }) =>
    api.get<BalanceDetailItem[]>('/finance/reports/balance-detail', params),

  // 科目余额表
  getSubjectBalance: (params: { date: string; subjectType?: string }) =>
    api.get<SubjectBalanceItem[]>('/finance/reports/subject-balance', params),

  // ========================================
  // 费用分摊配置 API
  // ========================================

  // 获取费用分摊配置列表
  getExpenseAllocations: (params?: { year?: number; is_active?: string }) =>
    api.get<ExpenseAllocation[]>('/finance/expense-allocation', params),

  // 创建费用分摊配置
  createExpenseAllocation: (data: ExpenseAllocationFormData) =>
    api.post<{ id: number }>('/finance/expense-allocation', data),

  // 更新费用分摊配置
  updateExpenseAllocation: (id: number, data: Partial<ExpenseAllocationFormData>) =>
    api.put(`/finance/expense-allocation/${id}`, data),

  // 删除费用分摊配置
  deleteExpenseAllocation: (id: number) =>
    api.delete(`/finance/expense-allocation/${id}`),

  // ========================================
  // 科目用途映射 API
  // ========================================

  // 获取科目映射列表
  getSubjectMappings: () =>
    api.get<SubjectMapping[]>('/finance/subject-mapping'),

  // 更新科目映射
  updateSubjectMapping: (id: number, data: { subject_code: string }) =>
    api.put(`/finance/subject-mapping/${id}`, data),
};

export default financeService;
