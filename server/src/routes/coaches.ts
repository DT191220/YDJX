import { Router, Request, Response } from 'express';
import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// 辅助函数：验证身份证号
function validateIdCard(idCard: string): boolean {
  return /^[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/.test(idCard);
}

// 辅助函数：从身份证号提取信息
function extractInfoFromIdCard(idCard: string): { birthDate: string; age: number } {
  const year = idCard.substring(6, 10);
  const month = idCard.substring(10, 12);
  const day = idCard.substring(12, 14);
  const birthDate = `${year}-${month}-${day}`;
  
  const birthYear = parseInt(year);
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  
  return { birthDate, age };
}

// 获取教练列表
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      keyword = '',
      status = '',
      teaching_subjects = '',
      limit = 10,
      offset = 0,
      sortBy = 'id',
      sortOrder = 'desc'
    } = req.query;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (keyword) {
      whereClause += ' AND (name LIKE ? OR phone LIKE ? OR id_card LIKE ?)';
      const searchPattern = `%${keyword}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (teaching_subjects) {
      whereClause += ' AND teaching_subjects LIKE ?';
      params.push(`%${teaching_subjects}%`);
    }

    // 获取总数
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM coaches ${whereClause}`,
      params
    );
    const total = (countResult as any[])[0].total;

    // 获取列表
    const limitNum = Number(limit);
    const offsetNum = Number(offset);
    const orderClause = `ORDER BY ${sortBy} ${sortOrder}`;

    const [coaches] = await pool.query(
      `SELECT id, name, id_card, phone, gender, 
              DATE_FORMAT(birth_date, '%Y-%m-%d') as birth_date,
              age, address, license_type, teaching_certificate,
              DATE_FORMAT(certificate_date, '%Y-%m-%d') as certificate_date,
              teaching_subjects,
              DATE_FORMAT(employment_date, '%Y-%m-%d') as employment_date,
              status, remarks, created_at, updated_at
       FROM coaches
       ${whereClause}
       ${orderClause}
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offsetNum]
    );

    res.json({
      success: true,
      message: '获取教练列表成功',
      data: {
        list: coaches,
        pagination: {
          total,
          limit: limitNum,
          offset: offsetNum
        }
      }
    });
  } catch (error: any) {
    console.error('获取教练列表失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 获取单个教练详情
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [coaches] = await pool.query<RowDataPacket[]>(
      `SELECT id, name, id_card, phone, gender, 
              DATE_FORMAT(birth_date, '%Y-%m-%d') as birth_date,
              age, address, license_type, teaching_certificate,
              DATE_FORMAT(certificate_date, '%Y-%m-%d') as certificate_date,
              teaching_subjects,
              DATE_FORMAT(employment_date, '%Y-%m-%d') as employment_date,
              status, remarks, created_at, updated_at
       FROM coaches WHERE id = ?`,
      [id]
    );

    if (coaches.length === 0) {
      return res.status(404).json({
        success: false,
        message: '教练不存在'
      });
    }

    res.json({
      success: true,
      message: '获取教练详情成功',
      data: coaches[0]
    });
  } catch (error: any) {
    console.error('获取教练详情失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 创建教练
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name, id_card, phone, gender, address, license_type,
      teaching_certificate, certificate_date, teaching_subjects,
      employment_date, status, remarks
    } = req.body;

    // 验证必填字段
    if (!name || !id_card || !phone || !gender) {
      return res.status(400).json({
        success: false,
        message: '姓名、身份证号、手机号码、性别为必填项'
      });
    }

    // 身份证号格式校验
    if (!validateIdCard(id_card)) {
      return res.status(400).json({
        success: false,
        message: '身份证号格式不正确'
      });
    }

    // 检查身份证号是否已存在
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM coaches WHERE id_card = ?',
      [id_card]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该身份证号已存在'
      });
    }

    // 从身份证号提取出生日期和年龄
    const { birthDate, age } = extractInfoFromIdCard(id_card);

    // 插入教练信息
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO coaches 
       (name, id_card, phone, gender, birth_date, age, address, license_type,
        teaching_certificate, certificate_date, teaching_subjects, employment_date, status, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name, id_card, phone, gender, birthDate, age, address || null, license_type || null,
        teaching_certificate || null, certificate_date || null, teaching_subjects || null,
        employment_date || null, status || '在职', remarks || null
      ]
    );

    res.status(201).json({
      success: true,
      message: '创建教练成功',
      data: { id: result.insertId }
    });
  } catch (error: any) {
    console.error('创建教练失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
});

// 更新教练信息
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name, id_card, phone, gender, address, license_type,
      teaching_certificate, certificate_date, teaching_subjects,
      employment_date, status, remarks
    } = req.body;

    // 验证必填字段
    if (!name || !id_card || !phone || !gender) {
      return res.status(400).json({
        success: false,
        message: '姓名、身份证号、手机号码、性别为必填项'
      });
    }

    // 身份证号格式校验
    if (!validateIdCard(id_card)) {
      return res.status(400).json({
        success: false,
        message: '身份证号格式不正确'
      });
    }

    // 检查教练是否存在
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM coaches WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: '教练不存在'
      });
    }

    // 检查身份证号是否与其他教练冲突
    const [duplicate] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM coaches WHERE id_card = ? AND id != ?',
      [id_card, id]
    );

    if (duplicate.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该身份证号已存在'
      });
    }

    // 从身份证号提取出生日期和年龄
    const { birthDate, age } = extractInfoFromIdCard(id_card);

    // 更新教练信息
    await pool.query(
      `UPDATE coaches 
       SET name = ?, id_card = ?, phone = ?, gender = ?, birth_date = ?, age = ?,
           address = ?, license_type = ?, teaching_certificate = ?, certificate_date = ?,
           teaching_subjects = ?, employment_date = ?, status = ?, remarks = ?
       WHERE id = ?`,
      [
        name, id_card, phone, gender, birthDate, age, address || null, license_type || null,
        teaching_certificate || null, certificate_date || null, teaching_subjects || null,
        employment_date || null, status || '在职', remarks || null, id
      ]
    );

    res.json({
      success: true,
      message: '更新教练信息成功'
    });
  } catch (error: any) {
    console.error('更新教练信息失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 删除教练
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 检查教练是否存在
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM coaches WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: '教练不存在'
      });
    }

    // 删除教练
    await pool.query('DELETE FROM coaches WHERE id = ?', [id]);

    res.json({
      success: true,
      message: '删除教练成功'
    });
  } catch (error: any) {
    console.error('删除教练失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

export default router;
