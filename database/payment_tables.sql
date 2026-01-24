-- 报名与缴费管理模块数据库表

-- 1. 创建班型表
CREATE TABLE IF NOT EXISTS class_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE COMMENT '班型名称',
  contract_amount DECIMAL(10,2) NOT NULL COMMENT '合同金额（默认报价）',
  description TEXT COMMENT '班型描述',
  status ENUM('启用', '禁用') DEFAULT '启用' COMMENT '状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='班型表';

-- 2. 创建服务内容配置表
CREATE TABLE IF NOT EXISTS service_configs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_type_id INT NOT NULL COMMENT '班型ID',
  subject ENUM('科目一', '科目二', '科目三', '科目四') NOT NULL COMMENT '科目',
  service_content TEXT NOT NULL COMMENT '服务内容',
  is_included TINYINT(1) DEFAULT 1 COMMENT '是否包含（1=包含，0=不包含）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_type_id) REFERENCES class_types(id) ON DELETE CASCADE,
  INDEX idx_class_type (class_type_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='服务内容配置表';

-- 3. 创建缴费记录表
CREATE TABLE IF NOT EXISTS payment_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL COMMENT '学员ID',
  amount DECIMAL(10,2) NOT NULL COMMENT '缴费金额',
  payment_date DATE NOT NULL COMMENT '缴费日期',
  payment_method ENUM('现金', 'POS', '微信', '支付宝', '银行转账', '其他') NOT NULL COMMENT '缴费方式',
  operator VARCHAR(50) NOT NULL COMMENT '经办人',
  notes TEXT COMMENT '备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  INDEX idx_student (student_id),
  INDEX idx_payment_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='缴费记录表';

-- 4. 更新学员表，添加缴费相关字段
ALTER TABLE students 
  ADD COLUMN class_type_id INT DEFAULT NULL COMMENT '班型ID' AFTER coach_name,
  ADD COLUMN contract_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '合同金额' AFTER class_type_id,
  ADD COLUMN actual_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '实收金额' AFTER contract_amount,
  ADD COLUMN debt_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '欠费金额' AFTER actual_amount,
  ADD COLUMN payment_status ENUM('未缴费', '部分缴费', '已缴费', '欠费', '已退费') DEFAULT '未缴费' COMMENT '缴费状态' AFTER debt_amount,
  ADD INDEX idx_class_type (class_type_id),
  ADD INDEX idx_payment_status (payment_status);

-- 5. 插入默认班型数据
INSERT INTO class_types (name, contract_amount, description, status) VALUES
('特惠班', 3500.00, '基础学车套餐，包含科目一至科目四基础培训', '启用'),
('普通班', 4500.00, '标准学车套餐，包含全科目培训及模拟考试', '启用'),
('VIP班', 6500.00, 'VIP专属服务，优先排班，一对一指导', '启用'),
('SVIP班', 8500.00, '超级VIP服务，全程专属教练，快速拿证', '启用'),
('优享班', 5500.00, '优质学车体验，含模拟考试及补考费用', '启用');

-- 6. 创建班型价格历史表
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

-- 7. 为每个班型插入服务内容配置

-- 特惠班服务配置
INSERT INTO service_configs (class_type_id, subject, service_content, is_included) VALUES
(1, '科目一', '理论培训、题库练习、模拟考试1次', 1),
(1, '科目二', '基础训练20课时、场地模拟2次', 1),
(1, '科目三', '路面训练15课时、实际道路模拟1次', 1),
(1, '科目四', '安全文明驾驶理论培训、题库练习', 1);

-- 普通班服务配置
INSERT INTO service_configs (class_type_id, subject, service_content, is_included) VALUES
(2, '科目一', '理论培训、题库练习、模拟考试2次', 1),
(2, '科目二', '基础训练30课时、场地模拟3次', 1),
(2, '科目三', '路面训练20课时、实际道路模拟2次', 1),
(2, '科目四', '安全文明驾驶理论培训、题库练习、模拟考试1次', 1);

-- VIP班服务配置
INSERT INTO service_configs (class_type_id, subject, service_content, is_included) VALUES
(3, '科目一', '一对一理论辅导、题库练习、模拟考试不限次数', 1),
(3, '科目二', '专属教练训练40课时、场地模拟5次、优先排班', 1),
(3, '科目三', '专属教练路面训练30课时、实际道路模拟3次、优先考试', 1),
(3, '科目四', '一对一安全文明辅导、题库练习、模拟考试不限次数', 1);

-- SVIP班服务配置
INSERT INTO service_configs (class_type_id, subject, service_content, is_included) VALUES
(4, '科目一', '专属VIP教室、一对一理论辅导、题库练习、模拟考试不限次数', 1),
(4, '科目二', '全程专属教练、训练时间不限、场地模拟不限次数、最优先排班', 1),
(4, '科目三', '全程专属教练、训练时间不限、实际道路模拟不限次数、最优先考试', 1),
(4, '科目四', '专属VIP教室、一对一安全文明辅导、题库练习、模拟考试不限次数', 1);

-- 优享班服务配置
INSERT INTO service_configs (class_type_id, subject, service_content, is_included) VALUES
(5, '科目一', '理论培训、题库练习、模拟考试3次、含首次补考费', 1),
(5, '科目二', '基础训练35课时、场地模拟4次、含首次补考费', 1),
(5, '科目三', '路面训练25课时、实际道路模拟3次、含首次补考费', 1),
(5, '科目四', '安全文明驾驶理论培训、题库练习、模拟考试2次', 1);
