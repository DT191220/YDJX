-- ========================================
-- 财务管理模块 - 权限配置脚本
-- 执行此脚本添加财务菜单权限
-- ========================================

USE yuandong_driving_school;

-- 1. 先删除可能存在的财务权限（避免重复）
DELETE FROM sys_role_permissions WHERE permission_id IN (
  SELECT id FROM sys_permissions WHERE permission_code LIKE 'finance%'
);
DELETE FROM sys_permissions WHERE permission_code LIKE 'finance%';

-- 2. 插入财务管理父级菜单权限（使用 menu 而非 菜单，与现有数据保持一致）
INSERT INTO sys_permissions (permission_name, permission_code, permission_type, parent_id, path, icon, sort_order, status) VALUES
('财务管理', 'finance', 'menu', 0, '/finance', 'dollar', 55, '启用');

-- 3. 获取刚插入的父级ID
SET @finance_parent_id = LAST_INSERT_ID();

-- 4. 插入子菜单权限
INSERT INTO sys_permissions (permission_name, permission_code, permission_type, parent_id, path, icon, sort_order, status) VALUES
('科目管理', 'finance:subjects', 'menu', @finance_parent_id, '/finance/subjects', '', 56, '启用'),
('凭证管理', 'finance:vouchers', 'menu', @finance_parent_id, '/finance/vouchers', '', 57, '启用'),
('凭证录入', 'finance:voucher-entry', 'menu', @finance_parent_id, '/finance/voucher-entry', '', 58, '启用');

-- 5. 为超级管理员角色分配财务权限
INSERT INTO sys_role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM sys_roles WHERE role_name = '超级管理员' LIMIT 1),
  id
FROM sys_permissions 
WHERE permission_code LIKE 'finance%';

-- 6. 验证结果
SELECT '=== 财务权限已添加 ===' as info;
SELECT id, permission_name, permission_code, parent_id, path 
FROM sys_permissions 
WHERE permission_code LIKE 'finance%'
ORDER BY id;

SELECT '=== 超级管理员权限分配 ===' as info;
SELECT r.role_name, p.permission_name, p.permission_code
FROM sys_role_permissions rp
JOIN sys_roles r ON rp.role_id = r.id
JOIN sys_permissions p ON rp.permission_id = p.id
WHERE p.permission_code LIKE 'finance%';
