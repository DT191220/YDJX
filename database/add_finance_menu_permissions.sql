-- 添加财务模块新菜单权限
-- 总校上缴配置
INSERT INTO sys_permissions (permission_code, permission_name, permission_type, parent_id, sort_order)
SELECT 'finance:headquarter-config', '总校上缴配置', 'menu', id, 4
FROM sys_permissions WHERE permission_code = 'finance';

-- 报表中心
INSERT INTO sys_permissions (permission_code, permission_name, permission_type, parent_id, sort_order)
SELECT 'finance:reports', '报表中心', 'menu', id, 5
FROM sys_permissions WHERE permission_code = 'finance';

-- 为管理员角色（假设id=1）添加新权限
INSERT INTO sys_role_permissions (role_id, permission_id)
SELECT 1, id FROM sys_permissions WHERE permission_code IN ('finance:headquarter-config', 'finance:reports');
