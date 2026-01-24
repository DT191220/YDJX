-- 诊断脚本：检查考试管理菜单权限是否正确创建

-- 1. 检查权限是否插入成功
SELECT id, permission_name, permission_code, permission_type, parent_id, path, sort_order, status
FROM sys_permissions 
WHERE permission_code IN ('exam', 'exam:venue', 'exam:schedule')
ORDER BY id;

-- 2. 检查超级管理员角色是否有这些权限
SELECT rp.id, rp.role_id, rp.permission_id, p.permission_code, p.permission_name
FROM sys_role_permissions rp
JOIN sys_permissions p ON rp.permission_id = p.id
WHERE p.permission_code IN ('exam', 'exam:venue', 'exam:schedule')
AND rp.role_id = 1;

-- 3. 检查当前登录用户的角色
SELECT u.id, u.username, u.real_name, r.role_name, r.role_code
FROM sys_users u
JOIN sys_user_roles ur ON u.id = ur.user_id
JOIN sys_roles r ON ur.role_id = r.id
WHERE u.username = 'admin';

-- 4. 获取admin用户的所有权限
SELECT DISTINCT p.id, p.permission_name, p.permission_code, p.permission_type, p.parent_id, p.path
FROM sys_permissions p
JOIN sys_role_permissions rp ON p.id = rp.permission_id
JOIN sys_user_roles ur ON rp.role_id = ur.role_id
JOIN sys_users u ON ur.user_id = u.id
WHERE u.username = 'admin'
AND p.permission_type = 'menu'
ORDER BY p.parent_id, p.sort_order;
