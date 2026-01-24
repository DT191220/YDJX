import { useState, useEffect, useCallback, useMemo } from 'react';
import { dictService } from '../services/dict';
import { DictData } from '../types/dict';

// 全局字典缓存
const dictCache: Record<string, { data: DictData[]; timestamp: number }> = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

export function useDict(dictType: string) {
  const [options, setOptions] = useState<DictData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDict = useCallback(async () => {
    if (!dictType) return;

    // 检查缓存
    const cached = dictCache[dictType];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setOptions(cached.data);
      return;
    }

    setLoading(true);
    try {
      const response = await dictService.getDictByType(dictType);
      if (response.success && response.data) {
        const data = response.data;
        setOptions(data);
        // 更新缓存
        dictCache[dictType] = { data, timestamp: Date.now() };
      }
    } catch (error) {
      console.error(`获取字典[${dictType}]失败:`, error);
    } finally {
      setLoading(false);
    }
  }, [dictType]);

  useEffect(() => {
    fetchDict();
  }, [fetchDict]);

  // 根据value获取label
  const getLabelByValue = useCallback((value: string) => {
    const item = options.find(opt => opt.dict_value === value);
    return item?.dict_label || value;
  }, [options]);

  // 根据label获取value
  const getValueByLabel = useCallback((label: string) => {
    const item = options.find(opt => opt.dict_label === label);
    return item?.dict_value || label;
  }, [options]);

  // 转换为select组件需要的格式
  const selectOptions = useMemo(() => 
    options.map(opt => ({
      label: opt.dict_label,
      value: opt.dict_value
    })), [options]);

  return {
    options,
    selectOptions,
    loading,
    getLabelByValue,
    getValueByLabel,
    refresh: fetchDict
  };
}

// 清除指定字典类型的缓存
export function clearDictCache(dictType?: string) {
  if (dictType) {
    delete dictCache[dictType];
  } else {
    Object.keys(dictCache).forEach(key => delete dictCache[key]);
  }
}
