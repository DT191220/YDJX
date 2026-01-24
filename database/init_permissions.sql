-- 权限初始化数据
-- 用于建立教练角色和校长角色的权限控制

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

USE yuandong_driving_school;

-- 清空现有权限数据（保留超级管理员角色权限关联）
DELETE FROM sys_role_permissions WHERE role_id != 1;
DELETE FROM sys_permissions;

-- 重置自增ID
ALTER TABLE sys_permissions AUTO_INCREMENT = 1;

-- ========== 插入权限数据 ==========

-- 1. 首页
INSERT INTO sys_permissions (permission_name, permission_code, permission_type, parent_id, path, icon, sort_order, status) VALUES
('首页', 'home', 'menu', 0, '/', 'home', 0, '启用');

-- 2. 学员信息管理（父级ID=2）
INSERT INTO sys_permissions (permission_name, permission_code, permission_type, parent_id, path, icon, sort_order, status) VALUES
('学员信息管理', 'student', 'menu', 0, '/students', 'user', 10, '启用'),
('学员基本信息', 'student:entry', 'menu', 2, '/students/entry', '', 11, '启用'),
('学员基本信息-查看', 'student:entry:view', 'button', 3, '', '', 12, '启用'),
('学员基本信息-新增', 'student:entry:create', 'button', 3, '', '', 13, '启用'),
('学员基本信息-编辑', 'student:entry:update', 'button', 3, '', '', 14, '启用'),
('学员基本信息-删除', 'student:entry:delete', 'button', 3, '', '', 15, '启用'),
('报名与缴费', 'student:payment', 'menu', 2, '/students/payment', '', 20, '启用'),
('报名与缴费-查看', 'student:payment:view', 'button', 8, '', '', 21, '启用'),
('报名与缴费-缴费', 'student:payment:pay', 'button', 8, '', '', 22, '启用'),
('报名与缴费-退费', 'student:payment:refund', 'button', 8, '', '', 23, '启用'),
('招生统计', 'student:statistics', 'menu', 2, '/students/statistics', '', 30, '启用');

-- 3. 考试管理（父级ID=13）
INSERT INTO sys_permissions (permission_name, permission_code, permission_type, parent_id, path, icon, sort_order, status) VALUES
('考试管理', 'exam', 'menu', 0, '/exam', 'file-text', 20, '启用'),
('考试场地配置', 'exam:venues', 'menu', 13, '/exam/venues', '', 21, '启用'),
('考试场地-查看', 'exam:venues:view', 'button', 14, '', '', 22, '启用'),
('考试场地-新增', 'exam:venues:create', 'button', 14, '', '', 23, '启用'),
('考试场地-编辑', 'exam:venues:update', 'button', 14, '', '', 24, '启用'),
('考试场地-删除', 'exam:venues:delete', 'button', 14, '', '', 25, '启用'),
('考试安排管理', 'exam:schedules', 'menu', 13, '/exam/schedules', '', 30, '启用'),
('考试安排-查看', 'exam:schedules:view', 'button', 20, '', '', 31, '启用'),
('考试安排-新增', 'exam:schedules:create', 'button', 20, '', '', 32, '启用'),
('考试安排-编辑', 'exam:schedules:update', 'button', 20, '', '', 33, '启用'),
('考试安排-删除', 'exam:schedules:delete', 'button', 20, '', '', 34, '启用'),
('学员考试管理', 'exam:registrations', 'menu', 13, '/exam/registrations', '', 40, '启用'),
('学员考试-查看', 'exam:registrations:view', 'button', 25, '', '', 41, '启用'),
('学员考试-新增', 'exam:registrations:create', 'button', 25, '', '', 42, '启用'),
('学员考试-编辑', 'exam:registrations:update', 'button', 25, '', '', 43, '启用'),
('学员考试-删除', 'exam:registrations:delete', 'button', 25, '', '', 44, '启用'),
('考试统计', 'exam:statistics', 'menu', 13, '/exam/statistics', '', 50, '启用');

-- 4. 学员学习跟踪（父级ID=31）
INSERT INTO sys_permissions (permission_name, permission_code, permission_type, parent_id, path, icon, sort_order, status) VALUES
('学员学习跟踪', 'learning', 'menu', 0, '/learning', 'book', 30, '启用'),
('学习进度跟踪', 'learning:progress', 'menu', 31, '/learning/progress', '', 31, '启用'),
('学习进度-查看', 'learning:progress:view', 'button', 32, '', '', 32, '启用'),
('学习进度-编辑', 'learning:progress:update', 'button', 32, '', '', 33, '启用'),
('学习计划管理', 'learning:plans', 'menu', 31, '/learning/plans', '', 40, '启用'),
('学习计划-查看', 'learning:plans:view', 'button', 35, '', '', 41, '启用'),
('学习计划-新增', 'learning:plans:create', 'button', 35, '', '', 42, '启用'),
('学习计划-编辑', 'learning:plans:update', 'button', 35, '', '', 43, '启用'),
('学习计划-删除', 'learning:plans:delete', 'button', 35, '', '', 44, '启用');

-- 5. 教练管理（父级ID=40）
INSERT INTO sys_permissions (permission_name, permission_code, permission_type, parent_id, path, icon, sort_order, status) VALUES
('教练管理', 'coach', 'menu', 0, '/coaches', 'team', 40, '启用'),
('教练基本信息', 'coach:info', 'menu', 40, '/coaches/info', '', 41, '启用'),
('教练信息-查看', 'coach:info:view', 'button', 41, '', '', 42, '启用'),
('教练信息-新增', 'coach:info:create', 'button', 41, '', '', 43, '启用'),
('教练信息-编辑', 'coach:info:update', 'button', 41, '', '', 44, '启用'),
('教练信息-删除', 'coach:info:delete', 'button', 41, '', '', 45, '启用'),
('工资配置', 'coach:salary-config', 'menu', 40, '/coaches/salary-config', '', 50, '启用'),
('工资配置-查看', 'coach:salary-config:view', 'button', 46, '', '', 51, '启用'),
('工资配置-编辑', 'coach:salary-config:update', 'button', 46, '', '', 52, '启用'),
('教练工资', 'coach:salary', 'menu', 40, '/coaches/salary', '', 60, '启用'),
('教练工资-查看', 'coach:salary:view', 'button', 49, '', '', 61, '启用'),
('教练工资-计算', 'coach:salary:calculate', 'button', 49, '', '', 62, '启用'),
('教练工资-查看自己', 'coach:salary:view-own', 'button', 49, '', '', 63, '启用');

-- 6. 基础数据管理（父级ID=53）
INSERT INTO sys_permissions (permission_name, permission_code, permission_type, parent_id, path, icon, sort_order, status) VALUES
('基础数据管理', 'basic', 'menu', 0, '/basic', 'database', 50, '启用'),
('班型管理', 'basic:class-types', 'menu', 53, '/system/class-types', '', 51, '启用'),
('班型-查看', 'basic:class-types:view', 'button', 54, '', '', 52, '启用'),
('班型-新增', 'basic:class-types:create', 'button', 54, '', '', 53, '启用'),
('班型-编辑', 'basic:class-types:update', 'button', 54, '', '', 54, '启用'),
('班型-删除', 'basic:class-types:delete', 'button', 54, '', '', 55, '启用');

-- 7. 系统管理（父级ID=59）
INSERT INTO sys_permissions (permission_name, permission_code, permission_type, parent_id, path, icon, sort_order, status) VALUES
('系统管理', 'system', 'menu', 0, '/system', 'setting', 100, '启用'),
('用户管理', 'system:users', 'menu', 59, '/system/users', '', 101, '启用'),
('用户-查看', 'system:users:view', 'button', 60, '', '', 102, '启用'),
('用户-新增', 'system:users:create', 'button', 60, '', '', 103, '启用'),
('用户-编辑', 'system:users:update', 'button', 60, '', '', 104, '启用'),
('用户-删除', 'system:users:delete', 'button', 60, '', '', 105, '启用'),
('角色管理', 'system:roles', 'menu', 59, '/system/roles', '', 110, '启用'),
('角色-查看', 'system:roles:view', 'button', 65, '', '', 111, '启用'),
('角色-新增', 'system:roles:create', 'button', 65, '', '', 112, '启用'),
('角色-编辑', 'system:roles:update', 'button', 65, '', '', 113, '启用'),
('角色-删除', 'system:roles:delete', 'button', 65, '', '', 114, '启用'),
('角色-分配权限', 'system:roles:assign', 'button', 65, '', '', 115, '启用'),
('权限管理', 'system:permissions', 'menu', 59, '/system/permissions', '', 120, '启用'),
('权限-查看', 'system:permissions:view', 'button', 71, '', '', 121, '启用'),
('权限-新增', 'system:permissions:create', 'button', 71, '', '', 122, '启用'),
('权限-编辑', 'system:permissions:update', 'button', 71, '', '', 123, '启用'),
('权限-删除', 'system:permissions:delete', 'button', 71, '', '', 124, '启用'),
('字典管理', 'system:dicts', 'menu', 59, '/system/dicts', '', 130, '启用'),
('字典-查看', 'system:dicts:view', 'button', 76, '', '', 131, '启用'),
('字典-新增', 'system:dicts:create', 'button', 76, '', '', 132, '启用'),
('字典-编辑', 'system:dicts:update', 'button', 76, '', '', 133, '启用'),
('字典-删除', 'system:dicts:delete', 'button', 76, '', '', 134, '启用');

-- ========== 为超级管理员分配所有权限 ==========
DELETE FROM sys_role_permissions WHERE role_id = 1;
INSERT INTO sys_role_permissions (role_id, permission_id)
SELECT 1, id FROM sys_permissions;

-- ========== 创建校长和教练角色 ==========
INSERT IGNORE INTO sys_roles (role_name, role_code, description, status) VALUES
('校长', 'PRINCIPAL', '驾校校长，拥有除系统管理外的所有业务权限', '启用'),
('教练', 'COACH', '教练角色，可查看学员信息、学习跟踪和自己的工资', '启用');

-- 获取校长角色ID（假设为4，如果已有其他角色可能不同）
-- 为校长分配权限（除系统管理外的所有菜单和按钮）
INSERT INTO sys_role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM sys_roles WHERE role_code = 'PRINCIPAL'),
  id 
FROM sys_permissions 
WHERE permission_code NOT LIKE 'system:%' AND permission_code != 'system';

-- 为教练分配权限
-- 教练可访问：首页、学员基本信息（查看）、学员学习跟踪、教练工资（查看自己）
INSERT INTO sys_role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM sys_roles WHERE role_code = 'COACH'),
  id 
FROM sys_permissions 
WHERE permission_code IN (
  'home',
  'student', 'student:entry', 'student:entry:view',
  'learning', 'learning:progress', 'learning:progress:view', 'learning:progress:update',
  'learning:plans', 'learning:plans:view',
  'coach', 'coach:salary', 'coach:salary:view-own'
);

-- 显示创建结果
SELECT '权限初始化完成' as message;
SELECT COUNT(*) as '权限总数' FROM sys_permissions;
SELECT role_name as '角色', COUNT(rp.id) as '权限数' 
FROM sys_roles r 
LEFT JOIN sys_role_permissions rp ON r.id = rp.role_id 
GROUP BY r.id, r.role_name;
