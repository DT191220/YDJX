-- ========================================
-- 上缴确认功能 - 数据库脚本
-- 创建日期: 2026-01-27
-- ========================================

USE yuandong_driving_school;

-- 1. 在students表添加上缴状态字段
-- 使用安全添加方式
DROP PROCEDURE IF EXISTS add_column_if_not_exists;
DELIMITER //
CREATE PROCEDURE add_column_if_not_exists(
    IN table_name VARCHAR(64),
    IN column_name VARCHAR(64),
    IN column_definition VARCHAR(500)
)
BEGIN
    DECLARE column_exists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO column_exists
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = table_name
    AND COLUMN_NAME = column_name;
    
    IF column_exists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE ', table_name, ' ADD COLUMN ', column_name, ' ', column_definition);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        SELECT CONCAT('Added column: ', column_name) as result;
    ELSE
        SELECT CONCAT('Column exists: ', column_name) as result;
    END IF;
END //
DELIMITER ;

-- 添加上缴状态字段
CALL add_column_if_not_exists('students', 'submit_status', 'ENUM("未上缴", "已上缴") DEFAULT "未上缴" COMMENT "上缴状态"');
CALL add_column_if_not_exists('students', 'submit_amount', 'DECIMAL(12,2) DEFAULT 0.00 COMMENT "上缴金额"');
CALL add_column_if_not_exists('students', 'submit_date', 'DATE DEFAULT NULL COMMENT "上缴日期"');
CALL add_column_if_not_exists('students', 'submit_operator', 'VARCHAR(50) DEFAULT NULL COMMENT "上缴经办人"');

-- 清理临时存储过程
DROP PROCEDURE IF EXISTS add_column_if_not_exists;

-- 2. 创建上缴记录表（用于记录历史）
CREATE TABLE IF NOT EXISTS submit_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL COMMENT '学员ID',
  student_name VARCHAR(50) NOT NULL COMMENT '学员姓名',
  class_type_name VARCHAR(50) COMMENT '班型名称',
  contract_amount DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '合同金额',
  actual_amount DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '实收金额',
  account_balance DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '账户余额',
  final_receipt DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '最终实收（实收+余额）',
  submit_amount DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '上缴金额',
  profit DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '利润',
  config_id INT COMMENT '使用的配置ID',
  config_name VARCHAR(100) COMMENT '配置名称',
  config_type VARCHAR(20) COMMENT '配置类型(ratio/fixed)',
  config_value VARCHAR(50) COMMENT '配置值',
  operator VARCHAR(50) NOT NULL COMMENT '经办人',
  submit_date DATE NOT NULL COMMENT '上缴日期',
  voucher_no VARCHAR(20) COMMENT '关联凭证号',
  remark TEXT COMMENT '备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_student_id (student_id),
  INDEX idx_submit_date (submit_date),
  INDEX idx_voucher_no (voucher_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='上缴记录表';

-- 3. 为students表的submit_status字段添加索引
-- 检查索引是否存在，不存在则创建
DROP PROCEDURE IF EXISTS add_index_if_not_exists;
DELIMITER //
CREATE PROCEDURE add_index_if_not_exists(
    IN table_name VARCHAR(64),
    IN index_name VARCHAR(64),
    IN index_columns VARCHAR(500)
)
BEGIN
    DECLARE index_exists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO index_exists
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = table_name
    AND INDEX_NAME = index_name;
    
    IF index_exists = 0 THEN
        SET @sql = CONCAT('CREATE INDEX ', index_name, ' ON ', table_name, ' (', index_columns, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        SELECT CONCAT('Created index: ', index_name) as result;
    ELSE
        SELECT CONCAT('Index exists: ', index_name) as result;
    END IF;
END //
DELIMITER ;

CALL add_index_if_not_exists('students', 'idx_submit_status', 'submit_status');

DROP PROCEDURE IF EXISTS add_index_if_not_exists;

SELECT 'Submit records table and fields created successfully!' as message;
