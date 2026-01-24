-- 数据迁移脚本：从历史减免记录中统计并填充discount_amount字段
-- 执行前提：add_discount_amount.sql 已执行

-- 说明：
-- 1. 此脚本从payment_records表中统计所有负数金额记录（减免记录）
-- 2. 将统计结果累加后更新到students表的discount_amount字段
-- 3. 更新完成后重新计算debt_amount（欠费金额 = 合同金额 - 实收金额 - 减免金额）
-- 4. 根据新的债务金额重新计算payment_status和enrollment_status

-- 步骤1: 统计每个学员的累计减免金额并更新到students表
UPDATE students s
SET discount_amount = COALESCE((
    SELECT ABS(SUM(amount))
    FROM payment_records pr
    WHERE pr.student_id = s.id
    AND pr.amount < 0  -- 负数金额表示减免
), 0);

-- 步骤2: 重新计算欠费金额
UPDATE students
SET debt_amount = contract_amount - actual_amount - discount_amount;

-- 步骤3: 重新计算缴费状态和报名状态
-- 情况1: 实收金额 + 减免金额 >= 合同金额 -> 已缴费
UPDATE students
SET payment_status = '已缴费',
    enrollment_status = '报名已缴费'
WHERE actual_amount + discount_amount >= contract_amount
  AND payment_status != '已退费';  -- 排除已退费状态

-- 情况2: 实收金额 + 减免金额 > 0 但 < 合同金额 -> 部分缴费
UPDATE students
SET payment_status = '部分缴费',
    enrollment_status = '报名部分缴费'
WHERE actual_amount + discount_amount > 0
  AND actual_amount + discount_amount < contract_amount
  AND payment_status != '已退费';  -- 排除已退费状态

-- 情况3: 实收金额 + 减免金额 = 0 -> 未缴费
UPDATE students
SET payment_status = '未缴费',
    enrollment_status = '报名未缴费'
WHERE actual_amount + discount_amount = 0
  AND payment_status != '已退费';  -- 排除已退费状态

-- 验证查询: 显示所有有减免记录的学员信息
SELECT 
    id,
    name,
    contract_amount AS 合同金额,
    actual_amount AS 实收金额,
    discount_amount AS 减免金额,
    debt_amount AS 欠费金额,
    payment_status AS 缴费状态,
    enrollment_status AS 报名状态
FROM students
WHERE discount_amount > 0
ORDER BY id;

-- 统计信息
SELECT 
    COUNT(*) AS 有减免记录的学员数,
    SUM(discount_amount) AS 累计减免金额,
    AVG(discount_amount) AS 平均减免金额
FROM students
WHERE discount_amount > 0;
