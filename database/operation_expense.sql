-- 运营支出管理模块数据表
-- 创建时间: 2026-01-30

-- 1. 固定支出配置表
-- 用于配置每月固定支出项目，必须关联已存在的支出科目
CREATE TABLE IF NOT EXISTS operation_expense_config (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '配置ID',
  subject_code VARCHAR(10) NOT NULL COMMENT '关联支出科目代码',
  expense_name VARCHAR(100) NOT NULL COMMENT '支出名称',
  amount DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '每月固定金额',
  payment_day INT DEFAULT 1 COMMENT '每月支付日(1-31)',
  is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  remark VARCHAR(200) COMMENT '备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_subject_code (subject_code),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='运营固定支出配置表';

-- 2. 月度支出记录表
-- 每月生成的支出记录，确认支付后自动生成凭证
CREATE TABLE IF NOT EXISTS operation_expense_monthly (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '记录ID',
  config_id INT NOT NULL COMMENT '配置ID',
  expense_month VARCHAR(7) NOT NULL COMMENT '支出月份(YYYY-MM)',
  subject_code VARCHAR(10) NOT NULL COMMENT '支出科目代码',
  subject_name VARCHAR(100) COMMENT '支出科目名称(冗余)',
  expense_name VARCHAR(100) NOT NULL COMMENT '支出名称',
  amount DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '支出金额',
  status ENUM('pending', 'paid') DEFAULT 'pending' COMMENT '状态: pending待支付, paid已支付',
  paid_at DATETIME COMMENT '支付时间',
  voucher_no VARCHAR(20) COMMENT '关联凭证号',
  remark VARCHAR(200) COMMENT '备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_config_month (config_id, expense_month),
  INDEX idx_expense_month (expense_month),
  INDEX idx_status (status),
  INDEX idx_subject_code (subject_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='月度运营支出记录表';

-- 注意：subject_code 关联 finance_subjects 表
-- 新增配置时，必须选择已存在的支出科目(subject_type='支出')
-- 这样才能确保生成凭证和报表统计正常工作
