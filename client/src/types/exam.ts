// 考试管理相关类型定义

export type ExamType = '科目一' | '科目二' | '科目三' | '科目四';

export type ExamResult = '待考试' | '通过' | '未通过';

export type SubjectStatus = '未考' | '已通过' | '未通过';

export type PlanType = '日常练车' | '模拟考试' | '正式考试';

export type PlanStatus = '待完成' | '已完成' | '已取消';

// 考试场地接口
export interface ExamVenue {
  id: number;
  name: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 考试场地表单数据
export interface ExamVenueFormData {
  name: string;
  address?: string;
  is_active: boolean;
}

// 考试安排接口
export interface ExamSchedule {
  id: number;
  exam_date: string;
  exam_type: ExamType;
  venue_id: number;
  venue_name?: string;
  venue_address?: string;
  capacity: number;
  arranged_count: number;
  person_in_charge?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// 考试安排表单数据
export interface ExamScheduleFormData {
  exam_date: string;
  exam_type: ExamType;
  venue_id: number;
  capacity: number;
  person_in_charge?: string;
  notes?: string;
}

// 学员考试报名接口
export interface ExamRegistration {
  id: number;
  student_id: number;
  student_name?: string;
  student_phone?: string;
  exam_schedule_id: number;
  exam_date?: string;
  exam_type?: ExamType;
  venue_name?: string;
  registration_date: string;
  exam_result: ExamResult;
  exam_score?: string;
  notes?: string;
}

// 考试报名表单数据
export interface ExamRegistrationFormData {
  student_id: number;
  exam_schedule_id: number;
  notes?: string;
}

// 考试结果更新数据
export interface ExamResultUpdateData {
  exam_result: '通过' | '未通过';
  exam_score?: string;
  notes?: string;
}

// 预警类型
export type WarningType = '3次预警' | '4次预警' | '资格作废';

// 预警日志接口
export interface ExamWarningLog {
  id: number;
  student_id: number;
  student_name?: string;
  student_phone?: string;
  warning_type: WarningType;
  warning_subject: ExamType;
  warning_content?: string;
  is_handled: boolean;
  handled_by?: number;
  handler_name?: string;
  handled_time?: string;
  handled_notes?: string;
  created_at: string;
}

// 预警统计
export interface WarningStatistics {
  warning_3_count: number;
  warning_4_count: number;
  disqualified_count: number;
  total_unhandled: number;
  total_handled: number;
}

// 报考资格检查结果
export interface EligibilityCheckResult {
  eligible: boolean;
  reason: string;
}

// 学员预警信息
export interface StudentWarningInfo {
  subject1_warning_level: number;
  subject2_warning_level: number;
  subject3_warning_level: number;
  subject4_warning_level: number;
  exam_qualification: 'normal' | 'disqualified';
}

// 学员考试进度接口
export interface StudentExamProgress {
  id: number;
  student_id: number;
  student_name?: string;
  student_phone?: string;
  student_id_card?: string;
  enrollment_date?: string;
  license_type?: string;
  subject1_status: SubjectStatus;
  subject1_pass_date?: string;
  subject1_total_count: number;
  subject1_failed_count: number;
  subject2_status: SubjectStatus;
  subject2_pass_date?: string;
  subject2_total_count: number;
  subject2_failed_count: number;
  subject3_status: SubjectStatus;
  subject3_pass_date?: string;
  subject3_total_count: number;
  subject3_failed_count: number;
  subject4_status: SubjectStatus;
  subject4_pass_date?: string;
  subject4_total_count: number;
  subject4_failed_count: number;
  total_progress: number;
  exam_qualification: 'normal' | 'disqualified';
  disqualified_date?: string;
  disqualified_reason?: string;
  created_at: string;
  updated_at: string;
}

// 学员考试进度表单数据
export interface StudentExamProgressFormData {
  subject1_status: SubjectStatus;
  subject1_pass_date?: string;
  subject2_status: SubjectStatus;
  subject2_pass_date?: string;
  subject3_status: SubjectStatus;
  subject3_pass_date?: string;
  subject4_status: SubjectStatus;
  subject4_pass_date?: string;
}

// 考试进度统计
export interface ExamProgressStatistics {
  total_students: number;
  subject1_passed: number;
  subject2_passed: number;
  subject3_passed: number;
  subject4_passed: number;
  fully_completed: number;
  avg_progress: number;
}

// 考试通过率统计
export interface ExamPassRateStatistics {
  exam_type: ExamType;
  total_count: number;
  pass_count: number;
  pass_rate: number;
}

// 学员学习计划类型（已废弃，使用PlanType）
export type StudyPlanType = '日常练车' | '模拟考试' | '正式考试';

export type StudyPlanStatus = '待完成' | '已完成' | '已取消';

// 学员学习计划接口
export interface StudentStudyPlan {
  id: number;
  student_id: number;
  student_name?: string;
  student_phone?: string;
  plan_type: PlanType;
  plan_date: string;
  time_slot?: string;
  coach_id?: number;
  coach_name?: string;
  coach_phone?: string;
  status: PlanStatus;
  reminder_time?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// 学员学习计划表单数据
export interface StudentStudyPlanFormData {
  student_id: number;
  plan_type: PlanType;
  plan_date: string;
  time_slot?: string;
  coach_id?: number;
  status?: PlanStatus;
  reminder_time?: string;
  notes?: string;
}

// 系统提醒类型
export type ReminderType = '考试提醒' | '训练提醒' | '到期提醒';

// 系统提醒接口
export interface SystemReminder {
  id: number;
  student_id: number;
  student_name?: string;
  reminder_type: ReminderType;
  reminder_content: string;
  reminder_time: string;
  is_read: boolean;
  created_at: string;
}

// 教练信息接口
export interface Coach {
  id: number;
  name: string;
  phone: string;
  id_card?: string;
  hire_date?: string;
  photo_url?: string;
  certificate_url?: string;
  max_students: number;
  base_daily_salary: number;
  status: '在职' | '离职';
  created_at: string;
  updated_at: string;
}

// 教练表单数据
export interface CoachFormData {
  name: string;
  phone: string;
  id_card?: string;
  hire_date?: string;
  photo_url?: string;
  certificate_url?: string;
  max_students?: number;
  base_daily_salary?: number;
  status?: '在职' | '离职';
}

// 工资配置类型
export type SalaryConfigType = '基础日薪' | '科目二提成' | '科目三提成' | '招生提成';

// 工资配置接口
export interface SalaryConfig {
  id: number;
  config_name: string;
  config_type: SalaryConfigType;
  config_value: number;
  effective_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// 工资配置表单数据
export interface SalaryConfigFormData {
  config_name: string;
  config_type: SalaryConfigType;
  config_value: number;
  effective_date: string;
  notes?: string;
}

// 教练工资月度接口
export interface CoachMonthlySalary {
  id: number;
  coach_id: number;
  coach_name?: string;
  salary_month: string;
  attendance_days: number;
  base_salary: number;
  subject2_pass_count: number;
  subject3_pass_count: number;
  exam_commission: number;
  new_student_count: number;
  recruit_commission: number;
  bonus: number;
  deduction: number;
  deduction_reason?: string;
  gross_salary: number;
  net_salary: number;
  created_at: string;
  updated_at: string;
}

// 教练工资月度表单数据
export interface CoachMonthlySalaryFormData {
  coach_id: number;
  salary_month: string;
  attendance_days: number;
  subject2_pass_count: number;
  subject3_pass_count: number;
  new_student_count: number;
  bonus: number;
  deduction: number;
  deduction_reason?: string;
  net_salary: number;
}

// 账务分类类型
export type AccountCategoryType = '收入' | '支出';

// 收支分类接口
export interface AccountCategory {
  code: string;
  name: string;
  category_type: AccountCategoryType;
  is_system: boolean;
  sort_order: number;
}

// 总校上缴配置类型
export type HeadquartersPaymentConfigType = '按比例' | '固定金额';

// 总校上缴配置接口
export interface HeadquartersPaymentConfig {
  id: number;
  config_type: HeadquartersPaymentConfigType;
  ratio_value?: number;
  fixed_amount?: number;
  effective_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// 总校上缴配置表单数据
export interface HeadquartersPaymentConfigFormData {
  config_type: HeadquartersPaymentConfigType;
  ratio_value?: number;
  fixed_amount?: number;
  effective_date: string;
  notes?: string;
}

// 记账凭证接口
export interface AccountingVoucher {
  id: number;
  voucher_no: string;
  voucher_date: string;
  description: string;
  debit_account_code: string;
  debit_account_name?: string;
  debit_amount: number;
  credit_account_code: string;
  credit_account_name?: string;
  credit_amount: number;
  operator?: string;
  attachment1_url?: string;
  attachment2_url?: string;
  attachment3_url?: string;
  created_at: string;
  updated_at: string;
}

// 记账凭证表单数据
export interface AccountingVoucherFormData {
  voucher_date: string;
  description: string;
  debit_account_code: string;
  debit_amount: number;
  credit_account_code: string;
  credit_amount: number;
  operator?: string;
  attachment1_url?: string;
  attachment2_url?: string;
  attachment3_url?: string;
}

// 利润统计接口
export interface ProfitStatistics {
  income_total: number;
  expense_total: number;
  net_profit: number;
  period: string;
}
