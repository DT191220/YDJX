import React from 'react';
import { useDict } from '../../hooks/useDict';

interface DictSelectProps {
  dictType: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function DictSelect({
  dictType,
  value,
  onChange,
  placeholder = '请选择',
  disabled = false,
  allowClear = false,
  className = '',
  style
}: DictSelectProps) {
  const { options, loading } = useDict(dictType);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange?.(e.target.value);
  };

  return (
    <select
      value={value || ''}
      onChange={handleChange}
      disabled={disabled || loading}
      className={className}
      style={style}
    >
      {allowClear && <option value="">{placeholder}</option>}
      {!allowClear && !value && <option value="">{placeholder}</option>}
      {options.map(opt => (
        <option key={opt.dict_value} value={opt.dict_value}>
          {opt.dict_label}
        </option>
      ))}
    </select>
  );
}

// 字典标签展示组件
interface DictTagProps {
  dictType: string;
  value: string;
  className?: string;
}

export function DictTag({ dictType, value, className = '' }: DictTagProps) {
  const { getLabelByValue } = useDict(dictType);
  return <span className={className}>{getLabelByValue(value)}</span>;
}
