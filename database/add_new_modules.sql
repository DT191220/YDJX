-- ========================================
-- 驾校管理系统功能扩展 - 数据库脚本
-- 创建日期: 2026-01-19
-- ========================================

-- ========================================
-- 一、修正功能：学员表增加驾照类型字段
-- ========================================
ALTER TABLE students 
ADD COLUMN license_type VARCHAR(10) DEFAULT 'C1' COMMENT '驾照类型(C1/C2等)' 
AFTER class_type_id;

-- ========================================
-- 二、考试管理模块
-- ========================================

-- 1. 考试场地配置表
CREATE TABLE exam_venues (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '场地ID',
  name VARCHAR(50) UNIQUE NOT NULL COMMENT '场地名称',
  address VARCHAR(200) COMMENT '场地地址',
  is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='考试场地配置表';

-- 2. 考试安排表
CREATE TABLE exam_schedules (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '考试ID',
  exam_date DATE NOT NULL COMMENT '考试日期',
  exam_type ENUM('科目一','科目二','科目三','科目四') NOT NULL COMMENT '考试类型',
  venue_id INT NOT NULL COMMENT '考试场地ID',
  capacity INT NOT NULL COMMENT '可容纳人数',
  arranged_count INT DEFAULT 0 COMMENT '已安排人数',
  person_in_charge VARCHAR(50) COMMENT '负责人',
  notes TEXT COMMENT '备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (venue_id) REFERENCES exam_venues(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='考试安排表';

-- 3. 学员考试报名表（学员与考试的关联表）
CREATE TABLE exam_registrations (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '报名ID',
  student_id INT NOT NULL COMMENT '学员ID',
  exam_schedule_id INT NOT NULL COMMENT '考试安排ID',
  registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '报名时间',
  exam_result ENUM('待考试','通过','未通过') DEFAULT '待考试' COMMENT '考试结果',
  exam_score DECIMAL(5,2) COMMENT '考试分数',
  notes TEXT COMMENT '备注',
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (exam_schedule_id) REFERENCES exam_schedules(id) ON DELETE CASCADE,
  UNIQUE KEY uk_student_exam (student_id, exam_schedule_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学员考试报名表';

-- ========================================
-- 三、学员学习跟踪模块
-- ========================================

-- 1. 学员考试进度表
CREATE TABLE student_exam_progress (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '进度ID',
  student_id INT UNIQUE NOT NULL COMMENT '学员ID',
  license_type VARCHAR(10) COMMENT '驾照类型',
  
  subject1_status ENUM('未考','已通过','未通过') DEFAULT '未考' COMMENT '科目一状态',
  subject1_pass_date DATE COMMENT '科目一通过日期',
  
  subject2_status ENUM('未考','已通过','未通过') DEFAULT '未考' COMMENT '科目二状态',
  subject2_pass_date DATE COMMENT '科目二通过日期',
  
  subject3_status ENUM('未考','已通过','未通过') DEFAULT '未考' COMMENT '科目三状态',
  subject3_pass_date DATE COMMENT '科目三通过日期',
  
  subject4_status ENUM('未考','已通过','未通过') DEFAULT '未考' COMMENT '科目四状态',
  subject4_pass_date DATE COMMENT '科目四通过日期',
  
  total_progress INT DEFAULT 0 COMMENT '总进度百分比(0-100)',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学员考试进度表';

-- 2. 系统提醒表
CREATE TABLE system_reminders (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '提醒ID',
  student_id INT NOT NULL COMMENT '学员ID',
  reminder_type ENUM('考试提醒','训练提醒','到期提醒') NOT NULL COMMENT '提醒类型',
  reminder_content VARCHAR(200) NOT NULL COMMENT '提醒内容',
  reminder_time DATETIME NOT NULL COMMENT '提醒时间',
  is_read BOOLEAN DEFAULT FALSE COMMENT '是否已读',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  INDEX idx_unread (is_read, reminder_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统提醒表';

-- ========================================
-- 四、教练管理模块
-- ========================================

-- 1. 创建教练信息基础表
CREATE TABLE IF NOT EXISTS coaches (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '教练ID',
  name VARCHAR(50) NOT NULL COMMENT '姓名',
  phone VARCHAR(11) NOT NULL COMMENT '手机号码',
  id_card VARCHAR(18) COMMENT '身份证号',
  hire_date DATE COMMENT '入职日期',
  photo_url VARCHAR(255) COMMENT '照片URL',
  certificate_url VARCHAR(255) COMMENT '资质证书图片URL',
  max_students INT DEFAULT 20 COMMENT '带教学员上限',
  base_daily_salary DECIMAL(10,2) DEFAULT 0.00 COMMENT '基础日薪',
  status ENUM('在职','离职') DEFAULT '在职' COMMENT '状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_phone (phone),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='教练信息表';

-- 3. 学员学习计划表（依赖coaches表，需在coaches表创建后创建）
CREATE TABLE student_study_plans (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '计划ID',
  student_id INT NOT NULL COMMENT '学员ID',
  plan_type ENUM('日常练车','模拟考试','正式考试') NOT NULL COMMENT '事项类型',
  plan_date DATE NOT NULL COMMENT '计划日期',
  time_slot VARCHAR(20) COMMENT '时间段(如: 9:00-11:00)',
  coach_id INT COMMENT '教练ID',
  status ENUM('待完成','已完成','已取消') DEFAULT '待完成' COMMENT '状态',
  reminder_time DATETIME COMMENT '提醒时间',
  notes TEXT COMMENT '备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (coach_id) REFERENCES coaches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学员学习计划表';

-- 2. 工资配置表
CREATE TABLE salary_configs (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '配置ID',
  config_name VARCHAR(50) NOT NULL COMMENT '配置项名称',
  config_type ENUM('基础日薪','科目二提成','科目三提成','招生提成') NOT NULL COMMENT '配置类型',
  config_value DECIMAL(10,2) NOT NULL COMMENT '配置值',
  effective_date DATE NOT NULL COMMENT '生效日期',
  notes TEXT COMMENT '备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_type_date (config_type, effective_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工资配置表';

-- 3. 教练工资月度表
CREATE TABLE coach_monthly_salaries (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '工资记录ID',
  coach_id INT NOT NULL COMMENT '教练ID',
  salary_month VARCHAR(7) NOT NULL COMMENT '统计月份(YYYY-MM)',
  
  attendance_days INT DEFAULT 0 COMMENT '出勤天数',
  base_salary DECIMAL(10,2) DEFAULT 0.00 COMMENT '基础工资',
  
  subject2_pass_count INT DEFAULT 0 COMMENT '科目二通过数',
  subject3_pass_count INT DEFAULT 0 COMMENT '科目三通过数',
  exam_commission DECIMAL(10,2) DEFAULT 0.00 COMMENT '考试提成',
  
  new_student_count INT DEFAULT 0 COMMENT '新招学员数',
  recruit_commission DECIMAL(10,2) DEFAULT 0.00 COMMENT '招生提成',
  
  bonus DECIMAL(10,2) DEFAULT 0.00 COMMENT '奖金',
  deduction DECIMAL(10,2) DEFAULT 0.00 COMMENT '扣薪',
  deduction_reason TEXT COMMENT '扣薪原因',
  
  gross_salary DECIMAL(10,2) DEFAULT 0.00 COMMENT '应发工资(税前)',
  net_salary DECIMAL(10,2) DEFAULT 0.00 COMMENT '实发工资(税后)',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (coach_id) REFERENCES coaches(id) ON DELETE CASCADE,
  UNIQUE KEY uk_coach_month (coach_id, salary_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='教练工资月度表';

-- ========================================
-- 五、账务管理模块
-- ========================================

-- 1. 收支分类表（固定数据）
CREATE TABLE account_categories (
  code VARCHAR(10) PRIMARY KEY COMMENT '科目代码',
  name VARCHAR(50) NOT NULL COMMENT '科目名称',
  category_type ENUM('收入','支出') NOT NULL COMMENT '分类类型',
  is_system BOOLEAN DEFAULT TRUE COMMENT '是否系统预设(不可删除)',
  sort_order INT DEFAULT 0 COMMENT '排序'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='收支分类表';

-- 2. 总校上缴配置表
CREATE TABLE headquarters_payment_config (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '配置ID',
  config_type ENUM('按比例','固定金额') NOT NULL COMMENT '配置类型',
  ratio_value DECIMAL(5,4) COMMENT '比例值(如0.3表示30%)',
  fixed_amount DECIMAL(10,2) COMMENT '固定金额值',
  effective_date DATE NOT NULL COMMENT '生效日期',
  notes TEXT COMMENT '备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='总校上缴配置表';

-- 3. 记账凭证表
CREATE TABLE accounting_vouchers (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '凭证ID',
  voucher_no VARCHAR(20) UNIQUE NOT NULL COMMENT '凭证号(格式:YYYYMM-001)',
  voucher_date DATE NOT NULL COMMENT '记账日期',
  description VARCHAR(200) NOT NULL COMMENT '摘要',
  
  debit_account_code VARCHAR(10) NOT NULL COMMENT '借方科目代码',
  debit_amount DECIMAL(10,2) NOT NULL COMMENT '借方金额',
  
  credit_account_code VARCHAR(10) NOT NULL COMMENT '贷方科目代码',
  credit_amount DECIMAL(10,2) NOT NULL COMMENT '贷方金额',
  
  operator VARCHAR(50) COMMENT '经手人',
  attachment1_url VARCHAR(255) COMMENT '附件1',
  attachment2_url VARCHAR(255) COMMENT '附件2',
  attachment3_url VARCHAR(255) COMMENT '附件3',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (debit_account_code) REFERENCES account_categories(code),
  FOREIGN KEY (credit_account_code) REFERENCES account_categories(code),
  INDEX idx_date (voucher_date),
  INDEX idx_voucher_no (voucher_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='记账凭证表';

-- ========================================
-- 六、初始化数据
-- ========================================

-- 1. 初始化收支分类数据
INSERT INTO account_categories (code, name, category_type, is_system, sort_order) VALUES
-- 收入类
('101', '学员学费', '收入', TRUE, 1),
('102', '补考费', '收入', TRUE, 2),
('103', '其他收入', '收入', TRUE, 3),

-- 支出类
('201', '上缴总校费用', '支出', TRUE, 1),
('202', '教练车租赁费', '支出', TRUE, 2),
('203', '场地租赁费', '支出', TRUE, 3),
('204', '水电网络费', '支出', TRUE, 4),
('205', '加油/加气费', '支出', TRUE, 5),
('206', '车辆保险费', '支出', TRUE, 6),
('207', '车辆维修保养费', '支出', TRUE, 7),
('208', '办公用品费', '支出', TRUE, 8),
('209', '教练工资', '支出', TRUE, 9),
('210', '团建费', '支出', TRUE, 10),
('211', '餐费', '支出', TRUE, 11),
('212', '其他支出', '支出', TRUE, 12);

-- 2. 初始化考试场地示例数据
INSERT INTO exam_venues (name, address, is_active) VALUES
('市驾考中心', '市中心区驾考路1号', TRUE),
('东城考场', '东城区学府路88号', TRUE),
('西郊考场', '西郊开发区科技大道200号', TRUE);

-- 3. 初始化工资配置示例数据
INSERT INTO salary_configs (config_name, config_type, config_value, effective_date, notes) VALUES
('基础日薪标准', '基础日薪', 150.00, '2026-01-01', '2026年度标准'),
('科目二考试提成', '科目二提成', 50.00, '2026-01-01', '每通过一人提成50元'),
('科目三考试提成', '科目三提成', 80.00, '2026-01-01', '每通过一人提成80元'),
('招生提成标准', '招生提成', 100.00, '2026-01-01', '每新招一人提成100元');

-- 4. 初始化总校上缴配置示例数据
INSERT INTO headquarters_payment_config (config_type, ratio_value, fixed_amount, effective_date, notes) VALUES
('按比例', 0.3000, NULL, '2026-01-01', '学费的30%上缴总校');

-- ========================================
-- 七、为现有学员创建考试进度记录
-- ========================================
INSERT INTO student_exam_progress (student_id, license_type)
SELECT id, COALESCE(license_type, 'C1')
FROM students
WHERE NOT EXISTS (
  SELECT 1 FROM student_exam_progress WHERE student_id = students.id
);

-- ========================================
-- 完成提示
-- ========================================
SELECT '数据库脚本执行完成！' as message;
