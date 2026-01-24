-- 设置客户端字符编码
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- 教练工资月度表
CREATE TABLE IF NOT EXISTS coach_monthly_salary (
  id INT PRIMARY KEY AUTO_INCREMENT,
  coach_id INT NOT NULL COMMENT '教练ID',
  coach_name VARCHAR(50) NOT NULL COMMENT '教练姓名（冗余字段，便于查询）',
  salary_month VARCHAR(7) NOT NULL COMMENT '统计月份（YYYY-MM）',
  
  -- 出勤相关
  attendance_days INT NOT NULL DEFAULT 0 COMMENT '出勤天数',
  base_salary DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT '基础工资',
  
  -- 科目二相关
  subject2_pass_count INT NOT NULL DEFAULT 0 COMMENT '科目二通过数',
  subject2_commission DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT '科目二提成',
  
  -- 科目三相关
  subject3_pass_count INT NOT NULL DEFAULT 0 COMMENT '科目三通过数',
  subject3_commission DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT '科目三提成',
  
  -- 招生相关
  new_student_count INT NOT NULL DEFAULT 0 COMMENT '新招学员数',
  recruitment_commission DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT '招生提成',
  
  -- 调整项
  bonus DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT '奖金',
  deduction DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT '扣薪',
  deduction_reason TEXT COMMENT '扣薪原因',
  
  -- 工资汇总
  gross_salary DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT '应发工资（税前）',
  net_salary DECIMAL(10, 2) DEFAULT NULL COMMENT '实发工资（税后）',
  
  -- 状态标记
  status VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT '状态：draft(草稿), confirmed(已确认), paid(已发放)',
  
  remarks TEXT COMMENT '备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (coach_id) REFERENCES coaches(id) ON DELETE CASCADE,
  UNIQUE KEY uk_coach_month (coach_id, salary_month),
  INDEX idx_salary_month (salary_month),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='教练工资月度表';
