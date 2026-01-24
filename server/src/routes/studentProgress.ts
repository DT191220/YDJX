import { Router, Request, Response } from 'express';
import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// 获取学员考试进度列表（带搜索和筛选）
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      keyword = '',
      subject1_status = '',
      subject2_status = '',
      subject3_status = '',
      subject4_status = ''
    } = req.query;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (keyword) {
      whereClause += ' AND (s.name LIKE ? OR s.phone LIKE ? OR s.id_card LIKE ?)';
      const likeKeyword = `%${keyword}%`;
      params.push(likeKeyword, likeKeyword, likeKeyword);
    }

    if (subject1_status) {
      whereClause += ' AND sep.subject1_status = ?';
      params.push(subject1_status);
    }

    if (subject2_status) {
      whereClause += ' AND sep.subject2_status = ?';
      params.push(subject2_status);
    }

    if (subject3_status) {
      whereClause += ' AND sep.subject3_status = ?';
      params.push(subject3_status);
    }

    if (subject4_status) {
      whereClause += ' AND sep.subject4_status = ?';
      params.push(subject4_status);
    }

    const [progress] = await pool.query<RowDataPacket[]>(
      `SELECT 
         sep.*,
         s.name as student_name,
         s.phone as student_phone,
         s.id_card as student_id_card,
         s.enrollment_date
       FROM student_exam_progress sep
       INNER JOIN students s ON sep.student_id = s.id
       ${whereClause}
       ORDER BY sep.updated_at DESC`,
      params
    );

    res.json({
      success: true,
      message: '获取学员考试进度列表成功',
      data: progress
    });
  } catch (error: any) {
    console.error('获取学员考试进度列表失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
});

// 获取单个学员的考试进度
router.get('/student/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;

    const [progress] = await pool.query<RowDataPacket[]>(
      `SELECT 
         sep.*,
         s.name as student_name,
         s.phone as student_phone,
         s.license_type
       FROM student_exam_progress sep
       INNER JOIN students s ON sep.student_id = s.id
       WHERE sep.student_id = ?`,
      [studentId]
    );

    if (progress.length === 0) {
      // 如果学员没有进度记录，自动创建一条
      const [student] = await pool.query<RowDataPacket[]>(
        'SELECT id, name, license_type FROM students WHERE id = ?',
        [studentId]
      );

      if (student.length === 0) {
        return res.status(404).json({
          success: false,
          message: '学员不存在'
        });
      }

      const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO student_exam_progress (student_id, license_type) VALUES (?, ?)`,
        [studentId, student[0].license_type]
      );

      const [newProgress] = await pool.query<RowDataPacket[]>(
        `SELECT 
           sep.*,
           s.name as student_name,
           s.phone as student_phone,
           s.license_type
         FROM student_exam_progress sep
         INNER JOIN students s ON sep.student_id = s.id
         WHERE sep.id = ?`,
        [result.insertId]
      );

      return res.json({
        success: true,
        message: '获取学员考试进度成功',
        data: newProgress[0]
      });
    }

    res.json({
      success: true,
      message: '获取学员考试进度成功',
      data: progress[0]
    });
  } catch (error: any) {
    console.error('获取学员考试进度失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
});

// 更新学员考试进度
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      subject1_status,
      subject1_pass_date,
      subject2_status,
      subject2_pass_date,
      subject3_status,
      subject3_pass_date,
      subject4_status,
      subject4_pass_date
    } = req.body;

    // 计算总进度百分比
    let totalProgress = 0;
    if (subject1_status === '已通过') totalProgress += 25;
    if (subject2_status === '已通过') totalProgress += 25;
    if (subject3_status === '已通过') totalProgress += 25;
    if (subject4_status === '已通过') totalProgress += 25;

    await pool.query(
      `UPDATE student_exam_progress 
       SET subject1_status = ?, subject1_pass_date = ?,
           subject2_status = ?, subject2_pass_date = ?,
           subject3_status = ?, subject3_pass_date = ?,
           subject4_status = ?, subject4_pass_date = ?,
           total_progress = ?
       WHERE id = ?`,
      [
        subject1_status, subject1_pass_date || null,
        subject2_status, subject2_pass_date || null,
        subject3_status, subject3_pass_date || null,
        subject4_status, subject4_pass_date || null,
        totalProgress,
        id
      ]
    );

    res.json({
      success: true,
      message: '更新考试进度成功'
    });
  } catch (error: any) {
    console.error('更新考试进度失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
});

// 获取考试进度统计
router.get('/statistics/overview', async (req: Request, res: Response) => {
  try {
    const [stats] = await pool.query<RowDataPacket[]>(
      `SELECT 
         COUNT(DISTINCT student_id) as total_students,
         SUM(CASE WHEN subject1_status = '已通过' THEN 1 ELSE 0 END) as subject1_passed,
         SUM(CASE WHEN subject2_status = '已通过' THEN 1 ELSE 0 END) as subject2_passed,
         SUM(CASE WHEN subject3_status = '已通过' THEN 1 ELSE 0 END) as subject3_passed,
         SUM(CASE WHEN subject4_status = '已通过' THEN 1 ELSE 0 END) as subject4_passed,
         SUM(CASE WHEN total_progress = 100 THEN 1 ELSE 0 END) as fully_completed,
         ROUND(AVG(total_progress), 2) as avg_progress
       FROM student_exam_progress`
    );

    res.json({
      success: true,
      message: '获取进度统计成功',
      data: stats[0]
    });
  } catch (error: any) {
    console.error('获取进度统计失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
});

// 检查学员报考资格
router.get('/check-eligibility/:studentId/:subject', async (req: Request, res: Response) => {
  try {
    const { studentId, subject } = req.params;

    // 检查学员是否存在
    const [students] = await pool.query<RowDataPacket[]>(
      'SELECT id, enrollment_status FROM students WHERE id = ?',
      [studentId]
    );

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: '学员不存在'
      });
    }

    // 检查是否已废考
    if (students[0].enrollment_status === '废考') {
      return res.json({
        success: true,
        data: {
          eligible: false,
          reason: '该学员已废考,无法报考任何科目'
        }
      });
    }

    // 检查考试进度
    const [progress] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM student_exam_progress WHERE student_id = ?',
      [studentId]
    );

    if (progress.length === 0) {
      // 没有进度记录,可以报考
      return res.json({
        success: true,
        data: {
          eligible: true,
          reason: ''
        }
      });
    }

    const prog = progress[0];

    // 检查资格是否已作废
    if (prog.exam_qualification === '已作废') {
      return res.json({
        success: true,
        data: {
          eligible: false,
          reason: '该学员驾考资格已作废,无法报考任何科目'
        }
      });
    }

    // 检查指定科目是否已通过
    const subjectMap: Record<string, string> = {
      '科目一': 'subject1_status',
      '科目二': 'subject2_status',
      '科目三': 'subject3_status',
      '科目四': 'subject4_status'
    };

    const statusField = subjectMap[subject];
    if (!statusField) {
      return res.status(400).json({
        success: false,
        message: '无效的科目名称'
      });
    }

    if (prog[statusField] === '已通过') {
      return res.json({
        success: true,
        data: {
          eligible: false,
          reason: `该学员${subject}已通过,无需再次报考`
        }
      });
    }

    // 其他情况允许报考
    res.json({
      success: true,
      data: {
        eligible: true,
        reason: ''
      }
    });
  } catch (error: any) {
    console.error('检查报考资格失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
});

// 获取学员预警信息
router.get('/:id/warnings', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [progress] = await pool.query<RowDataPacket[]>(
      `SELECT 
         subject1_failed_count,
         subject2_failed_count,
         subject3_failed_count,
         subject4_failed_count,
         exam_qualification
       FROM student_exam_progress WHERE id = ?`,
      [id]
    );

    if (progress.length === 0) {
      return res.json({
        success: true,
        data: {
          subject1_warning_level: 0,
          subject2_warning_level: 0,
          subject3_warning_level: 0,
          subject4_warning_level: 0,
          exam_qualification: '正常'
        }
      });
    }

    const prog = progress[0];

    res.json({
      success: true,
      data: {
        subject1_warning_level: prog.subject1_failed_count,
        subject2_warning_level: prog.subject2_failed_count,
        subject3_warning_level: prog.subject3_failed_count,
        subject4_warning_level: prog.subject4_failed_count,
        exam_qualification: prog.exam_qualification
      }
    });
  } catch (error: any) {
    console.error('获取预警信息失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
});

export default router;
