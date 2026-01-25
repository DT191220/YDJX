-- 总校上缴配置表 (headquarter_config)
-- 用于管理学员缴费时需要上缴给总校的金额计算规则

CREATE TABLE IF NOT EXISTS headquarter_config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  config_name VARCHAR(50) NOT NULL COMMENT '配置名称',
  config_type ENUM('ratio', 'fixed') NOT NULL COMMENT '计算类型: ratio=比例, fixed=固定金额',
  ratio DECIMAL(5,4) DEFAULT NULL COMMENT '上缴比例（如0.30表示30%），当类型为ratio时使用',
  fixed_amount DECIMAL(12,2) DEFAULT NULL COMMENT '固定金额，当类型为fixed时使用',
  effective_date DATE NOT NULL COMMENT '生效日期',
  expire_date DATE DEFAULT NULL COMMENT '失效日期（为空表示长期有效）',
  is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  remark VARCHAR(500) DEFAULT NULL COMMENT '备注说明',
  created_by INT COMMENT '创建人ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_effective_date (effective_date),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='总校上缴配置表';

-- 插入默认配置（30%比例上缴）
INSERT INTO headquarter_config (config_name, config_type, ratio, effective_date, is_active, remark) 
VALUES ('默认上缴比例', 'ratio', 0.3000, '2024-01-01', TRUE, '默认配置：学员缴费的30%上缴总校');

-- 添加"应付总校"负债科目（用于记录应上缴但未支付的款项）
INSERT INTO finance_subjects (subject_code, subject_name, subject_type, balance_direction, sort_order, is_active)
VALUES ('2001', '应付总校', '负债', '贷', 10, TRUE)
ON DUPLICATE KEY UPDATE subject_name = VALUES(subject_name);
