// 缴费状态类型
export type PaymentStatus = '未缴费' | '部分缴费' | '已缴费' | '已退费';

// 缴费方式类型
export type PaymentMethod = '现金' | 'POS' | '微信' | '支付宝' | '银行转账' | '其他';

// 班型状态类型
export type ClassTypeStatus = '启用' | '禁用';

// 科目类型
export type Subject = '科目一' | '科目二' | '科目三' | '科目四';

// 班型接口
export interface ClassType {
  id: number;
  name: string;
  contract_amount: number;
  description?: string;
  status: ClassTypeStatus;
  created_at: string;
  updated_at: string;
}

// 班型表单数据
export interface ClassTypeFormData {
  name: string;
  contract_amount: number;
  description?: string;
  status: ClassTypeStatus;
}

// 服务配置接口
export interface ServiceConfig {
  id: number;
  class_type_id: number;
  subject: Subject;
  service_content: string;
  is_included: number;
  created_at: string;
}

// 服务配置表单数据
export interface ServiceConfigFormData {
  subject: Subject;
  service_content: string;
  is_included: number;
}

// 缴费记录接口
export interface PaymentRecord {
  id: number;
  student_id: number;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  operator: string;
  notes?: string;
  created_at: string;
}

// 缴费记录表单数据
export interface PaymentRecordFormData {
  student_id: number;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  operator: string;
  notes?: string;
}

// 学员缴费信息(扩展学员信息)
export interface StudentPaymentInfo {
  id: number;
  name: string;
  phone: string;
  id_card: string;
  class_type_id?: number;
  class_type_name?: string;
  contract_amount: number;
  actual_amount: number;
  discount_amount: number;
  payable_amount: number;
  debt_amount: number;
  account_balance: number;
  payment_status: PaymentStatus;
  enrollment_date?: string;
}

// 缴费统计信息
export interface PaymentStatistics {
  student_info: StudentPaymentInfo;
  payment_count: number;
  last_payment: {
    payment_date: string;
    amount: number;
  } | null;
}
