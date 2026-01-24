import { Router, Request, Response } from 'express';
import pool from '../config/database';
import { validateSortParams } from '../utils/security';

const router = Router();

// ========== 字典类型管理 ==========

// 获取字典类型列表
router.get('/types', async (req: Request, res: Response) => {
  try {
    const {
      limit = '10',
      offset = '0',
      keyword = '',
      status = '',
      sortBy = 'id',
      sortOrder = 'desc'
    } = req.query;

    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (keyword) {
      whereClause += ' AND (dict_name LIKE ? OR dict_type LIKE ?)';
      const keywordPattern = `%${keyword}%`;
      params.push(keywordPattern, keywordPattern);
    }

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    // 获取总数
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM sys_dict_types ${whereClause}`,
      params
    );
    const total = (countResult as any[])[0].total;

    // 获取字典类型列表 - 使用白名单验证排序参数
    const validColumns = ['id', 'dict_name', 'dict_type', 'status', 'created_at', 'updated_at'];
    const { sortColumn, order } = validateSortParams(sortBy as string, sortOrder as string, validColumns, 'id');
    const orderClause = `ORDER BY ${sortColumn} ${order}`;
    const [types] = await pool.query(
      `SELECT id, dict_name, dict_type, status, description, created_at, updated_at
       FROM sys_dict_types 
       ${whereClause} 
       ${orderClause} 
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offsetNum]
    );

    res.json({
      success: true,
      message: '获取字典类型列表成功',
      data: {
        list: types,
        pagination: {
          total,
          limit: limitNum,
          offset: offsetNum
        }
      }
    });
  } catch (error) {
    console.error('获取字典类型列表失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 获取单个字典类型
router.get('/types/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [types] = await pool.query(
      'SELECT * FROM sys_dict_types WHERE id = ?',
      [id]
    );

    const typeList = types as any[];
    if (typeList.length === 0) {
      return res.status(404).json({
        success: false,
        message: '字典类型不存在'
      });
    }

    res.json({
      success: true,
      message: '获取字典类型成功',
      data: typeList[0]
    });
  } catch (error) {
    console.error('获取字典类型失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 创建字典类型
router.post('/types', async (req: Request, res: Response) => {
  try {
    const { dict_name, dict_type, status, remark, description } = req.body;
    const desc = description || remark; // 兼容两种字段名

    if (!dict_name || !dict_type) {
      return res.status(400).json({
        success: false,
        message: '字典名称和字典类型不能为空'
      });
    }

    // 检查字典类型是否已存在
    const [existing] = await pool.query(
      'SELECT id FROM sys_dict_types WHERE dict_type = ?',
      [dict_type]
    );

    if ((existing as any[]).length > 0) {
      return res.status(400).json({
        success: false,
        message: '字典类型已存在'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO sys_dict_types (dict_name, dict_type, status, description) 
       VALUES (?, ?, ?, ?)`,
      [dict_name, dict_type, status || '启用', desc || null]
    );

    res.status(201).json({
      success: true,
      message: '创建字典类型成功',
      data: { id: (result as any).insertId }
    });
  } catch (error) {
    console.error('创建字典类型失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 更新字典类型
router.put('/types/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { dict_name, dict_type, status, remark, description } = req.body;
    const desc = description || remark; // 兼容两种字段名

    if (!dict_name || !dict_type) {
      return res.status(400).json({
        success: false,
        message: '字典名称和字典类型不能为空'
      });
    }

    // 检查字典类型是否存在
    const [existing] = await pool.query(
      'SELECT id FROM sys_dict_types WHERE id = ?',
      [id]
    );

    if ((existing as any[]).length === 0) {
      return res.status(404).json({
        success: false,
        message: '字典类型不存在'
      });
    }

    // 检查字典类型是否与其他记录冲突
    const [duplicate] = await pool.query(
      'SELECT id FROM sys_dict_types WHERE dict_type = ? AND id != ?',
      [dict_type, id]
    );

    if ((duplicate as any[]).length > 0) {
      return res.status(400).json({
        success: false,
        message: '字典类型已存在'
      });
    }

    await pool.query(
      `UPDATE sys_dict_types 
       SET dict_name = ?, dict_type = ?, status = ?, description = ?
       WHERE id = ?`,
      [dict_name, dict_type, status, desc || null, id]
    );

    res.json({
      success: true,
      message: '更新字典类型成功'
    });
  } catch (error) {
    console.error('更新字典类型失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 删除字典类型
router.delete('/types/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 获取该字典类型的 dict_type 值
    const [typeResult] = await pool.query(
      'SELECT dict_type FROM sys_dict_types WHERE id = ?',
      [id]
    );

    if ((typeResult as any[]).length === 0) {
      return res.status(404).json({
        success: false,
        message: '字典类型不存在'
      });
    }

    const dict_type = (typeResult as any[])[0].dict_type;

    // 检查是否存在关联的字典数据
    const [data] = await pool.query(
      'SELECT COUNT(*) as count FROM sys_dict_data WHERE dict_type = ?',
      [dict_type]
    );

    if ((data as any[])[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: '该字典类型下有字典数据，无法删除'
      });
    }

    await pool.query('DELETE FROM sys_dict_types WHERE id = ?', [id]);

    res.json({
      success: true,
      message: '删除字典类型成功'
    });
  } catch (error) {
    console.error('删除字典类型失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// ========== 字典数据管理 ==========

// 根据字典类型标识获取字典数据（供前端组件使用）
router.get('/by-type/:dictType', async (req: Request, res: Response) => {
  try {
    const { dictType } = req.params;

    const [data] = await pool.query(
      `SELECT id, dict_type, dict_label, dict_value, sort_order, 
              status, remark
       FROM sys_dict_data 
       WHERE dict_type = ? AND status = '启用'
       ORDER BY sort_order ASC, id ASC`,
      [dictType]
    );

    res.json({
      success: true,
      message: '获取字典数据成功',
      data: data
    });
  } catch (error) {
    console.error('获取字典数据失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 获取字典数据列表（根据字典类型ID）
router.get('/types/:id/data', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.query;

    let whereClause = 'WHERE dict_type = (SELECT dict_type FROM sys_dict_types WHERE id = ?)';
    const params: any[] = [id];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    const [data] = await pool.query(
      `SELECT id, dict_type, dict_label, dict_value, sort_order, 
              status, remark, created_at, updated_at
       FROM sys_dict_data 
       ${whereClause}
       ORDER BY sort_order ASC, id ASC`,
      params
    );

    res.json({
      success: true,
      message: '获取字典数据列表成功',
      data: data
    });
  } catch (error) {
    console.error('获取字典数据列表失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 创建字典数据
router.post('/data', async (req: Request, res: Response) => {
  try {
    console.log('收到创建字典数据请求，body:', req.body);
    const { dict_type_id, dict_label, dict_value, sort_order, status, remark } = req.body;

    if (!dict_type_id || !dict_label || !dict_value) {
      console.log('验证失败: dict_type_id=', dict_type_id, 'dict_label=', dict_label, 'dict_value=', dict_value);
      return res.status(400).json({
        success: false,
        message: '字典类型、标签和值不能为空'
      });
    }

    // 检查字典类型是否存在，并获取 dict_type
    console.log('查询字典类型ID:', dict_type_id);
    const [typeExists] = await pool.query(
      'SELECT dict_type FROM sys_dict_types WHERE id = ?',
      [dict_type_id]
    );

    console.log('字典类型查询结果:', typeExists);
    if ((typeExists as any[]).length === 0) {
      return res.status(400).json({
        success: false,
        message: '字典类型不存在'
      });
    }

    const dict_type = (typeExists as any[])[0].dict_type;
    console.log('获取到的 dict_type:', dict_type);

    // 检查同一字典类型下值是否重复
    const [duplicate] = await pool.query(
      'SELECT id FROM sys_dict_data WHERE dict_type = ? AND dict_value = ?',
      [dict_type, dict_value]
    );

    if ((duplicate as any[]).length > 0) {
      return res.status(400).json({
        success: false,
        message: '该字典类型下值已存在'
      });
    }

    console.log('准备插入数据:', {dict_type, dict_label, dict_value, sort_order, status, remark});
    const [result] = await pool.query(
      `INSERT INTO sys_dict_data 
       (dict_type, dict_label, dict_value, sort_order, status, remark) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [dict_type, dict_label, dict_value, sort_order || 0, status || '启用', remark || null]
    );

    console.log('插入成功，ID:', (result as any).insertId);
    res.status(201).json({
      success: true,
      message: '创建字典数据成功',
      data: { id: (result as any).insertId }
    });
  } catch (error) {
    console.error('创建字典数据失败:', error);
    console.error('请求数据:', req.body);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '服务器错误'
    });
  }
});

// 更新字典数据
router.put('/data/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { dict_type_id, dict_label, dict_value, sort_order, status, remark } = req.body;

    if (!dict_type_id || !dict_label || !dict_value) {
      return res.status(400).json({
        success: false,
        message: '字典类型、标签和值不能为空'
      });
    }

    // 检查是否存在
    const [existing] = await pool.query(
      'SELECT dict_type FROM sys_dict_data WHERE id = ?',
      [id]
    );

    if ((existing as any[]).length === 0) {
      return res.status(404).json({
        success: false,
        message: '字典数据不存在'
      });
    }

    // 获取新的 dict_type
    const [typeExists] = await pool.query(
      'SELECT dict_type FROM sys_dict_types WHERE id = ?',
      [dict_type_id]
    );

    if ((typeExists as any[]).length === 0) {
      return res.status(400).json({
        success: false,
        message: '字典类型不存在'
      });
    }

    const dict_type = (typeExists as any[])[0].dict_type;

    // 检查同一字典类型下值是否重复
    const [duplicate] = await pool.query(
      'SELECT id FROM sys_dict_data WHERE dict_type = ? AND dict_value = ? AND id != ?',
      [dict_type, dict_value, id]
    );

    if ((duplicate as any[]).length > 0) {
      return res.status(400).json({
        success: false,
        message: '该字典类型下值已存在'
      });
    }

    await pool.query(
      `UPDATE sys_dict_data 
       SET dict_type = ?, dict_label = ?, dict_value = ?, 
           sort_order = ?, status = ?, remark = ?
       WHERE id = ?`,
      [dict_type, dict_label, dict_value, sort_order, status, remark || null, id]
    );

    res.json({
      success: true,
      message: '更新字典数据成功'
    });
  } catch (error) {
    console.error('更新字典数据失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 删除字典数据
router.delete('/data/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM sys_dict_data WHERE id = ?', [id]);

    res.json({
      success: true,
      message: '删除字典数据成功'
    });
  } catch (error) {
    console.error('删除字典数据失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

export default router;
