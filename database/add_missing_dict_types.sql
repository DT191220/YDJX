-- 添加缺失的字典类型
-- 用于支持缴费管理和考试管理模块的下拉选择

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

USE yuandong_driving_school;

-- 添加字典类型
INSERT IGNORE INTO sys_dict_types (dict_name, dict_type, description, status) VALUES
('缴费状态', 'payment_status', '学员缴费状态', '启用'),
('缴费方式', 'payment_method', '缴费支付方式', '启用'),
('考试结果', 'exam_result', '考试结果状态', '启用');

-- 缴费状态字典数据
INSERT IGNORE INTO sys_dict_data (dict_type, dict_label, dict_value, sort_order, status) VALUES
('payment_status', '未缴费', '未缴费', 1, '启用'),
('payment_status', '部分缴费', '部分缴费', 2, '启用'),
('payment_status', '已缴费', '已缴费', 3, '启用'),
('payment_status', '已退费', '已退费', 4, '启用');

-- 缴费方式字典数据
INSERT IGNORE INTO sys_dict_data (dict_type, dict_label, dict_value, sort_order, status) VALUES
('payment_method', '现金', '现金', 1, '启用'),
('payment_method', 'POS', 'POS', 2, '启用'),
('payment_method', '微信', '微信', 3, '启用'),
('payment_method', '支付宝', '支付宝', 4, '启用'),
('payment_method', '银行转账', '银行转账', 5, '启用'),
('payment_method', '其他', '其他', 6, '启用');

-- 考试结果字典数据
INSERT IGNORE INTO sys_dict_data (dict_type, dict_label, dict_value, sort_order, status) VALUES
('exam_result', '待考试', '待考试', 1, '启用'),
('exam_result', '通过', '通过', 2, '启用'),
('exam_result', '未通过', '未通过', 3, '启用');
