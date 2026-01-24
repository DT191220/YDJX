import { api } from './api';
import {
  ExamVenue,
  ExamVenueFormData,
  ExamSchedule,
  ExamScheduleFormData,
  ExamPassRateStatistics,
  StudentExamProgress,
  StudentExamProgressFormData,
  ExamProgressStatistics,
  StudentStudyPlan,
  StudentStudyPlanFormData,
  ExamRegistration,
  ExamRegistrationFormData,
  ExamResultUpdateData,
  ExamWarningLog,
  WarningStatistics,
  EligibilityCheckResult,
  StudentWarningInfo
} from '../types/exam';

// 考试场地服务
export const examVenueService = {
  // 获取考试场地列表
  getExamVenues: (params?: { keyword?: string; is_active?: string }) =>
    api.get<ExamVenue[]>('/exam-venues', params),

  // 获取启用的考试场地列表（用于下拉选择）
  getEnabledVenues: () =>
    api.get<ExamVenue[]>('/exam-venues/enabled'),

  // 获取单个考试场地详情
  getExamVenueById: (id: number) =>
    api.get<ExamVenue>(`/exam-venues/${id}`),

  // 创建考试场地
  createExamVenue: (data: ExamVenueFormData) =>
    api.post<{ id: number }>('/exam-venues', data),

  // 更新考试场地
  updateExamVenue: (id: number, data: ExamVenueFormData) =>
    api.put(`/exam-venues/${id}`, data),

  // 删除考试场地
  deleteExamVenue: (id: number) =>
    api.delete(`/exam-venues/${id}`),
};

// 考试安排服务
export const examScheduleService = {
  // 获取考试安排列表
  getExamSchedules: (params?: {
    start_date?: string;
    end_date?: string;
    exam_type?: string;
    venue_id?: number;
  }) => api.get<ExamSchedule[]>('/exam-schedules', params),

  // 获取月度考试安排（用于日历视图）
  getMonthlySchedules: (year: number, month: number) =>
    api.get<ExamSchedule[]>(`/exam-schedules/monthly/${year}/${month}`),

  // 获取单个考试安排详情
  getExamScheduleById: (id: number) =>
    api.get<ExamSchedule>(`/exam-schedules/${id}`),

  // 创建考试安排
  createExamSchedule: (data: ExamScheduleFormData) =>
    api.post<{ id: number }>('/exam-schedules', data),

  // 更新考试安排
  updateExamSchedule: (id: number, data: ExamScheduleFormData) =>
    api.put(`/exam-schedules/${id}`, data),

  // 删除考试安排
  deleteExamSchedule: (id: number) =>
    api.delete(`/exam-schedules/${id}`),

  // 获取考试通过率统计
  getPassRateStatistics: (params?: { year?: number; month?: number }) =>
    api.get<ExamPassRateStatistics[]>('/exam-schedules/statistics/pass-rate', params),
};

// 学员考试进度服务
export const studentProgressService = {
  // 获取学员考试进度列表
  getStudentProgress: (params?: {
    keyword?: string;
    subject1_status?: string;
    subject2_status?: string;
    subject3_status?: string;
    subject4_status?: string;
  }) => api.get<StudentExamProgress[]>('/student-progress', params),

  // 获取单个学员的考试进度
  getStudentProgressByStudentId: (studentId: number) =>
    api.get<StudentExamProgress>(`/student-progress/student/${studentId}`),

  // 更新学员考试进度
  updateStudentProgress: (id: number, data: StudentExamProgressFormData) =>
    api.put(`/student-progress/${id}`, data),

  // 获取考试进度统计
  getProgressStatistics: () =>
    api.get<ExamProgressStatistics>('/student-progress/statistics/overview'),

  // 检查学员报考资格
  checkEligibility: (studentId: number, subject: string) =>
    api.get<EligibilityCheckResult>(`/student-progress/check-eligibility/${studentId}/${subject}`),

  // 获取学员预警信息
  getStudentWarnings: (id: number) =>
    api.get<StudentWarningInfo>(`/student-progress/${id}/warnings`),
};

// 考试报名服务
export const examRegistrationService = {
  // 获取考试报名列表
  getExamRegistrations: (params?: {
    student_id?: number;
    exam_schedule_id?: number;
    exam_result?: string;
  }) => api.get<ExamRegistration[]>('/exam-registrations', params),

  // 获取单个考试报名详情
  getExamRegistrationById: (id: number) =>
    api.get<ExamRegistration>(`/exam-registrations/${id}`),

  // 创建考试报名
  createExamRegistration: (data: ExamRegistrationFormData) =>
    api.post<{ id: number }>('/exam-registrations', data),

  // 更新考试结果
  updateExamResult: (id: number, data: ExamResultUpdateData) =>
    api.put(`/exam-registrations/${id}/result`, data),

  // 删除考试报名
  deleteExamRegistration: (id: number) =>
    api.delete(`/exam-registrations/${id}`),
};

// 预警日志服务
export const examWarningService = {
  // 获取预警日志列表
  getExamWarnings: (params?: {
    student_id?: number;
    warning_type?: string;
    warning_subject?: string;
    is_handled?: boolean;
  }) => api.get<ExamWarningLog[]>('/exam-warnings', params),

  // 获取预警统计
  getWarningStatistics: () =>
    api.get<WarningStatistics>('/exam-warnings/statistics'),

  // 获取单个预警详情
  getExamWarningById: (id: number) =>
    api.get<ExamWarningLog>(`/exam-warnings/${id}`),

  // 标记预警已处理
  handleWarning: (id: number, data: { handled_by: number; handled_notes?: string }) =>
    api.put(`/exam-warnings/${id}/handle`, data),

  // 批量标记预警已处理
  batchHandleWarnings: (data: { ids: number[]; handled_by: number; handled_notes?: string }) =>
    api.put('/exam-warnings/batch/handle', data),
};

// 学员学习计划服务
export const studyPlanService = {
  // 获取学习计划列表
  getStudyPlans: (params?: {
    student_id?: number;
    coach_id?: number;
    plan_type?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
  }) => api.get<StudentStudyPlan[]>('/study-plans', params),

  // 获取单个学员的学习计划
  getStudyPlansByStudentId: (studentId: number, status?: string) =>
    api.get<StudentStudyPlan[]>(`/study-plans/student/${studentId}`, status ? { status } : undefined),

  // 获取单个学习计划详情
  getStudyPlanById: (id: number) =>
    api.get<StudentStudyPlan>(`/study-plans/${id}`),

  // 创建学习计划
  createStudyPlan: (data: StudentStudyPlanFormData) =>
    api.post<{ id: number }>('/study-plans', data),

  // 更新学习计划
  updateStudyPlan: (id: number, data: Partial<StudentStudyPlanFormData>) =>
    api.put(`/study-plans/${id}`, data),

  // 删除学习计划
  deleteStudyPlan: (id: number) =>
    api.delete(`/study-plans/${id}`),

  // 获取月度学习计划（用于日历视图）
  getMonthlyPlans: (year: number, month: number, params?: { student_id?: number; coach_id?: number }) =>
    api.get<StudentStudyPlan[]>(`/study-plans/calendar/${year}/${month}`, params),
};
