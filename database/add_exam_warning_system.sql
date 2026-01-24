-- ========================================
-- 学员考试统计与预警系统数据库脚本
-- ========================================

USE yuandong_driving_school;

-- 1. 修改students表,新增"废考"状态
-- 注意: students表的状态字段名为status,不是enrollment_status
ALTER TABLE students 
MODIFY COLUMN status ENUM(
  '咨询中','预约报名','报名未缴费','报名部分缴费',
  '报名已缴费','已退费','废考'
) DEFAULT '报名未缴费' COMMENT '学习状态';

-- 2. 优化exam_registrations表,支持更灵活的成绩格式
ALTER TABLE exam_registrations 
MODIFY COLUMN exam_score VARCHAR(50) COMMENT '考试成绩/分数';

-- 3. 优化student_exam_progress表,添加统计字段
ALTER TABLE student_exam_progress ADD COLUMN (
  -- 科目一统计
  subject1_total_count INT DEFAULT 0 COMMENT '科目一总考试次数',
  subject1_failed_count INT DEFAULT 0 COMMENT '科目一连续未通过次数',
  
  -- 科目二统计
  subject2_total_count INT DEFAULT 0 COMMENT '科目二总考试次数',
  subject2_failed_count INT DEFAULT 0 COMMENT '科目二连续未通过次数',
  
  -- 科目三统计
  subject3_total_count INT DEFAULT 0 COMMENT '科目三总考试次数',
  subject3_failed_count INT DEFAULT 0 COMMENT '科目三连续未通过次数',
  
  -- 科目四统计
  subject4_total_count INT DEFAULT 0 COMMENT '科目四总考试次数',
  subject4_failed_count INT DEFAULT 0 COMMENT '科目四连续未通过次数',
  
  -- 驾考资格状态
  exam_qualification ENUM('正常','已作废') DEFAULT '正常' COMMENT '驾考资格状态',
  disqualified_date DATE COMMENT '资格作废日期',
  disqualified_reason TEXT COMMENT '作废原因'
);

-- 4. 创建预警日志表
CREATE TABLE IF NOT EXISTS exam_warning_logs (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '日志ID',
  student_id INT NOT NULL COMMENT '学员ID',
  warning_type ENUM('3次预警','4次预警','资格作废') NOT NULL COMMENT '预警类型',
  warning_subject ENUM('科目一','科目二','科目三','科目四') NOT NULL COMMENT '预警科目',
  warning_content TEXT COMMENT '预警内容',
  is_handled BOOLEAN DEFAULT FALSE COMMENT '是否已处理',
  handled_by INT COMMENT '处理人用户ID',
  handled_time DATETIME COMMENT '处理时间',
  handled_notes TEXT COMMENT '处理备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  INDEX idx_student (student_id),
  INDEX idx_handled (is_handled),
  INDEX idx_type (warning_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='考试预警日志表';

-- 5. 为exam_registrations表添加索引,提升查询性能
ALTER TABLE exam_registrations 
ADD INDEX idx_student_subject (student_id, exam_result);
