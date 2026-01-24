-- 添加减免金额字段
-- 用于正确计算欠费金额和缴费状态

USE yuandong_driving_school;

-- 添加 discount_amount 字段
ALTER TABLE students 
ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '减免金额' 
AFTER actual_amount;

-- 验证字段添加
DESCRIBE students;

-- 查看现有学员的金额数据
SELECT 
  id,
  name,
  contract_amount,
  actual_amount,
  discount_amount,
  debt_amount,
  payment_status
FROM students
WHERE class_type_id IS NOT NULL
LIMIT 10;
