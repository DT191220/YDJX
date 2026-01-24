-- 添加系统管理相关表

USE yuandong_driving_school;

-- 用户表
CREATE TABLE IF NOT EXISTS sys_users (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '用户ID',
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  password VARCHAR(255) NOT NULL COMMENT '密码（加密存储）',
  real_name VARCHAR(50) NOT NULL COMMENT '真实姓名',
  phone VARCHAR(11) COMMENT '手机号码',
  email VARCHAR(100) COMMENT '邮箱',
  avatar VARCHAR(255) COMMENT '头像URL',
  status ENUM('启用', '禁用') DEFAULT '启用' COMMENT '状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  last_login_at TIMESTAMP NULL COMMENT '最后登录时间',
  INDEX idx_username (username),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统用户表';

-- 角色表
CREATE TABLE IF NOT EXISTS sys_roles (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '角色ID',
  role_name VARCHAR(50) NOT NULL UNIQUE COMMENT '角色名称',
  role_code VARCHAR(50) NOT NULL UNIQUE COMMENT '角色编码',
  description VARCHAR(200) COMMENT '角色描述',
  status ENUM('启用', '禁用') DEFAULT '启用' COMMENT '状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_role_code (role_code),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统角色表';

-- 权限表
CREATE TABLE IF NOT EXISTS sys_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '权限ID',
  permission_name VARCHAR(50) NOT NULL COMMENT '权限名称',
  permission_code VARCHAR(50) NOT NULL UNIQUE COMMENT '权限编码',
  permission_type ENUM('菜单', '按钮', '接口') NOT NULL COMMENT '权限类型',
  parent_id INT DEFAULT 0 COMMENT '父权限ID',
  path VARCHAR(200) COMMENT '路由路径',
  icon VARCHAR(50) COMMENT '图标',
  sort_order INT DEFAULT 0 COMMENT '排序',
  status ENUM('启用', '禁用') DEFAULT '启用' COMMENT '状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_permission_code (permission_code),
  INDEX idx_parent_id (parent_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统权限表';

-- 用户角色关联表
CREATE TABLE IF NOT EXISTS sys_user_roles (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'ID',
  user_id INT NOT NULL COMMENT '用户ID',
  role_id INT NOT NULL COMMENT '角色ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY unique_user_role (user_id, role_id),
  INDEX idx_user_id (user_id),
  INDEX idx_role_id (role_id),
  FOREIGN KEY (user_id) REFERENCES sys_users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES sys_roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户角色关联表';

-- 角色权限关联表
CREATE TABLE IF NOT EXISTS sys_role_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'ID',
  role_id INT NOT NULL COMMENT '角色ID',
  permission_id INT NOT NULL COMMENT '权限ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY unique_role_permission (role_id, permission_id),
  INDEX idx_role_id (role_id),
  INDEX idx_permission_id (permission_id),
  FOREIGN KEY (role_id) REFERENCES sys_roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES sys_permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色权限关联表';

-- 字典类型表
CREATE TABLE IF NOT EXISTS sys_dict_types (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '字典类型ID',
  dict_name VARCHAR(50) NOT NULL COMMENT '字典名称',
  dict_type VARCHAR(50) NOT NULL UNIQUE COMMENT '字典类型',
  description VARCHAR(200) COMMENT '描述',
  status ENUM('启用', '禁用') DEFAULT '启用' COMMENT '状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_dict_type (dict_type),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字典类型表';

-- 字典数据表
CREATE TABLE IF NOT EXISTS sys_dict_data (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '字典数据ID',
  dict_type VARCHAR(50) NOT NULL COMMENT '字典类型',
  dict_label VARCHAR(100) NOT NULL COMMENT '字典标签',
  dict_value VARCHAR(100) NOT NULL COMMENT '字典值',
  sort_order INT DEFAULT 0 COMMENT '排序',
  status ENUM('启用', '禁用') DEFAULT '启用' COMMENT '状态',
  remark VARCHAR(200) COMMENT '备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_dict_type (dict_type),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字典数据表';

-- 插入默认管理员用户 (密码: admin123)
INSERT INTO sys_users (username, password, real_name, phone, email, status) VALUES
('admin', '$2b$10$f51LyTrLyfmb/JFPFXIbc.dtDZkC6xipzW9QwhoUPlO5GeupXvkMe', '系统管理员', '13800000000', 'admin@jiaxiaotong.com', '启用');

-- 插入默认角色
INSERT INTO sys_roles (role_name, role_code, description, status) VALUES
('超级管理员', 'SUPER_ADMIN', '拥有系统所有权限', '启用'),
('教练', 'COACH', '教练角色，可管理学员信息', '启用'),
('学员', 'STUDENT', '学员角色，仅可查看自己的信息', '启用');

-- 插入默认权限（系统管理菜单）
INSERT INTO sys_permissions (permission_name, permission_code, permission_type, parent_id, path, icon, sort_order, status) VALUES
('系统管理', 'system', '菜单', 0, '/system', 'setting', 100, '启用'),
('用户管理', 'system:user', '菜单', 1, '/system/users', 'user', 101, '启用'),
('角色管理', 'system:role', '菜单', 1, '/system/roles', 'team', 102, '启用'),
('权限管理', 'system:permission', '菜单', 1, '/system/permissions', 'lock', 103, '启用'),
('字典管理', 'system:dict', '菜单', 1, '/system/dicts', 'book', 104, '启用'),
('学员信息管理', 'student', '菜单', 0, '/students', 'user', 1, '启用');

-- 为超级管理员分配所有权限
INSERT INTO sys_role_permissions (role_id, permission_id)
SELECT 1, id FROM sys_permissions;

-- 为管理员用户分配超级管理员角色
INSERT INTO sys_user_roles (user_id, role_id) VALUES (1, 1);

-- 插入默认字典类型
INSERT INTO sys_dict_types (dict_name, dict_type, description, status) VALUES
('用户状态', 'user_status', '用户账号状态', '启用'),
('性别', 'gender', '性别类型', '启用'),
('车型类型', 'license_type', '驾照车型类型', '启用');

-- 插入默认字典数据
INSERT INTO sys_dict_data (dict_type, dict_label, dict_value, sort_order, status) VALUES
('user_status', '启用', '1', 1, '启用'),
('user_status', '禁用', '0', 2, '启用'),
('gender', '男', 'M', 1, '启用'),
('gender', '女', 'F', 2, '启用'),
('license_type', 'C1', 'C1', 1, '启用'),
('license_type', 'C2', 'C2', 2, '启用'),
('license_type', 'B1', 'B1', 3, '启用'),
('license_type', 'B2', 'B2', 4, '启用'),
('license_type', 'A1', 'A1', 5, '启用'),
('license_type', 'A2', 'A2', 6, '启用'),
('license_type', 'A3', 'A3', 7, '启用');
