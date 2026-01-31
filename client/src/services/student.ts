import { api } from './api';
import { Student, StudentFormData, StudentQueryParams } from '../types/student';

export interface EnrollmentStatistics {
  year: number;
  month: number;
  currentTotal: number;
  yearTotal: number;
  lastPeriodTotal: number;
  monthlyStats: {
    month: string;
    monthName: string;
    count: number;
  }[];
  byClassType: {
    class_type_name: string;
    count: number;
  }[];
  byCoach: {
    coach_name: string;
    count: number;
  }[];
  coachClassType: {
    coach_name: string;
    class_type_name: string;
    count: number;
  }[];
}

export const studentService = {
  // 获取学员列表
  getStudents: (params: StudentQueryParams) => {
    const query = new URLSearchParams();
    query.append('limit', params.limit.toString());
    query.append('offset', params.offset.toString());
    if (params.keyword) query.append('keyword', params.keyword);
    if (params.status) query.append('status', params.status);
    if (params.enrollment_date_start) query.append('enrollment_date_start', params.enrollment_date_start);
    if (params.enrollment_date_end) query.append('enrollment_date_end', params.enrollment_date_end);
    if (params.coach_name) query.append('coach_name', params.coach_name);
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.sortOrder) query.append('sortOrder', params.sortOrder);
    
    return api.get<{ list: Student[]; pagination: { total: number; limit: number; offset: number } }>(
      `/students?${query.toString()}`
    );
  },

  // 获取单个学员详情
  getStudentById: (id: number) => api.get<Student>(`/students/${id}`),

  // 创建学员
  createStudent: (data: StudentFormData) => api.post<Student>('/students', data),

  // 更新学员信息
  updateStudent: (id: number, data: StudentFormData) => 
    api.put<Student>(`/students/${id}`, data),

  // 删除学员
  deleteStudent: (id: number) => api.delete(`/students/${id}`),

  // 获取招生统计数据
  getEnrollmentStatistics: (year?: number, month?: number) => {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (month !== undefined) params.append('month', month.toString());
    const queryString = params.toString();
    return api.get<EnrollmentStatistics>(`/students/statistics/enrollment${queryString ? `?${queryString}` : ''}`);
  },
};
