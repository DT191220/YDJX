-- 添加考试管理菜单权限
-- 注意：实际数据库的permission_type字段ENUM值为：enum('menu','button','api')

-- 步骤1：插入一级菜单
INSERT INTO sys_permissions (permission_name, permission_code, permission_type, parent_id, path, icon, sort_order, status) 
VALUES ('考试管理', 'exam', 'menu', 0, '/exam', 'file-text', 2, '启用');

-- 步骤2：查询刚插入的ID（记录下来，用于下一步）
SELECT id, permission_name FROM sys_permissions WHERE permission_code = 'exam';

-- 步骤3：插入子菜单（将下面的7替换为步骤2查到的实际ID）
INSERT INTO sys_permissions (permission_name, permission_code, permission_type, parent_id, path, icon, sort_order, status) 
VALUES 
('考试场地配置', 'exam:venue', 'menu', 7, '/exam/venues', 'home', 21, '启用'),
('考试安排管理', 'exam:schedule', 'menu', 7, '/exam/schedules', 'calendar', 22, '启用');

-- 步骤4：为超级管理员角色添加新权限
INSERT INTO sys_role_permissions (role_id, permission_id)
SELECT 1, id FROM sys_permissions 
WHERE permission_code IN ('exam', 'exam:venue', 'exam:schedule')
AND id NOT IN (SELECT permission_id FROM sys_role_permissions WHERE role_id = 1);

-- 步骤5：验证插入结果
SELECT id, permission_name, permission_code, permission_type, parent_id, path, sort_order, status
FROM sys_permissions 
WHERE permission_code IN ('exam', 'exam:venue', 'exam:schedule')
ORDER BY sort_order;
