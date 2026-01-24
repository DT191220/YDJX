-- 数据迁移脚本：为现有班型创建价格历史记录
-- 此脚本应在添加 class_type_price_history 表后运行

-- 为每个现有班型插入初始价格历史记录（使用当前价格）
INSERT INTO class_type_price_history 
  (class_type_id, contract_amount, effective_date, created_by, notes)
SELECT 
  id,
  contract_amount,
  created_at,  -- 使用班型创建时间作为初始价格的生效时间
  'system',
  CONCAT('初始价格：', contract_amount)
FROM class_types
WHERE NOT EXISTS (
  SELECT 1 FROM class_type_price_history WHERE class_type_id = class_types.id
);

-- 验证迁移结果（可选）
-- 检查每个班型都有至少一条价格历史记录
SELECT 
  ct.id,
  ct.name,
  ct.contract_amount as current_price,
  COUNT(ph.id) as history_count,
  MIN(ph.effective_date) as earliest_price_date
FROM class_types ct
LEFT JOIN class_type_price_history ph ON ct.id = ph.class_type_id
GROUP BY ct.id, ct.name, ct.contract_amount;
