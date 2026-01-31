-- ========================================
-- 费用分摊配置表
-- 创建日期: 2026-01-27
-- 用途: 将年度一次性费用按月自动分摊到成本中
-- ========================================

CREATE TABLE IF NOT EXISTS finance_expense_allocation (
  id INT PRIMARY KEY AUTO_INCREMENT,
  expense_name VARCHAR(100) NOT NULL COMMENT '费用名称（如：2026年场地租赁费）',
  subject_code VARCHAR(10) NOT NULL COMMENT '关联支出科目代码',
  total_amount DECIMAL(12,2) NOT NULL COMMENT '年度总金额',
  allocation_year YEAR NOT NULL COMMENT '分摊年度',
  allocation_method ENUM('average', 'custom') DEFAULT 'average' COMMENT '分摊方式：average=平均12个月',
  monthly_amount DECIMAL(12,2) COMMENT '每月分摊金额（自动计算或手动指定）',
  start_month TINYINT DEFAULT 1 COMMENT '开始月份(1-12)',
  end_month TINYINT DEFAULT 12 COMMENT '结束月份(1-12)',
  remark VARCHAR(500) COMMENT '备注',
  is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  created_by INT COMMENT '创建人ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_subject_year (subject_code, allocation_year),
  INDEX idx_year (allocation_year),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='费用分摊配置表';

-- ========================================
-- 完成提示
-- ========================================
SELECT '费用分摊配置表创建完成！' as message;
