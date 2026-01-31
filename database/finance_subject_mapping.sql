-- ========================================
-- 科目用途映射表
-- 用途：将业务场景与科目代码关联，实现动态配置
-- 创建日期: 2026-01-27
-- ========================================

-- 创建科目用途映射表
CREATE TABLE IF NOT EXISTS finance_subject_mapping (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usage_code VARCHAR(50) NOT NULL UNIQUE COMMENT '用途代码（如：BANK_DEPOSIT, TUITION_INCOME）',
  usage_name VARCHAR(100) NOT NULL COMMENT '用途名称（如：银行存款、学员学费收入）',
  subject_code VARCHAR(10) NOT NULL COMMENT '关联科目代码',
  description VARCHAR(200) COMMENT '用途说明',
  is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_usage_code (usage_code),
  INDEX idx_subject_code (subject_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='科目用途映射表';

-- 初始化默认映射数据
INSERT INTO finance_subject_mapping (usage_code, usage_name, subject_code, description) VALUES
-- 资产类
('BANK_DEPOSIT', '银行存款', '1001', '收付款默认账户'),
('CASH', '现金', '1002', '现金收付'),

-- 收入类
('TUITION_INCOME', '学员学费收入', '101', '学员缴费确认收入'),
('REEXAM_INCOME', '补考费收入', '102', '补考费收入'),
('OTHER_INCOME', '其他收入', '103', '其他杂项收入'),

-- 支出类
('HEADQUARTER_EXPENSE', '上缴总校费用', '201', '上缴给总校的费用'),
('COACH_SALARY', '教练工资', '209', '发放教练工资支出')

ON DUPLICATE KEY UPDATE 
  usage_name = VALUES(usage_name),
  description = VALUES(description);

-- 删除不再使用的"应付总校"科目（可选，如果确认不再使用）
-- UPDATE finance_subjects SET is_active = FALSE WHERE subject_code = '2001';

-- ========================================
-- 完成提示
-- ========================================
SELECT '科目用途映射表创建完成！' as message;
SELECT * FROM finance_subject_mapping;
