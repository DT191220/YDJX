import { Router, Request, Response } from 'express';
import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// 获取考试安排列表
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      start_date = '',
      end_date = '',
      exam_type = '',
      venue_id = ''
    } = req.query;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (start_date) {
      whereClause += ' AND es.exam_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      whereClause += ' AND es.exam_date <= ?';
      params.push(end_date);
    }

    if (exam_type) {
      whereClause += ' AND es.exam_type = ?';
      params.push(exam_type);
    }

    if (venue_id) {
      whereClause += ' AND es.venue_id = ?';
      params.push(venue_id);
    }

    const [schedules] = await pool.query<RowDataPacket[]>(
      `SELECT es.*, ev.name as venue_name, ev.address as venue_address,
              (SELECT COUNT(*) FROM exam_registrations er WHERE er.exam_schedule_id = es.id) as registered_count
       FROM exam_schedules es
       LEFT JOIN exam_venues ev ON es.venue_id = ev.id
       ${whereClause}
       ORDER BY es.exam_date DESC, es.exam_type`,
      params
    );

    res.json({
      success: true,
      message: '获取考试安排列表成功',
      data: schedules
    });
  } catch (error: any) {
    console.error('获取考试安排列表失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
});

// 获取月度考试统计（用于日历视图）
router.get('/monthly/:year/:month', async (req: Request, res: Response) => {
  try {
    const { year, month } = req.params;
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = `${year}-${month.padStart(2, '0')}-31`;

    const [schedules] = await pool.query<RowDataPacket[]>(
      `SELECT es.*, ev.name as venue_name,
              (SELECT COUNT(*) FROM exam_registrations er WHERE er.exam_schedule_id = es.id) as registered_count
       FROM exam_schedules es
       LEFT JOIN exam_venues ev ON es.venue_id = ev.id
       WHERE es.exam_date BETWEEN ? AND ?
       ORDER BY es.exam_date, es.exam_type`,
      [startDate, endDate]
    );

    res.json({
      success: true,
      message: '获取月度考试安排成功',
      data: schedules
    });
  } catch (error: any) {
    console.error('获取月度考试安排失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
});

// 获取单个考试安排详情
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [schedules] = await pool.query<RowDataPacket[]>(
      `SELECT es.*, ev.name as venue_name, ev.address as venue_address,
              (SELECT COUNT(*) FROM exam_registrations er WHERE er.exam_schedule_id = es.id) as registered_count
       FROM exam_schedules es
       LEFT JOIN exam_venues ev ON es.venue_id = ev.id
       WHERE es.id = ?`,
      [id]
    );

    if (schedules.length === 0) {
      return res.status(404).json({
        success: false,
        message: '考试安排不存在'
      });
    }

    res.json({
      success: true,
      message: '获取考试安排详情成功',
      data: schedules[0]
    });
  } catch (error: any) {
    console.error('获取考试安排详情失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
});

// 创建考试安排
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      exam_date,
      exam_type,
      venue_id,
      person_in_charge,
      notes
    } = req.body;

    // 验证必填字段
    if (!exam_date || !exam_type || !venue_id) {
      return res.status(400).json({
        success: false,
        message: '考试日期、考试类型、考试场地为必填项'
      });
    }

    // 验证考试类型
    const validExamTypes = ['科目一', '科目二', '科目三', '科目四'];
    if (!validExamTypes.includes(exam_type)) {
      return res.status(400).json({
        success: false,
        message: '考试类型无效'
      });
    }

    // 验证场地是否存在且启用
    const [venues] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM exam_venues WHERE id = ? AND is_active = 1',
      [venue_id]
    );

    if (venues.length === 0) {
      return res.status(400).json({
        success: false,
        message: '考试场地不存在或未启用'
      });
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO exam_schedules 
       (exam_date, exam_type, venue_id, person_in_charge, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [exam_date, exam_type, venue_id, person_in_charge, notes]
    );

    res.json({
      success: true,
      message: '创建考试安排成功',
      data: { id: result.insertId }
    });
  } catch (error: any) {
    console.error('创建考试安排失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
});

// 更新考试安排
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      exam_date,
      exam_type,
      venue_id,
      person_in_charge,
      notes
    } = req.body;

    // 验证必填字段
    if (!exam_date || !exam_type || !venue_id) {
      return res.status(400).json({
        success: false,
        message: '考试日期、考试类型、考试场地为必填项'
      });
    }

    // 检查考试安排是否存在
    const [schedules] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM exam_schedules WHERE id = ?',
      [id]
    );

    if (schedules.length === 0) {
      return res.status(404).json({
        success: false,
        message: '考试安排不存在'
      });
    }

    await pool.query(
      `UPDATE exam_schedules 
       SET exam_date = ?, exam_type = ?, venue_id = ?,
           person_in_charge = ?, notes = ?
       WHERE id = ?`,
      [exam_date, exam_type, venue_id, person_in_charge, notes, id]
    );

    res.json({
      success: true,
      message: '更新考试安排成功'
    });
  } catch (error: any) {
    console.error('更新考试安排失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
});

// 删除考试安排
router.delete('/:id', async (req: Request, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;

    await connection.beginTransaction();

    // 检查是否有学员报名
    const [registrations] = await connection.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM exam_registrations WHERE exam_schedule_id = ?',
      [id]
    );

    if (registrations[0].count > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: '该考试安排已有学员报名，无法删除'
      });
    }

    const [result] = await connection.query<ResultSetHeader>(
      'DELETE FROM exam_schedules WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: '考试安排不存在'
      });
    }

    await connection.commit();

    res.json({
      success: true,
      message: '删除考试安排成功'
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('删除考试安排失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  } finally {
    connection.release();
  }
});

// 获取考试通过率统计
router.get('/statistics/pass-rate', async (req: Request, res: Response) => {
  try {
    const { year, month } = req.query;

    let whereClause = 'WHERE er.exam_result IN ("通过", "未通过")';
    const params: any[] = [];

    if (year && month) {
      whereClause += ' AND YEAR(es.exam_date) = ? AND MONTH(es.exam_date) = ?';
      params.push(year, month);
    } else if (year) {
      whereClause += ' AND YEAR(es.exam_date) = ?';
      params.push(year);
    }

    const [statistics] = await pool.query<RowDataPacket[]>(
      `SELECT 
         es.exam_type,
         COUNT(*) as total_count,
         SUM(CASE WHEN er.exam_result = '通过' THEN 1 ELSE 0 END) as pass_count,
         ROUND(SUM(CASE WHEN er.exam_result = '通过' THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as pass_rate
       FROM exam_registrations er
       JOIN exam_schedules es ON er.exam_schedule_id = es.id
       ${whereClause}
       GROUP BY es.exam_type
       ORDER BY es.exam_type`,
      params
    );

    res.json({
      success: true,
      message: '获取考试通过率统计成功',
      data: statistics
    });
  } catch (error: any) {
    console.error('获取考试通过率统计失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
});

export default router;
