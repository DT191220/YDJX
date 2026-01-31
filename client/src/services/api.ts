import { ApiResponse } from '../types/common';
import { getToken, clearAuth } from '../utils/storage';

export async function request<T = any>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const token = getToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`/api${url}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    // 处理401未授权（排除登录接口，登录失败应显示错误而非跳转）
    if (response.status === 401 && !url.includes('/auth/login')) {
      clearAuth();
      window.location.href = '/login';
      throw new Error('未授权，请重新登录');
    }

    // 检查业务逻辑错误
    if (!data.success) {
      throw new Error(data.message || '请求失败');
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('网络请求失败');
  }
}

export const api = {
  get: <T = any>(url: string, params?: Record<string, any>) => {
    let fullUrl = url;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        fullUrl = `${url}?${queryString}`;
      }
    }
    return request<T>(fullUrl, { method: 'GET' });
  },
  
  post: <T = any>(url: string, data?: any) =>
    request<T>(url, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  put: <T = any>(url: string, data?: any) =>
    request<T>(url, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: <T = any>(url: string) =>
    request<T>(url, { method: 'DELETE' }),
};

// 导出简化的调用方法
export const get = api.get;
export const post = api.post;
export const put = api.put;
export const del = api.delete;
