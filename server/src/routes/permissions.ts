import { Router, Request, Response } from 'express';
import pool from '../config/database';
import { validateSortParams } from '../utils/security';

const router = Router();

// 获取权限树（完整树形结构）
router.get('/tree', async (req: Request, res: Response) => {
  try {
    // 获取所有权限
    const [permissions] = await pool.query(
      `SELECT id, permission_name, permission_code, permission_type, 
              parent_id, route_path, icon, sort_order, status, 
              created_at, updated_at
       FROM sys_permissions 
       ORDER BY sort_order ASC, id ASC`
    );

    // 构建树形结构
    const permissionList = permissions as any[];
    const tree = buildTree(permissionList, null);

    res.json({
      success: true,
      message: '获取权限树成功',
      data: tree
    });
  } catch (error) {
    console.error('获取权限树失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 获取权限列表（支持分页、搜索）
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      limit = '10',
      offset = '0',
      keyword = '',
      permission_type = '',
      status = '',
      sortBy = 'sort_order',
      sortOrder = 'asc'
    } = req.query;

    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);

    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (keyword) {
      whereClause += ' AND (permission_name LIKE ? OR permission_code LIKE ?)';
      const keywordPattern = `%${keyword}%`;
      params.push(keywordPattern, keywordPattern);
    }

    if (permission_type) {
      whereClause += ' AND permission_type = ?';
      params.push(permission_type);
    }

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    // 获取总数
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM sys_permissions ${whereClause}`,
      params
    );
    const total = (countResult as any[])[0].total;

    // 获取权限列表 - 使用白名单验证排序参数
    const validColumns = ['id', 'permission_name', 'permission_code', 'permission_type', 'sort_order', 'status', 'created_at', 'updated_at'];
    const { sortColumn, order } = validateSortParams(sortBy as string, sortOrder as string, validColumns, 'sort_order');
    const orderClause = `ORDER BY ${sortColumn} ${order}`;
    const [permissions] = await pool.query(
      `SELECT p.*, 
              (SELECT permission_name FROM sys_permissions WHERE id = p.parent_id) as parent_name
       FROM sys_permissions p
       ${whereClause} 
       ${orderClause} 
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offsetNum]
    );

    res.json({
      success: true,
      message: '获取权限列表成功',
      data: {
        list: permissions,
        pagination: {
          total,
          limit: limitNum,
          offset: offsetNum
        }
      }
    });
  } catch (error) {
    console.error('获取权限列表失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 获取单个权限
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [permissions] = await pool.query(
      'SELECT * FROM sys_permissions WHERE id = ?',
      [id]
    );

    const permissionList = permissions as any[];
    if (permissionList.length === 0) {
      return res.status(404).json({
        success: false,
        message: '权限不存在'
      });
    }

    res.json({
      success: true,
      message: '获取权限成功',
      data: permissionList[0]
    });
  } catch (error) {
    console.error('获取权限失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 创建权限
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      permission_name,
      permission_code,
      permission_type,
      parent_id,
      route_path,
      icon,
      sort_order,
      status
    } = req.body;

    // 验证必填字段
    if (!permission_name || !permission_code || !permission_type) {
      return res.status(400).json({
        success: false,
        message: '权限名称、权限编码和权限类型不能为空'
      });
    }

    // 检查权限编码是否已存在
    const [existing] = await pool.query(
      'SELECT id FROM sys_permissions WHERE permission_code = ?',
      [permission_code]
    );

    if ((existing as any[]).length > 0) {
      return res.status(400).json({
        success: false,
        message: '权限编码已存在'
      });
    }

    // 如果有父级，检查父级是否存在
    if (parent_id) {
      const [parent] = await pool.query(
        'SELECT id FROM sys_permissions WHERE id = ?',
        [parent_id]
      );

      if ((parent as any[]).length === 0) {
        return res.status(400).json({
          success: false,
          message: '父级权限不存在'
        });
      }
    }

    // 插入权限
    const [result] = await pool.query(
      `INSERT INTO sys_permissions 
       (permission_name, permission_code, permission_type, parent_id, 
        route_path, icon, sort_order, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        permission_name,
        permission_code,
        permission_type,
        parent_id || null,
        route_path || null,
        icon || null,
        sort_order || 0,
        status || '启用'
      ]
    );

    res.status(201).json({
      success: true,
      message: '创建权限成功',
      data: { id: (result as any).insertId }
    });
  } catch (error) {
    console.error('创建权限失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 更新权限
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      permission_name,
      permission_code,
      permission_type,
      parent_id,
      route_path,
      icon,
      sort_order,
      status
    } = req.body;

    // 验证必填字段
    if (!permission_name || !permission_code || !permission_type) {
      return res.status(400).json({
        success: false,
        message: '权限名称、权限编码和权限类型不能为空'
      });
    }

    // 检查权限是否存在
    const [existing] = await pool.query(
      'SELECT id FROM sys_permissions WHERE id = ?',
      [id]
    );

    if ((existing as any[]).length === 0) {
      return res.status(404).json({
        success: false,
        message: '权限不存在'
      });
    }

    // 检查权限编码是否与其他权限冲突
    const [duplicate] = await pool.query(
      'SELECT id FROM sys_permissions WHERE permission_code = ? AND id != ?',
      [permission_code, id]
    );

    if ((duplicate as any[]).length > 0) {
      return res.status(400).json({
        success: false,
        message: '权限编码已存在'
      });
    }

    // 如果有父级，检查父级是否存在且不能是自己
    if (parent_id) {
      if (parent_id === parseInt(id)) {
        return res.status(400).json({
          success: false,
          message: '不能将自己设置为父级'
        });
      }

      const [parent] = await pool.query(
        'SELECT id FROM sys_permissions WHERE id = ?',
        [parent_id]
      );

      if ((parent as any[]).length === 0) {
        return res.status(400).json({
          success: false,
          message: '父级权限不存在'
        });
      }

      // 检查是否会形成循环引用
      if (await hasCircularReference(id, parent_id)) {
        return res.status(400).json({
          success: false,
          message: '不能设置为子孙节点的父级，会形成循环引用'
        });
      }
    }

    // 更新权限
    await pool.query(
      `UPDATE sys_permissions 
       SET permission_name = ?, permission_code = ?, permission_type = ?, 
           parent_id = ?, route_path = ?, icon = ?, sort_order = ?, status = ?
       WHERE id = ?`,
      [
        permission_name,
        permission_code,
        permission_type,
        parent_id || null,
        route_path || null,
        icon || null,
        sort_order || 0,
        status,
        id
      ]
    );

    res.json({
      success: true,
      message: '更新权限成功'
    });
  } catch (error) {
    console.error('更新权限失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 删除权限
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 检查权限是否存在
    const [existing] = await pool.query(
      'SELECT id FROM sys_permissions WHERE id = ?',
      [id]
    );

    if ((existing as any[]).length === 0) {
      return res.status(404).json({
        success: false,
        message: '权限不存在'
      });
    }

    // 检查是否有子权限
    const [children] = await pool.query(
      'SELECT COUNT(*) as count FROM sys_permissions WHERE parent_id = ?',
      [id]
    );

    if ((children as any[])[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: '该权限下有子权限，无法删除'
      });
    }

    // 检查是否有角色关联此权限
    const [roles] = await pool.query(
      'SELECT COUNT(*) as count FROM sys_role_permissions WHERE permission_id = ?',
      [id]
    );

    if ((roles as any[])[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: '该权限已关联角色，无法删除'
      });
    }

    // 删除权限
    await pool.query('DELETE FROM sys_permissions WHERE id = ?', [id]);

    res.json({
      success: true,
      message: '删除权限成功'
    });
  } catch (error) {
    console.error('删除权限失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 辅助函数：构建树形结构
function buildTree(list: any[], parentId: number | null): any[] {
  const result: any[] = [];

  for (const item of list) {
    // 处理parent_id为0或null的情况都作为顶级节点
    const itemParentId = item.parent_id === 0 ? null : item.parent_id;
    if (itemParentId === parentId) {
      const children = buildTree(list, item.id);
      if (children.length > 0) {
        item.children = children;
      }
      result.push(item);
    }
  }

  return result;
}

// 辅助函数：检查是否会形成循环引用
async function hasCircularReference(id: string, targetParentId: number): Promise<boolean> {
  let currentId: number | null = targetParentId;

  while (currentId !== null) {
    if (currentId === parseInt(id)) {
      return true;
    }

    const [result] = await pool.query(
      'SELECT parent_id FROM sys_permissions WHERE id = ?',
      [currentId]
    );

    const rows = result as any[];
    if (rows.length === 0) {
      break;
    }

    currentId = rows[0].parent_id;
  }

  return false;
}

export default router;
