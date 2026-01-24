// 工资配置类型
export interface SalaryConfig {
  id: number;
  config_name: string;
  config_type: string;
  amount: number;
  effective_date: string;
  expiry_date: string | null;
  remarks: string;
  created_at: string;
  updated_at: string;
}

export interface SalaryConfigFormData {
  config_name: string;
  config_type: string;
  amount: number;
  effective_date: string;
  expiry_date?: string;
  remarks?: string;
}

// 教练工资月度表类型
export interface CoachMonthlySalary {
  id: number;
  coach_id: number;
  coach_name: string;
  salary_month: string; // YYYY-MM
  
  // 出勤相关
  attendance_days: number;
  base_salary: number;
  
  // 科目二相关
  subject2_pass_count: number;
  subject2_commission: number;
  
  // 科目三相关
  subject3_pass_count: number;
  subject3_commission: number;
  
  // 招生相关
  new_student_count: number;
  recruitment_commission: number;
  
  // 调整项
  bonus: number;
  deduction: number;
  deduction_reason: string | null;
  
  // 工资汇总
  gross_salary: number;
  net_salary: number | null;
  
  // 状态
  status: 'draft' | 'confirmed' | 'paid';
  
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoachMonthlySalaryFormData {
  attendance_days?: number;
  bonus?: number;
  deduction?: number;
  deduction_reason?: string;
  net_salary?: number;
  status?: 'draft' | 'confirmed' | 'paid';
  remarks?: string;
}
