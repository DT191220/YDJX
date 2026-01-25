-- ========================================
-- 财务管理模块 - 数据库脚本
-- 创建日期: 2026-01-24
-- ========================================

-- ========================================
-- 一、创建财务相关表
-- ========================================

-- 1. 财务科目表
CREATE TABLE IF NOT EXISTS finance_subjects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  subject_code VARCHAR(10) UNIQUE NOT NULL COMMENT '科目代码',
  subject_name VARCHAR(50) NOT NULL COMMENT '科目名称',
  subject_type ENUM('资产', '负债', '权益', '收入', '支出') NOT NULL COMMENT '科目类型',
  balance_direction ENUM('借', '贷') NOT NULL COMMENT '余额方向',
  parent_code VARCHAR(10) COMMENT '父级科目代码',
  is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  sort_order INT DEFAULT 0 COMMENT '排序',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='财务科目表';

-- 2. 凭证序号表 (解决并发问题)
CREATE TABLE IF NOT EXISTS finance_voucher_sequence (
  year_month CHAR(6) PRIMARY KEY COMMENT '年月 YYYYMM',
  current_seq INT NOT NULL DEFAULT 0 COMMENT '当前序号'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='凭证序号表';

-- 3. 凭证主表
CREATE TABLE IF NOT EXISTS finance_vouchers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  voucher_no VARCHAR(20) UNIQUE NOT NULL COMMENT '凭证号 YYYYMM-NNN',
  voucher_date DATE NOT NULL COMMENT '记账日期',
  description VARCHAR(500) COMMENT '摘要',
  creator_id INT NOT NULL COMMENT '制单人ID',
  creator_name VARCHAR(50) COMMENT '制单人姓名',
  source_type VARCHAR(50) COMMENT '来源类型: student_payment/coach_salary/manual',
  source_id INT COMMENT '来源业务ID',
  status ENUM('draft', 'posted') DEFAULT 'posted' COMMENT '状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_voucher_date (voucher_date),
  INDEX idx_source (source_type, source_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='财务凭证主表';

-- 4. 凭证明细表 (一凭证多分录)
CREATE TABLE IF NOT EXISTS finance_voucher_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  voucher_id INT NOT NULL COMMENT '凭证ID',
  entry_type ENUM('借', '贷') NOT NULL COMMENT '借贷方向',
  subject_code VARCHAR(10) NOT NULL COMMENT '科目代码',
  amount DECIMAL(12,2) NOT NULL COMMENT '金额(正数)',
  summary VARCHAR(200) COMMENT '摘要',
  seq INT DEFAULT 0 COMMENT '排序序号',
  FOREIGN KEY (voucher_id) REFERENCES finance_vouchers(id) ON DELETE CASCADE,
  INDEX idx_subject_code (subject_code),
  INDEX idx_voucher_id (voucher_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='财务凭证明细表';

-- ========================================
-- 二、初始化科目数据
-- ========================================

INSERT INTO finance_subjects (subject_code, subject_name, subject_type, balance_direction, sort_order) VALUES
-- 资产类 (1xxx)
('1001', '银行存款', '资产', '借', 1),
('1002', '现金', '资产', '借', 2),

-- 负债类 (2xxx)
('2001', '应付总校', '负债', '贷', 10),

-- 收入类 (1xx - 兼容旧编码)
('101', '学员学费', '收入', '贷', 20),
('102', '补考费', '收入', '贷', 21),
('103', '其他收入', '收入', '贷', 22),

-- 支出类 (2xx - 兼容旧编码)
('201', '上缴总校费用', '支出', '借', 30),
('202', '教练车租赁费', '支出', '借', 31),
('203', '场地租赁费', '支出', '借', 32),
('204', '水电网络费', '支出', '借', 33),
('205', '加油/加气费', '支出', '借', 34),
('206', '车辆保险费', '支出', '借', 35),
('207', '车辆维修保养费', '支出', '借', 36),
('208', '办公用品费', '支出', '借', 37),
('209', '教练工资', '支出', '借', 38),
('210', '团建费', '支出', '借', 39),
('211', '餐费', '支出', '借', 40),
('212', '其他支出', '支出', '借', 41)
ON DUPLICATE KEY UPDATE subject_name = VALUES(subject_name);

-- ========================================
-- 三、添加财务模块权限
-- ========================================

-- 先删除可能存在的财务权限（避免重复）
DELETE FROM sys_role_permissions WHERE permission_id IN (
  SELECT id FROM sys_permissions WHERE permission_code LIKE 'finance%'
);
DELETE FROM sys_permissions WHERE permission_code LIKE 'finance%';

-- 插入父级权限（使用 menu 与现有数据保持一致）
INSERT INTO sys_permissions (permission_name, permission_code, permission_type, parent_id, path, icon, sort_order, status) VALUES
('财务管理', 'finance', 'menu', 0, '/finance', 'dollar', 55, '启用');

-- 获取父级ID并插入子权限
SET @finance_parent_id = LAST_INSERT_ID();

INSERT INTO sys_permissions (permission_name, permission_code, permission_type, parent_id, path, icon, sort_order, status) VALUES
('科目管理', 'finance:subjects', 'menu', @finance_parent_id, '/finance/subjects', '', 56, '启用'),
('凭证管理', 'finance:vouchers', 'menu', @finance_parent_id, '/finance/vouchers', '', 57, '启用'),
('凭证录入', 'finance:voucher-entry', 'menu', @finance_parent_id, '/finance/voucher-entry', '', 58, '启用');

-- ========================================
-- 四、为超级管理员分配财务权限
-- ========================================

INSERT INTO sys_role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM sys_roles WHERE role_name = '超级管理员' LIMIT 1),
  id
FROM sys_permissions 
WHERE permission_code LIKE 'finance%';

-- ========================================
-- 完成提示
-- ========================================
SELECT '财务模块数据库脚本执行完成！' as message;
