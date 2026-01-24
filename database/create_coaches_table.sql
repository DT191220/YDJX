-- 创建教练信息表
USE yuandong_driving_school;

CREATE TABLE IF NOT EXISTS coaches (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '教练ID',
  name VARCHAR(50) NOT NULL COMMENT '教练姓名',
  id_card VARCHAR(18) NOT NULL UNIQUE COMMENT '身份证号',
  phone VARCHAR(11) NOT NULL COMMENT '联系电话',
  gender VARCHAR(10) NOT NULL COMMENT '性别',
  birth_date DATE NOT NULL COMMENT '出生日期',
  age INT NOT NULL COMMENT '年龄',
  address VARCHAR(200) COMMENT '联系地址',
  license_type VARCHAR(50) COMMENT '驾照类型',
  teaching_certificate VARCHAR(50) COMMENT '教练证号',
  certificate_date DATE COMMENT '教练证获取日期',
  teaching_subjects VARCHAR(100) COMMENT '教学科目(如:科目二,科目三)',
  employment_date DATE COMMENT '入职日期',
  status VARCHAR(20) DEFAULT '在职' COMMENT '状态',
  remarks TEXT COMMENT '备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_name (name),
  INDEX idx_id_card (id_card),
  INDEX idx_phone (phone),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='教练信息表';

SELECT '教练信息表创建完成' as message;
