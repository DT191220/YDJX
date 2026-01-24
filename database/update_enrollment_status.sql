-- 更新学员报名状态枚举值
-- 变更内容：
-- 1. 已报名已缴费 → 报名已缴费
-- 2. 新增：报名部分缴费
-- 3. 删除：学习中、考试中、已毕业

USE yuandong_driving_school;

-- 步骤1：检查当前数据中被删除状态的使用情况
SELECT 
  enrollment_status,
  COUNT(*) as count
FROM students
WHERE enrollment_status IN ('学习中', '考试中', '已毕业')
GROUP BY enrollment_status;

-- 步骤2：将现有数据迁移到新状态
-- 学习中 → 报名已缴费（假设学习中的学员已完成缴费）
-- 考试中 → 报名已缴费（假设考试中的学员已完成缴费）
-- 已毕业 → 报名已缴费（假设已毕业的学员已完成缴费）
UPDATE students 
SET enrollment_status = '报名已缴费'
WHERE enrollment_status IN ('学习中', '考试中', '已毕业', '已报名已缴费');

-- 步骤3：修改枚举定义
ALTER TABLE students 
MODIFY COLUMN enrollment_status ENUM(
  '咨询中',
  '预约报名',
  '报名未缴费',
  '报名已缴费',
  '报名部分缴费',
  '已退费'
) DEFAULT '咨询中' COMMENT '报名状态';

-- 步骤4：验证修改结果
DESCRIBE students;

-- 步骤5：查看所有学员的报名状态分布
SELECT 
  enrollment_status,
  COUNT(*) as count
FROM students
GROUP BY enrollment_status
ORDER BY 
  FIELD(enrollment_status, '咨询中', '预约报名', '报名未缴费', '报名部分缴费', '报名已缴费', '已退费');
