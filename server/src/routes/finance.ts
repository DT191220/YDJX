import { Router, Request, Response } from 'express';
import pool from '../config/database';
import { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise';
import { validateSortParams } from '../utils/security';

const router = Router();

// ========================================
// 工具函数
// ========================================

/**
 * 生成凭证号（并发安全）
 * 使用 INSERT ... ON DUPLICATE KEY UPDATE 原子操作
 */
async function generateVoucherNo(date: Date, conn: PoolConnection): Promise<string> {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const yearMonth = `${year}${month}`;

  // 原子操作：插入或更新序号
  await conn.query(
    `INSERT INTO finance_voucher_sequence (year_month, current_seq) 
     VALUES (?, 1) 
     ON DUPLICATE KEY UPDATE current_seq = current_seq + 1`,
    [yearMonth]
  );

  // 获取更新后的序号
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT current_seq FROM finance_voucher_sequence WHERE year_month = ?`,
    [yearMonth]
  );

  const seq = rows[0].current_seq;
  return `${yearMonth}-${String(seq).padStart(3, '0')}`;
}

/**
 * 校验借贷平衡
 */
interface VoucherItem {
  entry_type: '借' | '贷';
  subject_code: string;
  amount: number | string;
  summary?: string;
}

function validateBalance(items: VoucherItem[]): { valid: boolean; debit: number; credit: number } {
  const totalDebit = items
    .filter(i => i.entry_type === '借')
    .reduce((sum, i) => sum + parseFloat(String(i.amount)), 0);
  const totalCredit = items
    .filter(i => i.entry_type === '贷')
    .reduce((sum, i) => sum + parseFloat(String(i.amount)), 0);

  return {
    valid: Math.abs(totalDebit - totalCredit) < 0.001,
    debit: totalDebit,
    credit: totalCredit
  };
}

// ========================================
// 科目管理接口
// ========================================

// 获取科目列表
router.get('/subjects', async (req: Request, res: Response) => {
  try {
    const { type, is_active } = req.query;

    let sql = `SELECT * FROM finance_subjects WHERE 1=1`;
    const params: any[] = [];

    if (type) {
      sql += ` AND subject_type = ?`;
      params.push(type);
    }

    if (is_active !== undefined) {
      sql += ` AND is_active = ?`;
      params.push(is_active === 'true' ? 1 : 0);
    }

    sql += ` ORDER BY sort_order ASC, subject_code ASC`;

    const [rows] = await pool.query<RowDataPacket[]>(sql, params);

    res.json({
      success: true,
      data: rows
    });
  } catch (error: any) {
    console.error('获取科目列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取科目列表失败: ' + error.message
    });
  }
});

// 新增科目
router.post('/subjects', async (req: Request, res: Response) => {
  try {
    const { subject_code, subject_name, subject_type, balance_direction, parent_code, sort_order } = req.body;

    if (!subject_code || !subject_name || !subject_type || !balance_direction) {
      return res.status(400).json({
        success: false,
        message: '科目代码、名称、类型和余额方向为必填项'
      });
    }

    // 检查科目代码是否已存在
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM finance_subjects WHERE subject_code = ?',
      [subject_code]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: '科目代码已存在'
      });
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO finance_subjects (subject_code, subject_name, subject_type, balance_direction, parent_code, sort_order) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [subject_code, subject_name, subject_type, balance_direction, parent_code || null, sort_order || 0]
    );

    res.json({
      success: true,
      data: { id: result.insertId },
      message: '科目创建成功'
    });
  } catch (error: any) {
    console.error('创建科目失败:', error);
    res.status(500).json({
      success: false,
      message: '创建科目失败: ' + error.message
    });
  }
});

// 修改科目
router.put('/subjects/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { subject_name, subject_type, balance_direction, parent_code, is_active, sort_order } = req.body;

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE finance_subjects 
       SET subject_name = ?, subject_type = ?, balance_direction = ?, parent_code = ?, is_active = ?, sort_order = ?
       WHERE id = ?`,
      [subject_name, subject_type, balance_direction, parent_code || null, is_active !== false, sort_order || 0, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '科目不存在'
      });
    }

    res.json({
      success: true,
      message: '科目更新成功'
    });
  } catch (error: any) {
    console.error('更新科目失败:', error);
    res.status(500).json({
      success: false,
      message: '更新科目失败: ' + error.message
    });
  }
});

// 删除科目（软删除，设为停用）
router.delete('/subjects/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 检查是否有凭证使用该科目
    const [used] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM finance_voucher_items fvi 
       JOIN finance_subjects fs ON fvi.subject_code = fs.subject_code 
       WHERE fs.id = ?`,
      [id]
    );

    if (used[0].count > 0) {
      // 有凭证使用，只能停用
      await pool.query('UPDATE finance_subjects SET is_active = FALSE WHERE id = ?', [id]);
      return res.json({
        success: true,
        message: '科目已被凭证使用，已设为停用状态'
      });
    }

    // 无凭证使用，可以删除
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM finance_subjects WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '科目不存在'
      });
    }

    res.json({
      success: true,
      message: '科目删除成功'
    });
  } catch (error: any) {
    console.error('删除科目失败:', error);
    res.status(500).json({
      success: false,
      message: '删除科目失败: ' + error.message
    });
  }
});

// ========================================
// 凭证管理接口
// ========================================

// 查询凭证列表
router.get('/vouchers', async (req: Request, res: Response) => {
  try {
    const {
      start_date,
      end_date,
      subject_code,
      source_type,
      keyword,
      limit = '10',
      offset = '0',
      sortBy = 'voucher_date',
      sortOrder = 'DESC'
    } = req.query;

    // 白名单校验排序字段
    const validColumns = ['id', 'voucher_no', 'voucher_date', 'created_at'];
    const { sortColumn, order } = validateSortParams(
      sortBy as string,
      sortOrder as string,
      validColumns,
      'voucher_date'
    );

    let sql = `
      SELECT 
        v.*,
        (SELECT SUM(amount) FROM finance_voucher_items WHERE voucher_id = v.id AND entry_type = '借') as total_debit,
        (SELECT SUM(amount) FROM finance_voucher_items WHERE voucher_id = v.id AND entry_type = '贷') as total_credit
      FROM finance_vouchers v
      WHERE 1=1
    `;
    const params: any[] = [];

    if (start_date) {
      sql += ` AND v.voucher_date >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      sql += ` AND v.voucher_date <= ?`;
      params.push(end_date);
    }

    if (source_type) {
      sql += ` AND v.source_type = ?`;
      params.push(source_type);
    }

    if (subject_code) {
      sql += ` AND EXISTS (SELECT 1 FROM finance_voucher_items WHERE voucher_id = v.id AND subject_code = ?)`;
      params.push(subject_code);
    }

    if (keyword) {
      sql += ` AND (v.voucher_no LIKE ? OR v.description LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    // 获取总数
    const countSql = sql.replace(/SELECT[\s\S]+FROM finance_vouchers/, 'SELECT COUNT(*) as total FROM finance_vouchers');
    const [countResult] = await pool.query<RowDataPacket[]>(countSql, params);
    const total = countResult[0].total;

    // 添加排序和分页
    sql += ` ORDER BY ${sortColumn} ${order} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const [rows] = await pool.query<RowDataPacket[]>(sql, params);

    res.json({
      success: true,
      data: {
        list: rows,
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
  } catch (error: any) {
    console.error('查询凭证列表失败:', error);
    res.status(500).json({
      success: false,
      message: '查询凭证列表失败: ' + error.message
    });
  }
});

// 获取凭证详情
router.get('/vouchers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 获取凭证主信息
    const [vouchers] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM finance_vouchers WHERE id = ?',
      [id]
    );

    if (vouchers.length === 0) {
      return res.status(404).json({
        success: false,
        message: '凭证不存在'
      });
    }

    // 获取凭证明细
    const [items] = await pool.query<RowDataPacket[]>(
      `SELECT fvi.*, fs.subject_name 
       FROM finance_voucher_items fvi
       LEFT JOIN finance_subjects fs ON fvi.subject_code = fs.subject_code
       WHERE fvi.voucher_id = ?
       ORDER BY fvi.seq ASC, fvi.id ASC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...vouchers[0],
        items
      }
    });
  } catch (error: any) {
    console.error('获取凭证详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取凭证详情失败: ' + error.message
    });
  }
});

// 创建凭证（手动录入）
router.post('/vouchers', async (req: Request, res: Response) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { voucher_date, description, creator_id, creator_name, items } = req.body;

    // 验证必填项
    if (!voucher_date || !items || items.length < 2) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: '记账日期和至少两条分录为必填项'
      });
    }

    // 验证借贷平衡
    const balance = validateBalance(items);
    if (!balance.valid) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `借贷不平衡：借方 ${balance.debit.toFixed(2)}，贷方 ${balance.credit.toFixed(2)}，差额 ${Math.abs(balance.debit - balance.credit).toFixed(2)}`
      });
    }

    // 生成凭证号
    const voucherNo = await generateVoucherNo(new Date(voucher_date), connection);

    // 插入凭证主表
    const [voucherResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO finance_vouchers (voucher_no, voucher_date, description, creator_id, creator_name, source_type) 
       VALUES (?, ?, ?, ?, ?, 'manual')`,
      [voucherNo, voucher_date, description || '', creator_id || 0, creator_name || '']
    );
    const voucherId = voucherResult.insertId;

    // 插入凭证明细
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await connection.query(
        `INSERT INTO finance_voucher_items (voucher_id, entry_type, subject_code, amount, summary, seq) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [voucherId, item.entry_type, item.subject_code, parseFloat(item.amount), item.summary || '', i]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      data: {
        id: voucherId,
        voucher_no: voucherNo
      },
      message: '凭证创建成功'
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('创建凭证失败:', error);
    res.status(500).json({
      success: false,
      message: '创建凭证失败: ' + error.message
    });
  } finally {
    connection.release();
  }
});

// 删除凭证（仅限手动录入的草稿状态）
router.delete('/vouchers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 检查凭证是否存在且可删除
    const [vouchers] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM finance_vouchers WHERE id = ?',
      [id]
    );

    if (vouchers.length === 0) {
      return res.status(404).json({
        success: false,
        message: '凭证不存在'
      });
    }

    const voucher = vouchers[0];

    // 只有手动录入的凭证可以删除
    if (voucher.source_type !== 'manual') {
      return res.status(400).json({
        success: false,
        message: '自动生成的凭证不可删除，请通过红字冲销处理'
      });
    }

    // 删除凭证（明细会级联删除）
    await pool.query('DELETE FROM finance_vouchers WHERE id = ?', [id]);

    res.json({
      success: true,
      message: '凭证删除成功'
    });
  } catch (error: any) {
    console.error('删除凭证失败:', error);
    res.status(500).json({
      success: false,
      message: '删除凭证失败: ' + error.message
    });
  }
});

// ========================================
// 总校上缴配置接口
// ========================================

// 获取上缴配置列表（关联班型信息）
router.get('/headquarter-config', async (req: Request, res: Response) => {
  try {
    const { is_active, class_type_id } = req.query;

    let sql = `
      SELECT hc.*, 
             ct.name as class_type_name, 
             ct.contract_amount as class_type_contract_amount,
             ct.status as class_type_status
      FROM headquarter_config hc
      LEFT JOIN class_types ct ON hc.class_type_id = ct.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (is_active !== undefined) {
      sql += ` AND hc.is_active = ?`;
      params.push(is_active === 'true' ? 1 : 0);
    }

    if (class_type_id !== undefined) {
      if (class_type_id === 'null' || class_type_id === '') {
        sql += ` AND hc.class_type_id IS NULL`;
      } else {
        sql += ` AND hc.class_type_id = ?`;
        params.push(class_type_id);
      }
    }

    sql += ` ORDER BY hc.class_type_id IS NULL, ct.name, hc.effective_date DESC, hc.id DESC`;

    const [rows] = await pool.query<RowDataPacket[]>(sql, params);

    res.json({
      success: true,
      data: rows
    });
  } catch (error: any) {
    console.error('获取上缴配置列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取上缴配置列表失败: ' + error.message
    });
  }
});

// 获取当前生效的上缴配置（支持按班型查询，自动回落到全局配置）
router.get('/headquarter-config/active', async (req: Request, res: Response) => {
  try {
    const { class_type_id } = req.query;
    const today = new Date().toISOString().split('T')[0];

    // 先查找指定班型的配置
    if (class_type_id) {
      const [classTypeRows] = await pool.query<RowDataPacket[]>(
        `SELECT hc.*, ct.name as class_type_name, ct.contract_amount as class_type_contract_amount
         FROM headquarter_config hc
         LEFT JOIN class_types ct ON hc.class_type_id = ct.id
         WHERE hc.is_active = TRUE 
           AND hc.class_type_id = ?
           AND hc.effective_date <= ?
           AND (hc.expire_date IS NULL OR hc.expire_date >= ?)
         ORDER BY hc.effective_date DESC 
         LIMIT 1`,
        [class_type_id, today, today]
      );

      if (classTypeRows.length > 0) {
        return res.json({
          success: true,
          data: classTypeRows[0],
          source: 'class_type' // 标记来源为班型专属配置
        });
      }
    }

    // 查找全局默认配置（class_type_id IS NULL）
    const [globalRows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM headquarter_config 
       WHERE is_active = TRUE 
         AND class_type_id IS NULL
         AND effective_date <= ?
         AND (expire_date IS NULL OR expire_date >= ?)
       ORDER BY effective_date DESC 
       LIMIT 1`,
      [today, today]
    );

    if (globalRows.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: '当前没有生效的上缴配置'
      });
    }

    res.json({
      success: true,
      data: globalRows[0],
      source: 'global' // 标记来源为全局配置
    });
  } catch (error: any) {
    console.error('获取当前生效配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取当前生效配置失败: ' + error.message
    });
  }
});

// 新增上缴配置
router.post('/headquarter-config', async (req: Request, res: Response) => {
  try {
    const { class_type_id, config_name, config_type, ratio, fixed_amount, effective_date, expire_date, is_active, remark, created_by } = req.body;

    if (!config_name || !config_type || !effective_date) {
      return res.status(400).json({
        success: false,
        message: '配置名称、计算类型和生效日期为必填项'
      });
    }

    // 根据类型验证必填字段
    if (config_type === 'ratio' && (ratio === undefined || ratio === null)) {
      return res.status(400).json({
        success: false,
        message: '比例类型配置必须填写上缴比例'
      });
    }

    if (config_type === 'fixed' && (fixed_amount === undefined || fixed_amount === null)) {
      return res.status(400).json({
        success: false,
        message: '固定金额类型配置必须填写固定金额'
      });
    }

    // 验证比例范围
    if (config_type === 'ratio' && (ratio < 0 || ratio > 1)) {
      return res.status(400).json({
        success: false,
        message: '上缴比例必须在0到1之间'
      });
    }

    // 如果指定了班型，验证班型是否存在
    if (class_type_id) {
      const [classTypeRows] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM class_types WHERE id = ?',
        [class_type_id]
      );
      if (classTypeRows.length === 0) {
        return res.status(400).json({
          success: false,
          message: '指定的班型不存在'
        });
      }
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO headquarter_config (class_type_id, config_name, config_type, ratio, fixed_amount, effective_date, expire_date, is_active, remark, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        class_type_id || null,
        config_name,
        config_type,
        config_type === 'ratio' ? ratio : null,
        config_type === 'fixed' ? fixed_amount : null,
        effective_date,
        expire_date || null,
        is_active !== false,
        remark || null,
        created_by || null
      ]
    );

    res.json({
      success: true,
      data: { id: result.insertId },
      message: '配置创建成功'
    });
  } catch (error: any) {
    console.error('创建上缴配置失败:', error);
    // 处理唯一约束冲突
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: '该班型在该生效日期已存在配置'
      });
    }
    res.status(500).json({
      success: false,
      message: '创建上缴配置失败: ' + error.message
    });
  }
});

// 修改上缴配置
router.put('/headquarter-config/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { class_type_id, config_name, config_type, ratio, fixed_amount, effective_date, expire_date, is_active, remark } = req.body;

    // 根据类型验证必填字段
    if (config_type === 'ratio' && (ratio === undefined || ratio === null)) {
      return res.status(400).json({
        success: false,
        message: '比例类型配置必须填写上缴比例'
      });
    }

    if (config_type === 'fixed' && (fixed_amount === undefined || fixed_amount === null)) {
      return res.status(400).json({
        success: false,
        message: '固定金额类型配置必须填写固定金额'
      });
    }

    // 验证比例范围
    if (config_type === 'ratio' && (ratio < 0 || ratio > 1)) {
      return res.status(400).json({
        success: false,
        message: '上缴比例必须在0到1之间'
      });
    }

    // 如果指定了班型，验证班型是否存在
    if (class_type_id) {
      const [classTypeRows] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM class_types WHERE id = ?',
        [class_type_id]
      );
      if (classTypeRows.length === 0) {
        return res.status(400).json({
          success: false,
          message: '指定的班型不存在'
        });
      }
    }

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE headquarter_config 
       SET class_type_id = ?, config_name = ?, config_type = ?, ratio = ?, fixed_amount = ?, 
           effective_date = ?, expire_date = ?, is_active = ?, remark = ?
       WHERE id = ?`,
      [
        class_type_id || null,
        config_name,
        config_type,
        config_type === 'ratio' ? ratio : null,
        config_type === 'fixed' ? fixed_amount : null,
        effective_date,
        expire_date || null,
        is_active !== false,
        remark || null,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '配置不存在'
      });
    }

    res.json({
      success: true,
      message: '配置更新成功'
    });
  } catch (error: any) {
    console.error('更新上缴配置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新上缴配置失败: ' + error.message
    });
  }
});

// 删除上缴配置
router.delete('/headquarter-config/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM headquarter_config WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '配置不存在'
      });
    }

    res.json({
      success: true,
      message: '配置删除成功'
    });
  } catch (error: any) {
    console.error('删除上缴配置失败:', error);
    res.status(500).json({
      success: false,
      message: '删除上缴配置失败: ' + error.message
    });
  }
});

// ========================================
// 财务报表接口
// ========================================

// 月度利润表（含分摊费用）
router.get('/reports/profit-monthly', async (req: Request, res: Response) => {
  try {
    const { yearMonth } = req.query;

    if (!yearMonth) {
      return res.status(400).json({
        success: false,
        message: '请指定查询月份（格式：YYYY-MM）'
      });
    }

    // 解析年月
    const [yearStr, monthStr] = (yearMonth as string).split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    // 查询实际发生的收支
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT 
        s.subject_type,
        s.subject_code,
        s.subject_name,
        SUM(CASE WHEN i.entry_type = '借' THEN i.amount ELSE 0 END) as total_debit,
        SUM(CASE WHEN i.entry_type = '贷' THEN i.amount ELSE 0 END) as total_credit
      FROM finance_voucher_items i
      JOIN finance_subjects s ON i.subject_code = s.subject_code
      JOIN finance_vouchers v ON i.voucher_id = v.id
      WHERE DATE_FORMAT(v.voucher_date, '%Y-%m') = ?
        AND s.subject_type IN ('收入', '支出')
      GROUP BY s.subject_type, s.subject_code, s.subject_name
      ORDER BY s.subject_type, s.subject_code
    `, [yearMonth]);

    // 查询当月适用的分摊费用
    const [allocatedRows] = await pool.query<RowDataPacket[]>(`
      SELECT ea.*, fs.subject_name
      FROM finance_expense_allocation ea
      LEFT JOIN finance_subjects fs ON ea.subject_code = fs.subject_code
      WHERE ea.allocation_year = ?
        AND ea.is_active = TRUE
        AND ea.start_month <= ?
        AND ea.end_month >= ?
    `, [year, month, month]);

    // 计算汇总
    let totalIncome = 0;
    let totalExpense = 0;
    let totalAllocated = 0;

    const incomeItems: any[] = [];
    const expenseItems: any[] = [];
    const allocatedItems: any[] = [];

    rows.forEach((row: any) => {
      if (row.subject_type === '收入') {
        const amount = row.total_credit - row.total_debit;
        totalIncome += amount;
        incomeItems.push({
          subject_code: row.subject_code,
          subject_name: row.subject_name,
          amount: amount
        });
      } else if (row.subject_type === '支出') {
        const amount = row.total_debit - row.total_credit;
        totalExpense += amount;
        expenseItems.push({
          subject_code: row.subject_code,
          subject_name: row.subject_name,
          amount: amount
        });
      }
    });

    // 处理分摊费用
    allocatedRows.forEach((row: any) => {
      const monthlyAmount = parseFloat(row.monthly_amount) || 0;
      totalAllocated += monthlyAmount;
      allocatedItems.push({
        id: row.id,
        expense_name: row.expense_name,
        subject_code: row.subject_code,
        subject_name: row.subject_name,
        total_amount: parseFloat(row.total_amount),
        monthly_amount: monthlyAmount
      });
    });

    res.json({
      success: true,
      data: {
        yearMonth,
        incomeItems,
        expenseItems,
        allocatedItems,
        totalIncome,
        totalExpense,
        totalAllocated,
        netProfit: totalIncome - totalExpense - totalAllocated
      }
    });
  } catch (error: any) {
    console.error('获取月度利润表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取月度利润表失败: ' + error.message
    });
  }
});

// 收支明细表
router.get('/reports/balance-detail', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, subjectType } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: '请指定查询日期范围'
      });
    }

    let sql = `
      SELECT 
        v.voucher_date,
        v.voucher_no,
        v.description,
        i.entry_type,
        s.subject_code,
        s.subject_name,
        s.subject_type,
        i.amount,
        i.summary
      FROM finance_voucher_items i
      JOIN finance_subjects s ON i.subject_code = s.subject_code
      JOIN finance_vouchers v ON i.voucher_id = v.id
      WHERE v.voucher_date BETWEEN ? AND ?
    `;
    const params: any[] = [startDate, endDate];

    if (subjectType) {
      sql += ` AND s.subject_type = ?`;
      params.push(subjectType);
    }

    sql += ` ORDER BY v.voucher_date, v.voucher_no, i.id`;

    const [rows] = await pool.query<RowDataPacket[]>(sql, params);

    res.json({
      success: true,
      data: rows
    });
  } catch (error: any) {
    console.error('获取收支明细表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取收支明细表失败: ' + error.message
    });
  }
});

// 科目余额表
router.get('/reports/subject-balance', async (req: Request, res: Response) => {
  try {
    const { date, subjectType } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: '请指定截止日期'
      });
    }

    let sql = `
      SELECT 
        s.subject_code,
        s.subject_name,
        s.subject_type,
        s.balance_direction,
        COALESCE(SUM(CASE WHEN i.entry_type = '借' THEN i.amount ELSE 0 END), 0) as total_debit,
        COALESCE(SUM(CASE WHEN i.entry_type = '贷' THEN i.amount ELSE 0 END), 0) as total_credit
      FROM finance_subjects s
      LEFT JOIN finance_voucher_items i ON s.subject_code = i.subject_code
      LEFT JOIN finance_vouchers v ON i.voucher_id = v.id AND v.voucher_date <= ?
      WHERE s.is_active = TRUE
    `;
    const params: any[] = [date];

    if (subjectType) {
      sql += ` AND s.subject_type = ?`;
      params.push(subjectType);
    }

    sql += ` GROUP BY s.subject_code, s.subject_name, s.subject_type, s.balance_direction
             ORDER BY s.subject_type, s.subject_code`;

    const [rows] = await pool.query<RowDataPacket[]>(sql, params);

    // 计算余额
    const result = rows.map((row: any) => {
      let balance = 0;
      // 借方余额科目（资产、支出）：借方 - 贷方
      // 贷方余额科目（负债、权益、收入）：贷方 - 借方
      if (row.balance_direction === '借') {
        balance = row.total_debit - row.total_credit;
      } else {
        balance = row.total_credit - row.total_debit;
      }

      return {
        ...row,
        balance,
        balance_direction_text: balance >= 0 ? row.balance_direction : (row.balance_direction === '借' ? '贷' : '借'),
        balance_abs: Math.abs(balance)
      };
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('获取科目余额表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取科目余额表失败: ' + error.message
    });
  }
});

// 年度利润汇总表
router.get('/reports/profit-yearly', async (req: Request, res: Response) => {
  try {
    const { year } = req.query;

    if (!year) {
      return res.status(400).json({
        success: false,
        message: '请指定查询年度'
      });
    }

    const yearNum = parseInt(year as string);
    const monthlyData: any[] = [];
    let yearlyTotalIncome = 0;
    let yearlyTotalExpense = 0;
    let yearlyTotalAllocated = 0;

    // 查询该年度的分摊配置
    const [allocationRows] = await pool.query<RowDataPacket[]>(`
      SELECT * FROM finance_expense_allocation
      WHERE allocation_year = ? AND is_active = TRUE
    `, [yearNum]);

    // 遍历12个月
    for (let month = 1; month <= 12; month++) {
      const yearMonth = `${yearNum}-${String(month).padStart(2, '0')}`;

      // 查询该月实际发生的收支
      const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT 
          s.subject_type,
          SUM(CASE WHEN i.entry_type = '借' THEN i.amount ELSE 0 END) as total_debit,
          SUM(CASE WHEN i.entry_type = '贷' THEN i.amount ELSE 0 END) as total_credit
        FROM finance_voucher_items i
        JOIN finance_subjects s ON i.subject_code = s.subject_code
        JOIN finance_vouchers v ON i.voucher_id = v.id
        WHERE DATE_FORMAT(v.voucher_date, '%Y-%m') = ?
          AND s.subject_type IN ('收入', '支出')
        GROUP BY s.subject_type
      `, [yearMonth]);

      let monthIncome = 0;
      let monthExpense = 0;

      rows.forEach((row: any) => {
        if (row.subject_type === '收入') {
          monthIncome = row.total_credit - row.total_debit;
        } else if (row.subject_type === '支出') {
          monthExpense = row.total_debit - row.total_credit;
        }
      });

      // 计算该月的分摊费用
      let monthAllocated = 0;
      allocationRows.forEach((allocation: any) => {
        if (month >= allocation.start_month && month <= allocation.end_month) {
          monthAllocated += parseFloat(allocation.monthly_amount) || 0;
        }
      });

      const monthNetProfit = monthIncome - monthExpense - monthAllocated;

      monthlyData.push({
        month,
        income: monthIncome,
        expense: monthExpense,
        allocated: monthAllocated,
        netProfit: monthNetProfit
      });

      yearlyTotalIncome += monthIncome;
      yearlyTotalExpense += monthExpense;
      yearlyTotalAllocated += monthAllocated;
    }

    res.json({
      success: true,
      data: {
        year: yearNum,
        monthlyData,
        yearlyTotal: {
          totalIncome: yearlyTotalIncome,
          totalExpense: yearlyTotalExpense,
          totalAllocated: yearlyTotalAllocated,
          netProfit: yearlyTotalIncome - yearlyTotalExpense - yearlyTotalAllocated
        }
      }
    });
  } catch (error: any) {
    console.error('获取年度利润汇总失败:', error);
    res.status(500).json({
      success: false,
      message: '获取年度利润汇总失败: ' + error.message
    });
  }
});

// ========================================
// 费用分摊配置接口
// ========================================

// 获取费用分摊配置列表
router.get('/expense-allocation', async (req: Request, res: Response) => {
  try {
    const { year, is_active } = req.query;

    let sql = `
      SELECT ea.*, fs.subject_name 
      FROM finance_expense_allocation ea
      LEFT JOIN finance_subjects fs ON ea.subject_code = fs.subject_code
      WHERE 1=1
    `;
    const params: any[] = [];

    if (year) {
      sql += ` AND ea.allocation_year = ?`;
      params.push(year);
    }

    if (is_active !== undefined) {
      sql += ` AND ea.is_active = ?`;
      params.push(is_active === 'true' ? 1 : 0);
    }

    sql += ` ORDER BY ea.allocation_year DESC, ea.subject_code ASC`;

    const [rows] = await pool.query<RowDataPacket[]>(sql, params);

    res.json({
      success: true,
      data: rows
    });
  } catch (error: any) {
    console.error('获取费用分摊配置列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取费用分摊配置列表失败: ' + error.message
    });
  }
});

// 新增费用分摊配置
router.post('/expense-allocation', async (req: Request, res: Response) => {
  try {
    const { 
      expense_name, subject_code, total_amount, allocation_year, 
      allocation_method, monthly_amount, start_month, end_month, 
      remark, is_active, created_by 
    } = req.body;

    if (!expense_name || !subject_code || !total_amount || !allocation_year) {
      return res.status(400).json({
        success: false,
        message: '费用名称、关联科目、年度总金额和分摊年度为必填项'
      });
    }

    // 验证科目是否存在且为支出类
    const [subjectRows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM finance_subjects WHERE subject_code = ? AND subject_type = '支出'`,
      [subject_code]
    );

    if (subjectRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: '关联科目不存在或不是支出类科目'
      });
    }

    // 计算每月分摊金额
    const method = allocation_method || 'average';
    const startM = start_month || 1;
    const endM = end_month || 12;
    const monthCount = endM - startM + 1;
    
    let calculatedMonthlyAmount = monthly_amount;
    if (method === 'average') {
      calculatedMonthlyAmount = Math.round(parseFloat(total_amount) / monthCount * 100) / 100;
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO finance_expense_allocation 
       (expense_name, subject_code, total_amount, allocation_year, allocation_method, 
        monthly_amount, start_month, end_month, remark, is_active, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        expense_name, subject_code, total_amount, allocation_year, method,
        calculatedMonthlyAmount, startM, endM, remark || null, 
        is_active !== false, created_by || null
      ]
    );

    res.json({
      success: true,
      data: { id: result.insertId },
      message: '费用分摊配置创建成功'
    });
  } catch (error: any) {
    console.error('创建费用分摊配置失败:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: '该科目在该年度已存在分摊配置'
      });
    }
    res.status(500).json({
      success: false,
      message: '创建费用分摊配置失败: ' + error.message
    });
  }
});

// 修改费用分摊配置
router.put('/expense-allocation/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      expense_name, subject_code, total_amount, allocation_year,
      allocation_method, monthly_amount, start_month, end_month, 
      remark, is_active 
    } = req.body;

    // 计算每月分摊金额
    const method = allocation_method || 'average';
    const startM = start_month || 1;
    const endM = end_month || 12;
    const monthCount = endM - startM + 1;
    
    let calculatedMonthlyAmount = monthly_amount;
    if (method === 'average' && total_amount) {
      calculatedMonthlyAmount = Math.round(parseFloat(total_amount) / monthCount * 100) / 100;
    }

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE finance_expense_allocation 
       SET expense_name = ?, subject_code = ?, total_amount = ?, allocation_year = ?,
           allocation_method = ?, monthly_amount = ?, start_month = ?, end_month = ?,
           remark = ?, is_active = ?
       WHERE id = ?`,
      [
        expense_name, subject_code, total_amount, allocation_year,
        method, calculatedMonthlyAmount, startM, endM,
        remark || null, is_active !== false, id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '费用分摊配置不存在'
      });
    }

    res.json({
      success: true,
      message: '费用分摊配置更新成功'
    });
  } catch (error: any) {
    console.error('更新费用分摊配置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新费用分摊配置失败: ' + error.message
    });
  }
});

// 删除费用分摊配置
router.delete('/expense-allocation/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM finance_expense_allocation WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '费用分摊配置不存在'
      });
    }

    res.json({
      success: true,
      message: '费用分摊配置删除成功'
    });
  } catch (error: any) {
    console.error('删除费用分摊配置失败:', error);
    res.status(500).json({
      success: false,
      message: '删除费用分摊配置失败: ' + error.message
    });
  }
});

// ========================================
// 科目用途映射接口
// ========================================

// 获取科目映射列表
router.get('/subject-mapping', async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT sm.*, fs.subject_name 
      FROM finance_subject_mapping sm
      LEFT JOIN finance_subjects fs ON sm.subject_code = fs.subject_code
      ORDER BY sm.id ASC
    `);

    res.json({
      success: true,
      data: rows
    });
  } catch (error: any) {
    console.error('获取科目映射列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取科目映射列表失败: ' + error.message
    });
  }
});

// 更新科目映射
router.put('/subject-mapping/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { subject_code } = req.body;

    if (!subject_code) {
      return res.status(400).json({
        success: false,
        message: '科目代码为必填项'
      });
    }

    // 验证科目是否存在
    const [subjectRows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM finance_subjects WHERE subject_code = ? AND is_active = TRUE',
      [subject_code]
    );

    if (subjectRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: '指定的科目不存在或已停用'
      });
    }

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE finance_subject_mapping SET subject_code = ? WHERE id = ?',
      [subject_code, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '科目映射不存在'
      });
    }

    res.json({
      success: true,
      message: '科目映射更新成功'
    });
  } catch (error: any) {
    console.error('更新科目映射失败:', error);
    res.status(500).json({
      success: false,
      message: '更新科目映射失败: ' + error.message
    });
  }
});

// ========================================
// 导出凭证号生成函数供其他模块使用
// ========================================

/**
 * 获取当前生效的上缴配置（供其他模块调用）
 * @param conn 数据库连接（可选，用于事务）
 * @param classTypeId 班型ID（可选，优先查找班型专属配置，回落到全局配置）
 */
async function getActiveHeadquarterConfig(conn?: PoolConnection, classTypeId?: number): Promise<any> {
  const db = conn || pool;
  const today = new Date().toISOString().split('T')[0];

  // 如果指定了班型，先查找班型专属配置
  if (classTypeId) {
    const [classTypeRows] = await db.query<RowDataPacket[]>(
      `SELECT * FROM headquarter_config 
       WHERE is_active = TRUE 
         AND class_type_id = ?
         AND effective_date <= ?
         AND (expire_date IS NULL OR expire_date >= ?)
       ORDER BY effective_date DESC 
       LIMIT 1`,
      [classTypeId, today, today]
    );

    if (classTypeRows.length > 0) {
      return classTypeRows[0];
    }
  }

  // 查找全局默认配置（class_type_id IS NULL）
  const [globalRows] = await db.query<RowDataPacket[]>(
    `SELECT * FROM headquarter_config 
     WHERE is_active = TRUE 
       AND class_type_id IS NULL
       AND effective_date <= ?
       AND (expire_date IS NULL OR expire_date >= ?)
     ORDER BY effective_date DESC 
     LIMIT 1`,
    [today, today]
  );

  return globalRows.length > 0 ? globalRows[0] : null;
}

/**
 * 计算上缴金额
 */
function calculateHeadquarterAmount(totalAmount: number, config: any): number {
  if (!config) return 0;

  if (config.config_type === 'ratio') {
    return Math.round(totalAmount * config.ratio * 100) / 100; // 保留两位小数
  } else if (config.config_type === 'fixed') {
    return config.fixed_amount;
  }

  return 0;
}

/**
 * 获取科目映射（根据用途代码获取科目代码）
 * @param usageCode 用途代码
 * @param conn 数据库连接（可选，用于事务）
 */
async function getSubjectCode(usageCode: string, conn?: PoolConnection): Promise<string> {
  const db = conn || pool;
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT subject_code FROM finance_subject_mapping WHERE usage_code = ? AND is_active = TRUE`,
    [usageCode]
  );
  
  if (rows.length === 0) {
    throw new Error(`未找到科目映射配置: ${usageCode}`);
  }
  
  return rows[0].subject_code;
}

/**
 * 批量获取科目映射
 * @param usageCodes 用途代码数组
 * @param conn 数据库连接（可选，用于事务）
 */
async function getSubjectCodes(usageCodes: string[], conn?: PoolConnection): Promise<Record<string, string>> {
  const db = conn || pool;
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT usage_code, subject_code FROM finance_subject_mapping WHERE usage_code IN (?) AND is_active = TRUE`,
    [usageCodes]
  );
  
  const mapping: Record<string, string> = {};
  rows.forEach((row: any) => {
    mapping[row.usage_code] = row.subject_code;
  });
  
  // 检查是否所有用途代码都找到了
  for (const code of usageCodes) {
    if (!mapping[code]) {
      throw new Error(`未找到科目映射配置: ${code}`);
    }
  }
  
  return mapping;
}

export { generateVoucherNo, validateBalance, getActiveHeadquarterConfig, calculateHeadquarterAmount, getSubjectCode, getSubjectCodes };
export default router;
