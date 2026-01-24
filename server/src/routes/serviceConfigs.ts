import { Router, Request, Response } from 'express';
import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// 获取班型的服务配置列表
router.get('/class-type/:classTypeId', async (req: Request, res: Response) => {
  try {
    const { classTypeId } = req.params;

    const [rows] = await pool.query(
      'SELECT * FROM service_configs WHERE class_type_id = ? ORDER BY FIELD(subject, "科目一", "科目二", "科目三", "科目四")',
      [classTypeId]
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (error: any) {
    console.error('获取服务配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取服务配置失败: ' + error.message
    });
  }
});

// 批量保存班型的服务配置
router.post('/batch', async (req: Request, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { class_type_id, services } = req.body;

    // 验证必填字段
    if (!class_type_id || !services || !Array.isArray(services)) {
      return res.status(400).json({
        success: false,
        message: '班型ID和服务配置列表为必填项'
      });
    }

    // 检查班型是否存在
    const [classTypeRows] = await connection.query<RowDataPacket[]>(
      'SELECT id FROM class_types WHERE id = ?',
      [class_type_id]
    );

    if (classTypeRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: '班型不存在'
      });
    }

    // 删除该班型原有的服务配置
    await connection.query(
      'DELETE FROM service_configs WHERE class_type_id = ?',
      [class_type_id]
    );

    // 批量插入新的服务配置
    if (services.length > 0) {
      const values = services.map((s: any) => [
        class_type_id,
        s.subject,
        s.service_content,
        s.is_included !== undefined ? s.is_included : 1
      ]);

      await connection.query(
        'INSERT INTO service_configs (class_type_id, subject, service_content, is_included) VALUES ?',
        [values]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: '服务配置保存成功'
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('保存服务配置失败:', error);
    res.status(500).json({
      success: false,
      message: '保存服务配置失败: ' + error.message
    });
  } finally {
    connection.release();
  }
});

// 创建单个服务配置
router.post('/', async (req: Request, res: Response) => {
  try {
    const { class_type_id, subject, service_content, is_included = 1 } = req.body;

    // 验证必填字段
    if (!class_type_id || !subject || !service_content) {
      return res.status(400).json({
        success: false,
        message: '班型ID、科目和服务内容为必填项'
      });
    }

    // 检查班型是否存在
    const [classTypeRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM class_types WHERE id = ?',
      [class_type_id]
    );

    if (classTypeRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '班型不存在'
      });
    }

    // 插入服务配置
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO service_configs (class_type_id, subject, service_content, is_included) VALUES (?, ?, ?, ?)',
      [class_type_id, subject, service_content, is_included]
    );

    res.json({
      success: true,
      data: { id: result.insertId },
      message: '服务配置创建成功'
    });
  } catch (error: any) {
    console.error('创建服务配置失败:', error);
    res.status(500).json({
      success: false,
      message: '创建服务配置失败: ' + error.message
    });
  }
});

// 更新服务配置
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { subject, service_content, is_included } = req.body;

    // 验证必填字段
    if (!subject || !service_content) {
      return res.status(400).json({
        success: false,
        message: '科目和服务内容为必填项'
      });
    }

    // 检查服务配置是否存在
    const [existingRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM service_configs WHERE id = ?',
      [id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '服务配置不存在'
      });
    }

    // 更新服务配置
    await pool.query(
      'UPDATE service_configs SET subject = ?, service_content = ?, is_included = ? WHERE id = ?',
      [subject, service_content, is_included, id]
    );

    res.json({
      success: true,
      message: '服务配置更新成功'
    });
  } catch (error: any) {
    console.error('更新服务配置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新服务配置失败: ' + error.message
    });
  }
});

// 删除服务配置
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM service_configs WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '服务配置不存在'
      });
    }

    res.json({
      success: true,
      message: '服务配置删除成功'
    });
  } catch (error: any) {
    console.error('删除服务配置失败:', error);
    res.status(500).json({
      success: false,
      message: '删除服务配置失败: ' + error.message
    });
  }
});

export default router;
