-- 添加科二/科三教学教练字段
-- 用于记录学员的科目二和科目三教学教练

USE yuandong_driving_school;

-- 添加科二教学教练字段
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS coach_subject2_name VARCHAR(50) COMMENT '科二教学教练' AFTER coach_name;

-- 添加科三教学教练字段
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS coach_subject3_name VARCHAR(50) COMMENT '科三教学教练' AFTER coach_subject2_name;

-- 如果 IF NOT EXISTS 不支持，使用存储过程
DROP PROCEDURE IF EXISTS add_coach_columns;
DELIMITER //
CREATE PROCEDURE add_coach_columns()
BEGIN
    DECLARE col_exists INT DEFAULT 0;
    
    -- 检查 coach_subject2_name 是否存在
    SELECT COUNT(*) INTO col_exists
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'students'
    AND COLUMN_NAME = 'coach_subject2_name';
    
    IF col_exists = 0 THEN
        ALTER TABLE students ADD COLUMN coach_subject2_name VARCHAR(50) COMMENT '科二教学教练' AFTER coach_name;
    END IF;
    
    -- 检查 coach_subject3_name 是否存在
    SET col_exists = 0;
    SELECT COUNT(*) INTO col_exists
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'students'
    AND COLUMN_NAME = 'coach_subject3_name';
    
    IF col_exists = 0 THEN
        ALTER TABLE students ADD COLUMN coach_subject3_name VARCHAR(50) COMMENT '科三教学教练' AFTER coach_subject2_name;
    END IF;
END //
DELIMITER ;

CALL add_coach_columns();
DROP PROCEDURE IF EXISTS add_coach_columns;

SELECT '科二/科三教练字段添加完成' as message;
