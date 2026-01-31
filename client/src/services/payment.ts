import { api } from './api';
import { ClassTypeFormData, PaymentRecordFormData, ServiceConfigFormData } from '../types/payment';

// 班型管理相关API
export const classTypeService = {
  // 获取班型列表
  getClassTypes: async (params: {
    limit?: number;
    offset?: number;
    keyword?: string;
    status?: string;
  }) => {
    const response = await api.get('/class-types', params);
    return response;
  },

  // 获取班型详情（包含服务配置）
  getClassTypeById: async (id: number) => {
    const response = await api.get(`/class-types/${id}`);
    return response;
  },

  // 创建班型
  createClassType: async (data: ClassTypeFormData) => {
    const response = await api.post('/class-types', data);
    return response;
  },

  // 更新班型
  updateClassType: async (id: number, data: ClassTypeFormData) => {
    const response = await api.put(`/class-types/${id}`, data);
    return response;
  },

  // 删除班型
  deleteClassType: async (id: number) => {
    const response = await api.delete(`/class-types/${id}`);
    return response;
  },

  // 获取所有启用的班型（用于下拉选择）
  getEnabledClassTypes: async () => {
    const response = await api.get('/class-types/list/enabled');
    return response;
  }
};

// 缴费记录相关API
export const paymentService = {
  // 获取学员的缴费记录列表
  getPaymentsByStudent: async (studentId: number) => {
    const response = await api.get(`/payments/student/${studentId}`);
    return response;
  },

  // 创建缴费记录
  createPayment: async (data: PaymentRecordFormData) => {
    const response = await api.post('/payments', data);
    return response;
  },

  // 删除缴费记录
  deletePayment: async (id: number) => {
    const response = await api.delete(`/payments/${id}`);
    return response;
  },

  // 退费
  refundPayment: async (data: { student_id: number; amount: number; operator: string; notes?: string }) => {
    const response = await api.post('/payments/refund', data);
    return response;
  },

  // 减免
  discountPayment: async (data: { student_id: number; amount: number; operator: string; notes?: string }) => {
    const response = await api.post('/payments/discount', data);
    return response;
  },

  // 获取欠费学员列表
  getDebtStudents: async (params: {
    limit?: number;
    offset?: number;
    keyword?: string;
  }) => {
    const response = await api.get('/payments/debts', params);
    return response;
  },

  // 获取缴费统计信息
  getPaymentStatistics: async (studentId: number) => {
    const response = await api.get(`/payments/statistics/${studentId}`);
    return response;
  },

  // 上缴确认
  submitConfirm: async (data: { student_id: number; operator: string; remark?: string }) => {
    const response = await api.post('/payments/submit-confirm', data);
    return response;
  },

  // 撤销上缴
  submitRevoke: async (data: { student_id: number; operator: string; remark?: string }) => {
    const response = await api.post('/payments/submit-revoke', data);
    return response;
  },

  // 获取上缴记录列表
  getSubmitRecords: async (params: {
    limit?: number;
    offset?: number;
    keyword?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    const response = await api.get('/payments/submit-records', params);
    return response;
  }
};

// 服务配置相关API
export const serviceConfigService = {
  // 获取班型的服务配置列表
  getServiceConfigsByClassType: async (classTypeId: number) => {
    const response = await api.get(`/service-configs/class-type/${classTypeId}`);
    return response;
  },

  // 批量保存服务配置
  batchSaveServiceConfigs: async (classTypeId: number, services: ServiceConfigFormData[]) => {
    const response = await api.post('/service-configs/batch', {
      class_type_id: classTypeId,
      services
    });
    return response;
  },

  // 创建单个服务配置
  createServiceConfig: async (classTypeId: number, data: ServiceConfigFormData) => {
    const response = await api.post('/service-configs', {
      class_type_id: classTypeId,
      ...data
    });
    return response;
  },

  // 更新服务配置
  updateServiceConfig: async (id: number, data: ServiceConfigFormData) => {
    const response = await api.put(`/service-configs/${id}`, data);
    return response;
  },

  // 删除服务配置
  deleteServiceConfig: async (id: number) => {
    const response = await api.delete(`/service-configs/${id}`);
    return response;
  }
};
