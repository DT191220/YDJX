import { Router, Request, Response } from 'express';
import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// 获取预警日志列表
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      student_id = '',
      warning_type = '',
      warning_subject = '',
      is_handled = ''
    } = req.query;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (student_id) {
      whereClause += ' AND ewl.student_id = ?';
      params.push(student_id);
    }

    if (warning_type) {
      whereClause += ' AND ewl.warning_type = ?';
      params.push(warning_type);
    }

    if (warning_subject) {
      whereClause += ' AND ewl.warning_subject = ?';
      params.push(warning_subject);
    }

    if (is_handled !== '') {
      whereClause += ' AND ewl.is_handled = ?';
      params.push(is_handled === 'true' || is_handled === '1' ? 1 : 0);
    }

    const [warnings] = await pool.query<RowDataPacket[]>(
      `SELECT 
         ewl.*,
         s.name as student_name,
         s.phone as student_phone,
         u.username as handler_name
       FROM exam_warning_logs ewl
       INNER JOIN students s ON ewl.student_id = s.id
       LEFT JOIN users u ON ewl.handled_by = u.id
       ${whereClause}
       ORDER BY ewl.created_at DESC`,
      params
    );

    res.json({
      success: true,
      message: '获取预警日志列表成功',
      data: warnings
    });
  } catch (error: any) {
    console.error('获取预警日志列表失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
});

// 获取预警统计
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const [stats] = await pool.query<RowDataPacket[]>(
      `SELECT 
         SUM(CASE WHEN warning_type = '3次预警' AND is_handled = 0 THEN 1 ELSE 0 END) as warning_3_count,
         SUM(CASE WHEN warning_type = '4次预警' AND is_handled = 0 THEN 1 ELSE 0 END) as warning_4_count,
         SUM(CASE WHEN warning_type = '资格作废' AND is_handled = 0 THEN 1 ELSE 0 END) as disqualified_count,
         SUM(CASE WHEN is_handled = 0 THEN 1 ELSE 0 END) as total_unhandled,
         SUM(CASE WHEN is_handled = 1 THEN 1 ELSE 0 END) as total_handled
       FROM exam_warning_logs`
    );

    res.json({
      success: true,
      message: '获取预警统计成功',
      data: stats[0]
    });
  } catch (error: any) {
    console.error('获取预警统计失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
});

// 标记预警已处理
router.put('/:id/handle', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { handled_by, handled_notes } = req.body;

    if (!handled_by) {
      return res.status(400).json({
        success: false,
        message: '处理人ID为必填项'
      });
    }

    // 检查预警记录是否存在
    const [warnings] = await pool.query<RowDataPacket[]>(
      'SELECT id, is_handled FROM exam_warning_logs WHERE id = ?',
      [id]
    );

    if (warnings.length === 0) {
      return res.status(404).json({
        success: false,
        message: '预警记录不存在'
      });
    }

    if (warnings[0].is_handled) {
      return res.status(400).json({
        success: false,
        message: '该预警已被处理'
      });
    }

    // 更新预警记录
    await pool.query(
      `UPDATE exam_warning_logs 
       SET is_handled = 1, handled_by = ?, handled_time = NOW(), handled_notes = ?
       WHERE id = ?`,
      [handled_by, handled_notes, id]
    );

    res.json({
      success: true,
      message: '标记预警已处理成功'
    });
  } catch (error: any) {
    console.error('标记预警已处理失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
});

// 批量标记预警已处理
router.put('/batch/handle', async (req: Request, res: Response) => {
  try {
    const { ids, handled_by, handled_notes } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '预警ID列表为必填项'
      });
    }

    if (!handled_by) {
      return res.status(400).json({
        success: false,
        message: '处理人ID为必填项'
      });
    }

    const placeholders = ids.map(() => '?').join(',');
    
    await pool.query(
      `UPDATE exam_warning_logs 
       SET is_handled = 1, handled_by = ?, handled_time = NOW(), handled_notes = ?
       WHERE id IN (${placeholders}) AND is_handled = 0`,
      [handled_by, handled_notes, ...ids]
    );

    res.json({
      success: true,
      message: '批量标记预警已处理成功'
    });
  } catch (error: any) {
    console.error('批量标记预警已处理失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
});

// 获取单个预警详情
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [warnings] = await pool.query<RowDataPacket[]>(
      `SELECT 
         ewl.*,
         s.name as student_name,
         s.phone as student_phone,
         u.username as handler_name
       FROM exam_warning_logs ewl
       INNER JOIN students s ON ewl.student_id = s.id
       LEFT JOIN users u ON ewl.handled_by = u.id
       WHERE ewl.id = ?`,
      [id]
    );

    if (warnings.length === 0) {
      return res.status(404).json({
        success: false,
        message: '预警记录不存在'
      });
    }

    res.json({
      success: true,
      message: '获取预警详情成功',
      data: warnings[0]
    });
  } catch (error: any) {
    console.error('获取预警详情失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
});

export default router;
