-- 创建驾校通数据库
CREATE DATABASE IF NOT EXISTS yuandong_driving_school CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE yuandong_driving_school;

-- 创建学员信息表
CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '学员ID',
  name VARCHAR(50) NOT NULL COMMENT '姓名',
  id_card VARCHAR(18) NOT NULL UNIQUE COMMENT '身份证号',
  phone VARCHAR(11) NOT NULL COMMENT '手机号码',
  gender ENUM('男', '女') NOT NULL COMMENT '性别',
  birth_date DATE COMMENT '出生日期',
  address VARCHAR(200) COMMENT '家庭住址',
  enrollment_date DATE NOT NULL COMMENT '报名日期',
  license_type ENUM('C1', 'C2', 'B1', 'B2', 'A1', 'A2', 'A3') NOT NULL COMMENT '报考车型',
  status ENUM('报名', '学习中', '考试中', '已毕业', '已退学') DEFAULT '报名' COMMENT '学习状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_phone (phone),
  INDEX idx_id_card (id_card),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学员信息表';

-- 插入测试数据
INSERT INTO students (name, id_card, phone, gender, birth_date, address, enrollment_date, license_type, status) VALUES
('张三', '110101199001011234', '13800138001', '男', '1990-01-01', '北京市朝阳区', '2024-01-15', 'C1', '学习中'),
('李四', '110101199102021235', '13800138002', '女', '1991-02-02', '北京市海淀区', '2024-01-20', 'C2', '学习中'),
('王五', '110101199203031236', '13800138003', '男', '1992-03-03', '北京市丰台区', '2024-02-01', 'C1', '考试中');
