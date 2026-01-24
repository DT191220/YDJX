// 字典类型定义
export interface DictType {
  id: number;
  dict_name: string;
  dict_type: string;
  description?: string;
  status: '启用' | '禁用';
  created_at: string;
  updated_at: string;
}

export interface DictData {
  id: number;
  dict_type: string;
  dict_label: string;
  dict_value: string;
  sort_order: number;
  status: '启用' | '禁用';
  remark?: string;
  created_at: string;
  updated_at: string;
}

export interface DictTypeFormData {
  dict_name: string;
  dict_type: string;
  description?: string;
  status: '启用' | '禁用';
}

export interface DictDataFormData {
  dict_type_id: number;
  dict_label: string;
  dict_value: string;
  sort_order: number;
  status: '启用' | '禁用';
  remark?: string;
}
