-- 诊断SQL：检查sys_permissions表的实际ENUM定义
SHOW CREATE TABLE sys_permissions;

-- 或者使用
SHOW COLUMNS FROM sys_permissions LIKE 'permission_type';
