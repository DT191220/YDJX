// 学员信息类型定义

export type EnrollmentStatus = 
  | '咨询中'
  | '预约报名'
  | '报名未缴费'
  | '报名部分缴费'
  | '报名已缴费'
  | '已退费'
  | '废考';

// 可手动设置的初始报名状态（未产生缴费行为前）
export const EDITABLE_ENROLLMENT_STATUS: EnrollmentStatus[] = ['咨询中', '预约报名', '报名未缴费'];

export type PaymentStatus = '未缴费' | '部分缴费' | '已缴费' | '已退费';

export type Gender = '男' | '女';

export type DrivingExperience = '有' | '无';

export type LicenseType = 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'A1' | 'A2' | 'A3' | 'B1' | 'B2';

export interface Student {
  id: number;
  name: string;
  id_card: string;
  phone: string;
  gender: Gender;
  birth_date: string;
  age: number;
  address?: string;
  native_place?: string;
  status: EnrollmentStatus;
  payment_status?: PaymentStatus;
  enrollment_date?: string;
  medical_history?: string;
  has_driving_experience: DrivingExperience;
  driving_years: number;
  previous_school_history?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  coach_id?: number;
  coach_name?: string;
  coach_subject2_name?: string;
  coach_subject3_name?: string;
  class_type_id?: number;
  class_type_name?: string;
  license_type?: LicenseType;
  registrar_id?: number;
  registrar_name?: string;
  created_at: string;
  updated_at: string;
}

export interface StudentFormData {
  name: string;
  id_card: string;
  phone: string;
  gender: Gender;
  address?: string;
  native_place?: string;
  status: EnrollmentStatus;
  enrollment_date?: string;
  medical_history?: string;
  has_driving_experience: DrivingExperience;
  driving_years: number;
  previous_school_history?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  coach_id?: number;
  coach_name?: string;
  coach_subject2_name?: string;
  coach_subject3_name?: string;
  class_type_id?: number;
  license_type?: LicenseType;
}

export interface StudentQueryParams {
  limit: number;
  offset: number;
  keyword?: string;
  status?: EnrollmentStatus;
  enrollment_date_start?: string;
  enrollment_date_end?: string;
  coach_name?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
