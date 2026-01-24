-- 修复学员表缺失字段
-- 解决学员列表查询500错误
-- 注意：此脚本使用存储过程安全添加字段，兼容各版本MySQL

USE yuandong_driving_school;

-- 创建安全添加字段的存储过程
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
        SELECT CONCAT('已添加字段: ', column_name) as result;
    ELSE
        SELECT CONCAT('字段已存在: ', column_name) as result;
    END IF;
END //
DELIMITER ;

-- 1. 添加缺失的基本信息字段
CALL add_column_if_not_exists('students', 'age', 'INT COMMENT "年龄"');
CALL add_column_if_not_exists('students', 'native_place', 'VARCHAR(100) COMMENT "籍贯"');

-- 2. 添加健康与驾驶经历字段
CALL add_column_if_not_exists('students', 'medical_history', 'TEXT COMMENT "既往病史"');
CALL add_column_if_not_exists('students', 'has_driving_experience', 'ENUM("无", "有") DEFAULT "无" COMMENT "驾驶经历"');
CALL add_column_if_not_exists('students', 'driving_years', 'INT DEFAULT 0 COMMENT "曾驾驶年限"');
CALL add_column_if_not_exists('students', 'previous_school_history', 'TEXT COMMENT "他校学习过往"');

-- 3. 添加紧急联系人字段
CALL add_column_if_not_exists('students', 'emergency_contact', 'VARCHAR(50) COMMENT "紧急联系人"');
CALL add_column_if_not_exists('students', 'emergency_phone', 'VARCHAR(11) COMMENT "紧急联系电话"');

-- 4. 添加教练信息字段
CALL add_column_if_not_exists('students', 'coach_id', 'INT COMMENT "教练ID"');
CALL add_column_if_not_exists('students', 'coach_name', 'VARCHAR(50) COMMENT "教练姓名"');

-- 5. 添加登记人信息字段
CALL add_column_if_not_exists('students', 'registrar_id', 'INT COMMENT "登记人ID"');
CALL add_column_if_not_exists('students', 'registrar_name', 'VARCHAR(50) COMMENT "登记人姓名"');

-- 6. 确保金额字段存在
CALL add_column_if_not_exists('students', 'class_type_id', 'INT COMMENT "班型ID"');
CALL add_column_if_not_exists('students', 'contract_amount', 'DECIMAL(10,2) DEFAULT 0.00 COMMENT "合同金额"');
CALL add_column_if_not_exists('students', 'actual_amount', 'DECIMAL(10,2) DEFAULT 0.00 COMMENT "实收金额"');
CALL add_column_if_not_exists('students', 'discount_amount', 'DECIMAL(10,2) DEFAULT 0.00 COMMENT "减免金额"');
CALL add_column_if_not_exists('students', 'debt_amount', 'DECIMAL(10,2) DEFAULT 0.00 COMMENT "欠费金额"');
CALL add_column_if_not_exists('students', 'payment_status', 'ENUM("未缴费", "部分缴费", "已缴费", "欠费", "已退费") DEFAULT "未缴费" COMMENT "缴费状态"');

-- 7. 修改 enrollment_date 允许为空（新学员可能还没报名日期）
ALTER TABLE students MODIFY COLUMN enrollment_date DATE NULL COMMENT '报名日期';

-- 8. 清理临时存储过程
DROP PROCEDURE IF EXISTS add_column_if_not_exists;

-- 9. 验证表结构
DESCRIBE students;

SELECT '学员表字段修复完成！' as message;
