-- 创建班型价格历史表（单独执行）
USE yuandong_driving_school;

CREATE TABLE IF NOT EXISTS class_type_price_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_type_id INT NOT NULL COMMENT '班型ID',
  contract_amount DECIMAL(10,2) NOT NULL COMMENT '合同金额（当时的价格）',
  effective_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '生效日期',
  created_by VARCHAR(50) COMMENT '创建人',
  notes TEXT COMMENT '价格变更说明',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_type_id) REFERENCES class_types(id) ON DELETE CASCADE,
  INDEX idx_class_type (class_type_id),
  INDEX idx_effective_date (effective_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='班型价格历史表';

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

-- 验证创建结果
SELECT 
  ct.id,
  ct.name,
  ct.contract_amount as current_price,
  COUNT(ph.id) as history_count,
  MIN(ph.effective_date) as earliest_price_date
FROM class_types ct
LEFT JOIN class_type_price_history ph ON ct.id = ph.class_type_id
GROUP BY ct.id, ct.name, ct.contract_amount;
