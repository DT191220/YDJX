-- 创建菜单表
-- 用于支持菜单动态配置，替代前端硬编码的菜单结构

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

USE yuandong_driving_school;

-- 菜单表
CREATE TABLE IF NOT EXISTS sys_menus (
  id INT PRIMARY KEY AUTO_INCREMENT,
  menu_name VARCHAR(50) NOT NULL COMMENT '菜单名称',
  menu_path VARCHAR(100) COMMENT '路由路径',
  permission_code VARCHAR(100) COMMENT '关联权限编码',
  parent_id INT DEFAULT 0 COMMENT '父菜单ID，0表示顶级菜单',
  menu_type ENUM('group', 'menu') NOT NULL DEFAULT 'menu' COMMENT '菜单类型：group-菜单组，menu-菜单项',
  icon VARCHAR(50) COMMENT '图标',
  sort_order INT DEFAULT 0 COMMENT '排序号',
  is_visible TINYINT(1) DEFAULT 1 COMMENT '是否可见：1-可见，0-隐藏',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_parent_id (parent_id),
  INDEX idx_permission_code (permission_code),
  INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统菜单表';

-- 初始化现有菜单数据
-- 顶级菜单组
INSERT INTO sys_menus (id, menu_name, menu_path, permission_code, parent_id, menu_type, sort_order) VALUES
(1, '学员信息管理', NULL, 'student', 0, 'group', 1),
(2, '考试管理', NULL, 'exam', 0, 'group', 2),
(3, '学员学习跟踪', NULL, 'learning', 0, 'group', 3),
(4, '教练管理', NULL, 'coach', 0, 'group', 4),
(5, '财务管理', NULL, 'finance', 0, 'group', 5),
(6, '基础数据管理', NULL, 'basic', 0, 'group', 6),
(7, '系统管理', NULL, 'system', 0, 'group', 7);

-- 学员信息管理子菜单
INSERT INTO sys_menus (menu_name, menu_path, permission_code, parent_id, menu_type, sort_order) VALUES
('学员基本信息', '/students/entry', 'student:entry', 1, 'menu', 1),
('报名与缴费', '/students/payment', 'student:payment', 1, 'menu', 2),
('招生统计', '/students/statistics', 'student:statistics', 1, 'menu', 3),
('总校上缴配置', '/students/headquarter-config', 'student:headquarter-config', 1, 'menu', 4);

-- 考试管理子菜单
INSERT INTO sys_menus (menu_name, menu_path, permission_code, parent_id, menu_type, sort_order) VALUES
('考试场地配置', '/exam/venues', 'exam:venues', 2, 'menu', 1),
('考试安排管理', '/exam/schedules', 'exam:schedules', 2, 'menu', 2),
('学员考试管理', '/exam/registrations', 'exam:registrations', 2, 'menu', 3),
('考试统计', '/exam/statistics', 'exam:statistics', 2, 'menu', 4);

-- 学员学习跟踪子菜单
INSERT INTO sys_menus (menu_name, menu_path, permission_code, parent_id, menu_type, sort_order) VALUES
('学习进度跟踪', '/learning/progress', 'learning:progress', 3, 'menu', 1),
('学习计划管理', '/learning/plans', 'learning:plans', 3, 'menu', 2);

-- 教练管理子菜单
INSERT INTO sys_menus (menu_name, menu_path, permission_code, parent_id, menu_type, sort_order) VALUES
('教练基本信息', '/coaches/info', 'coach:info', 4, 'menu', 1),
('工资配置', '/coaches/salary-config', 'coach:salary-config', 4, 'menu', 2),
('教练工资', '/coaches/salary', 'coach:salary', 4, 'menu', 3);

-- 财务管理子菜单
INSERT INTO sys_menus (menu_name, menu_path, permission_code, parent_id, menu_type, sort_order) VALUES
('科目管理', '/finance/subjects', 'finance:subjects', 5, 'menu', 1),
('凭证管理', '/finance/vouchers', 'finance:vouchers', 5, 'menu', 2),
('凭证录入', '/finance/voucher-entry', 'finance:voucher-entry', 5, 'menu', 3),
('报表中心', '/finance/reports', 'finance:reports', 5, 'menu', 4);

-- 基础数据管理子菜单
INSERT INTO sys_menus (menu_name, menu_path, permission_code, parent_id, menu_type, sort_order) VALUES
('班型管理', '/system/class-types', 'basic:class-types', 6, 'menu', 1);

-- 系统管理子菜单
INSERT INTO sys_menus (menu_name, menu_path, permission_code, parent_id, menu_type, sort_order) VALUES
('用户管理', '/system/users', 'system:users', 7, 'menu', 1),
('角色管理', '/system/roles', 'system:roles', 7, 'menu', 2),
('权限管理', '/system/permissions', 'system:permissions', 7, 'menu', 3),
('字典管理', '/system/dicts', 'system:dicts', 7, 'menu', 4),
('菜单管理', '/system/menus', 'system:menus', 7, 'menu', 5);
