-- 为 sys_roles 表添加 sort_order 字段
ALTER TABLE sys_roles ADD COLUMN sort_order INT DEFAULT 0 COMMENT '排序' AFTER status;

-- 为 sys_permissions 表添加缺失的字段
ALTER TABLE sys_permissions ADD COLUMN route_path VARCHAR(200) COMMENT '路由路径' AFTER parent_id;
ALTER TABLE sys_permissions ADD COLUMN icon VARCHAR(100) COMMENT '图标' AFTER route_path;
ALTER TABLE sys_permissions ADD COLUMN sort_order INT DEFAULT 0 COMMENT '排序' AFTER icon;
