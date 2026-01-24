// 通用API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  pagination?: PaginationInfo;
  errors?: FieldError[];
}

export interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  pages: number;
}

export interface FieldError {
  field: string;
  message: string;
}

// 分页参数
export interface PaginationParams {
  limit: number;
  offset: number;
}

// 排序参数
export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
