-- 删除"欠费"缴费状态
-- 执行此SQL前，建议先备份数据库

-- 1. 检查是否有学员的缴费状态为"欠费"
SELECT id, name, payment_status, debt_amount, actual_amount, contract_amount 
FROM students 
WHERE payment_status = '欠费';

-- 2. 将所有"欠费"状态的学员更新为"部分缴费"（如果实收金额>0）或"未缴费"（如果实收金额=0）
UPDATE students 
SET payment_status = CASE 
  WHEN actual_amount > 0 THEN '部分缴费'
  ELSE '未缴费'
END
WHERE payment_status = '欠费';

-- 3. 修改payment_status字段，删除"欠费"枚举值
ALTER TABLE students 
MODIFY COLUMN payment_status ENUM('未缴费', '部分缴费', '已缴费', '已退费') DEFAULT '未缴费' COMMENT '缴费状态';

-- 执行完成后，验证字段定义
SHOW COLUMNS FROM students LIKE 'payment_status';
