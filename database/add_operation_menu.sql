-- 运营管理模块菜单权限
-- 执行前请确保 sys_menus 表存在

-- 添加运营管理一级菜单
INSERT INTO sys_menus (menu_name, menu_path, permission_code, parent_id, menu_type, icon, sort_order) VALUES
('运营管理', NULL, 'operations', 0, 'group', 'OperationsIcon', 35);

-- 获取刚插入的菜单ID（用于子菜单的parent_id）
SET @operations_menu_id = LAST_INSERT_ID();

-- 添加运营支出子菜单
INSERT INTO sys_menus (menu_name, menu_path, permission_code, parent_id, menu_type, icon, sort_order) VALUES
('支出管理', '/operations/expenses', 'operations:expenses', @operations_menu_id, 'menu', 'ExpenseIcon', 1);

-- 添加菜单访问权限（必须，否则菜单不显示）
INSERT INTO sys_permissions (permission_name, permission_code, permission_type, status) VALUES
('运营管理访问', 'operations', 'menu', '启用'),
('支出管理访问', 'operations:expenses', 'menu', '启用');

-- 添加操作权限
INSERT INTO sys_permissions (permission_name, permission_code, permission_type, status) VALUES
('运营支出查看', 'operations:expense:view', 'button', '启用'),
('运营支出配置', 'operations:expense:config', 'button', '启用'),
('运营支出支付', 'operations:expense:pay', 'button', '启用');

-- 为管理员角色授权（假设管理员角色ID为1）
-- 请根据实际角色ID调整
INSERT INTO sys_role_permissions (role_id, permission_id)
SELECT 1, id FROM sys_permissions WHERE permission_code LIKE 'operations%';
