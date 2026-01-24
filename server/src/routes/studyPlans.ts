import { Router, Request, Response } from 'express';
import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// 获取学习计划列表
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      student_id = '',
      coach_id = '',
      plan_type = '',
      status = '',
      start_date = '',
      end_date = ''
    } = req.query;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (student_id) {
      whereClause += ' AND ssp.student_id = ?';
      params.push(student_id);
    }

    if (coach_id) {
      whereClause += ' AND ssp.coach_id = ?';
      params.push(coach_id);
    }

    if (plan_type) {
      whereClause += ' AND ssp.plan_type = ?';
      params.push(plan_type);
    }

    if (status) {
      whereClause += ' AND ssp.status = ?';
      params.push(status);
    }

    if (start_date) {
      whereClause += ' AND ssp.plan_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      whereClause += ' AND ssp.plan_date <= ?';
      params.push(end_date);
    }

    const [plans] = await pool.query<RowDataPacket[]>(
      `SELECT 
         ssp.*,
         s.name as student_name,
         s.phone as student_phone,
         c.name as coach_name,
         c.phone as coach_phone
       FROM student_study_plans ssp
       INNER JOIN students s ON ssp.student_id = s.id
       LEFT JOIN coaches c ON ssp.coach_id = c.id
       ${whereClause}
       ORDER BY ssp.plan_date DESC, ssp.time_slot`,
      params
    );

    res.json({
      success: true,
      message: '获取学习计划列表成功',
      data: plans
    });
  } catch (error: any) {
    console.error('获取学习计划列表失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
});

// 获取单个学员的学习计划
router.get('/student/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { status = '' } = req.query;

    let whereClause = 'WHERE ssp.student_id = ?';
    const params: any[] = [studentId];

    if (status) {
      whereClause += ' AND ssp.status = ?';
      params.push(status);
    }

    const [plans] = await pool.query<RowDataPacket[]>(
      `SELECT 
         ssp.*,
         s.name as student_name,
         s.phone as student_phone,
         c.name as coach_name,
         c.phone as coach_phone
       FROM student_study_plans ssp
       INNER JOIN students s ON ssp.student_id = s.id
       LEFT JOIN coaches c ON ssp.coach_id = c.id
       ${whereClause}
       ORDER BY ssp.plan_date DESC, ssp.time_slot`,
      params
    );

    res.json({
      success: true,
      message: '获取学员学习计划成功',
      data: plans
    });
  } catch (error: any) {
    console.error('获取学员学习计划失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
});

// 获取单个学习计划详情
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [plans] = await pool.query<RowDataPacket[]>(
      `SELECT 
         ssp.*,
         s.name as student_name,
         s.phone as student_phone,
         c.name as coach_name,
         c.phone as coach_phone
       FROM student_study_plans ssp
       INNER JOIN students s ON ssp.student_id = s.id
       LEFT JOIN coaches c ON ssp.coach_id = c.id
       WHERE ssp.id = ?`,
      [id]
    );

    if (plans.length === 0) {
      return res.status(404).json({
        success: false,
        message: '学习计划不存在'
      });
    }

    res.json({
      success: true,
      message: '获取学习计划详情成功',
      data: plans[0]
    });
  } catch (error: any) {
    console.error('获取学习计划详情失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
});

// 创建学习计划
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      student_id,
      plan_type,
      plan_date,
      time_slot,
      coach_id,
      reminder_time,
      notes
    } = req.body;

    // 验证必填字段
    if (!student_id || !plan_type || !plan_date) {
      return res.status(400).json({
        success: false,
        message: '学员、计划类型和计划日期为必填项'
      });
    }

    // 验证计划类型
    const validPlanTypes = ['日常练车', '模拟考试', '正式考试'];
    if (!validPlanTypes.includes(plan_type)) {
      return res.status(400).json({
        success: false,
        message: '计划类型无效'
      });
    }

    // 验证学员是否存在
    const [students] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM students WHERE id = ?',
      [student_id]
    );

    if (students.length === 0) {
      return res.status(400).json({
        success: false,
        message: '学员不存在'
      });
    }

    // 如果指定了教练，验证教练是否存在
    if (coach_id) {
      const [coaches] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM coaches WHERE id = ? AND status = "在职"',
        [coach_id]
      );

      if (coaches.length === 0) {
        return res.status(400).json({
          success: false,
          message: '教练不存在或已离职'
        });
      }
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO student_study_plans 
       (student_id, plan_type, plan_date, time_slot, coach_id, reminder_time, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, '待完成')`,
      [student_id, plan_type, plan_date, time_slot, coach_id || null, reminder_time || null, notes]
    );

    res.json({
      success: true,
      message: '创建学习计划成功',
      data: { id: result.insertId }
    });
  } catch (error: any) {
    console.error('创建学习计划失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
});

// 更新学习计划
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      plan_type,
      plan_date,
      time_slot,
      coach_id,
      status,
      reminder_time,
      notes
    } = req.body;

    // 验证必填字段
    if (!plan_type || !plan_date) {
      return res.status(400).json({
        success: false,
        message: '计划类型和计划日期为必填项'
      });
    }

    // 检查计划是否存在
    const [plans] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM student_study_plans WHERE id = ?',
      [id]
    );

    if (plans.length === 0) {
      return res.status(404).json({
        success: false,
        message: '学习计划不存在'
      });
    }

    // 如果指定了教练，验证教练是否存在
    if (coach_id) {
      const [coaches] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM coaches WHERE id = ? AND status = "在职"',
        [coach_id]
      );

      if (coaches.length === 0) {
        return res.status(400).json({
          success: false,
          message: '教练不存在或已离职'
        });
      }
    }

    await pool.query(
      `UPDATE student_study_plans 
       SET plan_type = ?, plan_date = ?, time_slot = ?, coach_id = ?,
           status = ?, reminder_time = ?, notes = ?
       WHERE id = ?`,
      [plan_type, plan_date, time_slot, coach_id || null, status, reminder_time || null, notes, id]
    );

    res.json({
      success: true,
      message: '更新学习计划成功'
    });
  } catch (error: any) {
    console.error('更新学习计划失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
});

// 删除学习计划
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM student_study_plans WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '学习计划不存在'
      });
    }

    res.json({
      success: true,
      message: '删除学习计划成功'
    });
  } catch (error: any) {
    console.error('删除学习计划失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
});

// 获取指定日期范围的学习计划（用于日历视图）
router.get('/calendar/:year/:month', async (req: Request, res: Response) => {
  try {
    const { year, month } = req.params;
    const { student_id = '', coach_id = '' } = req.query;

    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = `${year}-${month.padStart(2, '0')}-31`;

    let whereClause = 'WHERE ssp.plan_date BETWEEN ? AND ?';
    const params: any[] = [startDate, endDate];

    if (student_id) {
      whereClause += ' AND ssp.student_id = ?';
      params.push(student_id);
    }

    if (coach_id) {
      whereClause += ' AND ssp.coach_id = ?';
      params.push(coach_id);
    }

    const [plans] = await pool.query<RowDataPacket[]>(
      `SELECT 
         ssp.*,
         s.name as student_name,
         c.name as coach_name
       FROM student_study_plans ssp
       INNER JOIN students s ON ssp.student_id = s.id
       LEFT JOIN coaches c ON ssp.coach_id = c.id
       ${whereClause}
       ORDER BY ssp.plan_date, ssp.time_slot`,
      params
    );

    res.json({
      success: true,
      message: '获取月度学习计划成功',
      data: plans
    });
  } catch (error: any) {
    console.error('获取月度学习计划失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
});

export default router;
