import { Router, Request, Response } from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const router = Router();

// 应用认证中间件
router.use(authMiddleware);

// ==================== 支出配置管理 ====================

// 获取支出配置列表
router.get('/configs', async (req: Request, res: Response) => {
  try {
    const { is_active } = req.query;
    
    let sql = `
      SELECT c.*, s.subject_name 
      FROM operation_expense_config c
      LEFT JOIN finance_subjects s ON c.subject_code = s.subject_code
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (is_active !== undefined) {
      sql += ` AND c.is_active = ?`;
      params.push(is_active === 'true');
    }
    
    sql += ` ORDER BY c.id ASC`;
    
    const [rows] = await pool.query(sql, params);
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error: any) {
    console.error('获取支出配置列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取支出配置列表失败: ' + error.message
    });
  }
});

// 获取可用的支出科目列表（只返回支出类科目）
router.get('/expense-subjects', async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(
      `SELECT subject_code, subject_name 
       FROM finance_subjects 
       WHERE subject_type = '支出' AND is_active = TRUE
       ORDER BY sort_order ASC, subject_code ASC`
    );
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error: any) {
    console.error('获取支出科目列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取支出科目列表失败: ' + error.message
    });
  }
});

// 新增支出配置
router.post('/configs', async (req: Request, res: Response) => {
  try {
    const { subject_code, expense_name, amount, payment_day, remark } = req.body;
    
    if (!subject_code || !expense_name || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: '科目、名称和金额不能为空'
      });
    }
    
    // 验证科目是否存在且为支出类
    const [subjects] = await pool.query<RowDataPacket[]>(
      `SELECT subject_code FROM finance_subjects 
       WHERE subject_code = ? AND subject_type = '支出' AND is_active = TRUE`,
      [subject_code]
    );
    
    if (subjects.length === 0) {
      return res.status(400).json({
        success: false,
        message: '所选科目不存在或不是有效的支出科目'
      });
    }
    
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO operation_expense_config 
       (subject_code, expense_name, amount, payment_day, remark) 
       VALUES (?, ?, ?, ?, ?)`,
      [subject_code, expense_name, parseFloat(amount), payment_day || 1, remark || null]
    );
    
    res.json({
      success: true,
      message: '支出配置创建成功',
      data: { id: result.insertId }
    });
  } catch (error: any) {
    console.error('创建支出配置失败:', error);
    res.status(500).json({
      success: false,
      message: '创建支出配置失败: ' + error.message
    });
  }
});

// 更新支出配置
router.put('/configs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { subject_code, expense_name, amount, payment_day, is_active, remark } = req.body;
    
    // 验证科目是否存在且为支出类
    if (subject_code) {
      const [subjects] = await pool.query<RowDataPacket[]>(
        `SELECT subject_code FROM finance_subjects 
         WHERE subject_code = ? AND subject_type = '支出' AND is_active = TRUE`,
        [subject_code]
      );
      
      if (subjects.length === 0) {
        return res.status(400).json({
          success: false,
          message: '所选科目不存在或不是有效的支出科目'
        });
      }
    }
    
    await pool.query(
      `UPDATE operation_expense_config 
       SET subject_code = ?, expense_name = ?, amount = ?, payment_day = ?, is_active = ?, remark = ?
       WHERE id = ?`,
      [subject_code, expense_name, parseFloat(amount), payment_day || 1, is_active !== false, remark || null, id]
    );
    
    res.json({
      success: true,
      message: '支出配置更新成功'
    });
  } catch (error: any) {
    console.error('更新支出配置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新支出配置失败: ' + error.message
    });
  }
});

// 删除支出配置
router.delete('/configs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 检查是否有月度记录
    const [records] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM operation_expense_monthly WHERE config_id = ?`,
      [id]
    );
    
    if (records[0].count > 0) {
      // 有记录则只停用
      await pool.query(
        `UPDATE operation_expense_config SET is_active = FALSE WHERE id = ?`,
        [id]
      );
      return res.json({
        success: true,
        message: '配置已被使用，已设为停用状态'
      });
    }
    
    // 无记录可直接删除
    await pool.query(`DELETE FROM operation_expense_config WHERE id = ?`, [id]);
    
    res.json({
      success: true,
      message: '支出配置删除成功'
    });
  } catch (error: any) {
    console.error('删除支出配置失败:', error);
    res.status(500).json({
      success: false,
      message: '删除支出配置失败: ' + error.message
    });
  }
});

// ==================== 月度支出管理 ====================

// 获取月度支出记录
router.get('/monthly', async (req: Request, res: Response) => {
  try {
    const { expense_month, status, limit = 50, offset = 0 } = req.query;
    
    let sql = `
      SELECT m.*, c.payment_day
      FROM operation_expense_monthly m
      LEFT JOIN operation_expense_config c ON m.config_id = c.id
      WHERE 1=1
    `;
    let countSql = `
      SELECT COUNT(*) as total
      FROM operation_expense_monthly m
      WHERE 1=1
    `;
    const params: any[] = [];
    const countParams: any[] = [];
    
    if (expense_month) {
      sql += ` AND m.expense_month = ?`;
      countSql += ` AND m.expense_month = ?`;
      params.push(expense_month);
      countParams.push(expense_month);
    }
    
    if (status) {
      sql += ` AND m.status = ?`;
      countSql += ` AND m.status = ?`;
      params.push(status);
      countParams.push(status);
    }
    
    sql += ` ORDER BY m.expense_month DESC, m.id ASC`;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit as string), parseInt(offset as string));
    
    const [rows] = await pool.query(sql, params);
    const [countResult] = await pool.query<RowDataPacket[]>(countSql, countParams);
    
    res.json({
      success: true,
      data: {
        list: rows,
        pagination: {
          total: countResult[0].total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      }
    });
  } catch (error: any) {
    console.error('获取月度支出记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取月度支出记录失败: ' + error.message
    });
  }
});

// 生成月度支出记录
router.post('/monthly/generate', async (req: Request, res: Response) => {
  try {
    const { expense_month } = req.body;
    
    if (!expense_month || !/^\d{4}-\d{2}$/.test(expense_month)) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的月份格式(YYYY-MM)'
      });
    }
    
    // 获取所有启用的配置
    const [configs] = await pool.query<RowDataPacket[]>(
      `SELECT c.*, s.subject_name 
       FROM operation_expense_config c
       LEFT JOIN finance_subjects s ON c.subject_code = s.subject_code
       WHERE c.is_active = TRUE`
    );
    
    if (configs.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有启用的支出配置'
      });
    }
    
    let insertedCount = 0;
    let skippedCount = 0;
    
    for (const config of configs) {
      try {
        await pool.query(
          `INSERT INTO operation_expense_monthly 
           (config_id, expense_month, subject_code, subject_name, expense_name, amount) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [config.id, expense_month, config.subject_code, config.subject_name, config.expense_name, config.amount]
        );
        insertedCount++;
      } catch (err: any) {
        if (err.code === 'ER_DUP_ENTRY') {
          skippedCount++;
        } else {
          throw err;
        }
      }
    }
    
    res.json({
      success: true,
      message: `生成完成: 新增${insertedCount}条, 跳过${skippedCount}条(已存在)`
    });
  } catch (error: any) {
    console.error('生成月度支出记录失败:', error);
    res.status(500).json({
      success: false,
      message: '生成月度支出记录失败: ' + error.message
    });
  }
});

// 确认支付（自动生成凭证）
router.put('/monthly/:id/pay', async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection() as PoolConnection;
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { remark } = req.body;
    
    // 获取支出记录
    const [records] = await connection.query<RowDataPacket[]>(
      `SELECT * FROM operation_expense_monthly WHERE id = ?`,
      [id]
    );
    
    if (records.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: '支出记录不存在'
      });
    }
    
    const record = records[0];
    
    if (record.status === 'paid') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: '该记录已支付'
      });
    }
    
    // 生成凭证号
    const voucherDate = new Date();
    const datePrefix = voucherDate.toISOString().slice(0, 10).replace(/-/g, '');
    
    const [maxVoucher] = await connection.query<RowDataPacket[]>(
      `SELECT MAX(voucher_no) as max_no FROM finance_vouchers WHERE voucher_no LIKE ?`,
      [`PZ${datePrefix}%`]
    );
    
    let seq = 1;
    if (maxVoucher[0].max_no) {
      const lastSeq = parseInt(maxVoucher[0].max_no.slice(-3));
      seq = lastSeq + 1;
    }
    const voucherNo = `PZ${datePrefix}${seq.toString().padStart(3, '0')}`;
    
    // 创建凭证主表
    const [voucherResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO finance_vouchers 
       (voucher_no, voucher_date, description, creator_id, creator_name, source_type, source_id, status)
       VALUES (?, ?, ?, ?, ?, 'operation_expense', ?, 'posted')`,
      [
        voucherNo,
        voucherDate.toISOString().slice(0, 10),
        `${record.expense_month} ${record.expense_name}`,
        req.user?.id || 0,
        req.user?.username || 'system',
        id
      ]
    );
    
    const voucherId = voucherResult.insertId;
    
    // 创建凭证明细 - 借:支出科目
    await connection.query(
      `INSERT INTO finance_voucher_items (voucher_id, entry_type, subject_code, amount, summary, seq)
       VALUES (?, '借', ?, ?, ?, 1)`,
      [voucherId, record.subject_code, record.amount, record.expense_name]
    );
    
    // 创建凭证明细 - 贷:银行存款(假设科目代码为1002)
    // 先检查银行存款科目是否存在
    const [bankSubject] = await connection.query<RowDataPacket[]>(
      `SELECT subject_code FROM finance_subjects WHERE subject_code = '1002' AND is_active = TRUE`
    );
    
    const creditSubjectCode = bankSubject.length > 0 ? '1002' : '101'; // 降级使用现金
    
    await connection.query(
      `INSERT INTO finance_voucher_items (voucher_id, entry_type, subject_code, amount, summary, seq)
       VALUES (?, '贷', ?, ?, ?, 2)`,
      [voucherId, creditSubjectCode, record.amount, record.expense_name]
    );
    
    // 更新支出记录状态
    await connection.query(
      `UPDATE operation_expense_monthly 
       SET status = 'paid', paid_at = NOW(), voucher_no = ?, remark = ?
       WHERE id = ?`,
      [voucherNo, remark || null, id]
    );
    
    await connection.commit();
    
    res.json({
      success: true,
      message: '支付确认成功，已生成凭证',
      data: { voucher_no: voucherNo }
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('确认支付失败:', error);
    res.status(500).json({
      success: false,
      message: '确认支付失败: ' + error.message
    });
  } finally {
    connection.release();
  }
});

// 更新月度支出记录（仅限未支付）
router.put('/monthly/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, remark } = req.body;
    
    // 检查状态
    const [records] = await pool.query<RowDataPacket[]>(
      `SELECT status FROM operation_expense_monthly WHERE id = ?`,
      [id]
    );
    
    if (records.length === 0) {
      return res.status(404).json({
        success: false,
        message: '记录不存在'
      });
    }
    
    if (records[0].status === 'paid') {
      return res.status(400).json({
        success: false,
        message: '已支付的记录不能修改'
      });
    }
    
    await pool.query(
      `UPDATE operation_expense_monthly SET amount = ?, remark = ? WHERE id = ?`,
      [parseFloat(amount), remark || null, id]
    );
    
    res.json({
      success: true,
      message: '更新成功'
    });
  } catch (error: any) {
    console.error('更新月度支出记录失败:', error);
    res.status(500).json({
      success: false,
      message: '更新月度支出记录失败: ' + error.message
    });
  }
});

// 删除月度支出记录（仅限未支付）
router.delete('/monthly/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 检查状态
    const [records] = await pool.query<RowDataPacket[]>(
      `SELECT status FROM operation_expense_monthly WHERE id = ?`,
      [id]
    );
    
    if (records.length === 0) {
      return res.status(404).json({
        success: false,
        message: '记录不存在'
      });
    }
    
    if (records[0].status === 'paid') {
      return res.status(400).json({
        success: false,
        message: '已支付的记录不能删除'
      });
    }
    
    await pool.query(`DELETE FROM operation_expense_monthly WHERE id = ?`, [id]);
    
    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error: any) {
    console.error('删除月度支出记录失败:', error);
    res.status(500).json({
      success: false,
      message: '删除月度支出记录失败: ' + error.message
    });
  }
});

// 批量删除月度支出记录（仅限未支付）
router.delete('/monthly/batch/:month', async (req: Request, res: Response) => {
  try {
    const { month } = req.params;
    
    const [result] = await pool.query<ResultSetHeader>(
      `DELETE FROM operation_expense_monthly WHERE expense_month = ? AND status = 'pending'`,
      [month]
    );
    
    res.json({
      success: true,
      message: `已删除${result.affectedRows}条待支付记录`
    });
  } catch (error: any) {
    console.error('批量删除月度支出记录失败:', error);
    res.status(500).json({
      success: false,
      message: '批量删除失败: ' + error.message
    });
  }
});

export default router;
