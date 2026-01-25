-- 总校上缴配置表改造：添加班型关联
-- 方案B：外键关联 + 实时查询

-- 1. 添加 class_type_id 字段（可为空，空表示全局默认配置）
ALTER TABLE headquarter_config 
ADD COLUMN class_type_id INT DEFAULT NULL COMMENT '关联班型ID，为空表示全局默认配置' AFTER id;

-- 2. 添加索引
ALTER TABLE headquarter_config 
ADD INDEX idx_class_type (class_type_id);

-- 3. 添加外键约束（班型删除时置空，保留配置记录）
ALTER TABLE headquarter_config 
ADD CONSTRAINT fk_hq_config_class_type 
FOREIGN KEY (class_type_id) REFERENCES class_types(id) ON DELETE SET NULL;

-- 4. 添加唯一约束：同一班型在同一生效日期只能有一个配置
-- 注意：MySQL 对 NULL 值的唯一约束处理允许多个 NULL，所以全局配置可以有多个不同生效日期
ALTER TABLE headquarter_config 
ADD UNIQUE INDEX uk_class_type_effective (class_type_id, effective_date);
