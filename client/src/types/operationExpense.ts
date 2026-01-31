// 运营支出类型定义

// 支出配置
export interface ExpenseConfig {
  id: number;
  subject_code: string;
  subject_name?: string;
  expense_name: string;
  amount: number;
  payment_day: number;
  is_active: boolean;
  remark?: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseConfigFormData {
  subject_code: string;
  expense_name: string;
  amount: number;
  payment_day?: number;
  is_active?: boolean;
  remark?: string;
}

// 月度支出记录
export interface MonthlyExpense {
  id: number;
  config_id: number;
  expense_month: string;
  subject_code: string;
  subject_name?: string;
  expense_name: string;
  amount: number;
  status: 'pending' | 'paid';
  paid_at?: string;
  voucher_no?: string;
  remark?: string;
  payment_day?: number;
  created_at: string;
  updated_at: string;
}

export interface MonthlyExpenseListParams {
  expense_month?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

// 支出科目（用于下拉选择）
export interface ExpenseSubject {
  subject_code: string;
  subject_name: string;
}
