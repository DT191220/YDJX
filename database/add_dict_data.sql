-- 补充字典类型和字典数据
-- 用于支持系统各模块的下拉选择

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

USE yuandong_driving_school;

-- 先删除之前插入的乱码数据
DELETE FROM sys_dict_data WHERE dict_type IN ('enrollment_status', 'coach_status', 'driving_experience', 'teaching_subject');
DELETE FROM sys_dict_types WHERE dict_type IN ('enrollment_status', 'coach_status', 'driving_experience', 'teaching_subject');

-- 补充字典类型
INSERT INTO sys_dict_types (dict_name, dict_type, description, status) VALUES
('报名状态', 'enrollment_status', '学员报名状态', '启用'),
('教练状态', 'coach_status', '教练在职状态', '启用'),
('驾驶经验', 'driving_experience', '是否有驾驶经验', '启用'),
('教学科目', 'teaching_subject', '教练教学科目', '启用');

-- 补充字典数据 - 报名状态
INSERT INTO sys_dict_data (dict_type, dict_label, dict_value, sort_order, status) VALUES
('enrollment_status', '咨询中', '咨询中', 1, '启用'),
('enrollment_status', '预约报名', '预约报名', 2, '启用'),
('enrollment_status', '报名未缴费', '报名未缴费', 3, '启用'),
('enrollment_status', '报名部分缴费', '报名部分缴费', 4, '启用'),
('enrollment_status', '报名已缴费', '报名已缴费', 5, '启用'),
('enrollment_status', '已退费', '已退费', 6, '启用'),
('enrollment_status', '废考', '废考', 7, '启用');

-- 补充字典数据 - 教练状态
INSERT INTO sys_dict_data (dict_type, dict_label, dict_value, sort_order, status) VALUES
('coach_status', '在职', '在职', 1, '启用'),
('coach_status', '离职', '离职', 2, '启用'),
('coach_status', '休假', '休假', 3, '启用');

-- 补充字典数据 - 驾驶经验
INSERT INTO sys_dict_data (dict_type, dict_label, dict_value, sort_order, status) VALUES
('driving_experience', '有', '有', 1, '启用'),
('driving_experience', '无', '无', 2, '启用');

-- 补充字典数据 - 教学科目
INSERT INTO sys_dict_data (dict_type, dict_label, dict_value, sort_order, status) VALUES
('teaching_subject', '科目二', '科目二', 1, '启用'),
('teaching_subject', '科目三', '科目三', 2, '启用'),
('teaching_subject', '科目二,科目三', '科目二,科目三', 3, '启用');

-- 更新性别字典数据（使用中文值，与业务数据一致）
UPDATE sys_dict_data SET dict_value = '男' WHERE dict_type = 'gender' AND dict_label = '男';
UPDATE sys_dict_data SET dict_value = '女' WHERE dict_type = 'gender' AND dict_label = '女';
