-- 设置客户端字符编码
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- 工资配置表
CREATE TABLE IF NOT EXISTS salary_config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  config_name VARCHAR(50) NOT NULL COMMENT '配置名称',
  config_type VARCHAR(50) NOT NULL COMMENT '配置类型：base_daily_salary(基础日薪), subject2_commission(科目二提成), subject3_commission(科目三提成), recruitment_commission(招生提成), 或其他自定义提成',
  amount DECIMAL(10, 2) NOT NULL COMMENT '金额',
  effective_date DATE NOT NULL COMMENT '生效日期',
  expiry_date DATE DEFAULT NULL COMMENT '失效日期（NULL表示长期有效）',
  remarks TEXT COMMENT '备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_config_type (config_type),
  INDEX idx_effective_date (effective_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工资配置表';

-- 插入默认配置
INSERT INTO salary_config (config_name, config_type, amount, effective_date, remarks) VALUES
('基础日薪', 'base_daily_salary', 200.00, '2026-01-01', '默认基础日薪配置'),
('科目二通过提成', 'subject2_commission', 100.00, '2026-01-01', '科目二考试通过提成'),
('科目三通过提成', 'subject3_commission', 150.00, '2026-01-01', '科目三考试通过提成'),
('招生提成', 'recruitment_commission', 300.00, '2026-01-01', '每招收一名新学员的提成');
