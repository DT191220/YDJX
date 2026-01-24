// 教练信息类型定义

export type CoachStatus = '在职' | '离职' | '休假';

export type Gender = '男' | '女';

export interface Coach {
  id: number;
  name: string;
  id_card: string;
  phone: string;
  gender: Gender;
  birth_date: string;
  age: number;
  address?: string;
  license_type?: string;
  teaching_certificate?: string;
  certificate_date?: string;
  teaching_subjects?: string;
  employment_date?: string;
  status: CoachStatus;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface CoachFormData {
  name: string;
  id_card: string;
  phone: string;
  gender: Gender;
  address?: string;
  license_type?: string;
  teaching_certificate?: string;
  certificate_date?: string;
  teaching_subjects?: string;
  employment_date?: string;
  status: CoachStatus;
  remarks?: string;
}

export interface CoachQueryParams {
  limit: number;
  offset: number;
  keyword?: string;
  status?: CoachStatus;
  teaching_subjects?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
