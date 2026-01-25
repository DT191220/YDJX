import { Router, Request, Response } from 'express';
import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const router = Router();

// 菜单类型定义
interface Menu {
  id: number;
  menu_name: string;
  menu_path: string | null;
  permission_code: string | null;
  parent_id: number;
  menu_type: 'group' | 'menu';
  icon: string | null;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  children?: Menu[];
}

// 构建菜单树结构
function buildMenuTree(menus: Menu[]): Menu[] {
  const menuMap = new Map<number, Menu>();
  const tree: Menu[] = [];

  // 首先将所有菜单放入map
  menus.forEach(menu => {
    menuMap.set(menu.id, { ...menu, children: [] });
  });

  // 构建树结构
  menus.forEach(menu => {
    const menuItem = menuMap.get(menu.id)!;
    if (menu.parent_id === 0) {
      tree.push(menuItem);
    } else {
      const parent = menuMap.get(menu.parent_id);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(menuItem);
      }
    }
  });

  // 对每个层级按sort_order排序
  const sortMenus = (items: Menu[]) => {
    items.sort((a, b) => a.sort_order - b.sort_order);
    items.forEach(item => {
      if (item.children && item.children.length > 0) {
        sortMenus(item.children);
      }
    });
  };
  sortMenus(tree);

  return tree;
}

// 获取菜单列表（树形结构）
router.get('/', async (req: Request, res: Response) => {
  try {
    const { flat } = req.query;

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM sys_menus ORDER BY sort_order ASC, id ASC`
    );

    const menus = rows as Menu[];

    // 如果需要扁平结构
    if (flat === 'true') {
      return res.json({
        success: true,
        data: menus
      });
    }

    // 默认返回树形结构
    const tree = buildMenuTree(menus);

    res.json({
      success: true,
      data: tree
    });
  } catch (error: any) {
    console.error('获取菜单列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取菜单列表失败: ' + error.message
    });
  }
});

// 根据用户权限获取可访问的菜单（用于前端渲染）
router.get('/user-menus', async (req: Request, res: Response) => {
  try {
    const { permissions } = req.query;

    if (!permissions) {
      return res.status(400).json({
        success: false,
        message: '缺少权限参数'
      });
    }

    const permissionList = (permissions as string).split(',').filter(p => p);

    // 获取所有可见菜单
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM sys_menus WHERE is_visible = 1 ORDER BY sort_order ASC, id ASC`
    );

    const allMenus = rows as Menu[];

    // 过滤有权限的菜单
    const filteredMenus = allMenus.filter(menu => {
      if (!menu.permission_code) return true;
      return permissionList.includes(menu.permission_code);
    });

    // 过滤掉没有子菜单的菜单组
    const menuIds = new Set(filteredMenus.map(m => m.id));
    const finalMenus = filteredMenus.filter(menu => {
      if (menu.menu_type === 'group') {
        // 检查是否有子菜单被包含
        return filteredMenus.some(m => m.parent_id === menu.id && menuIds.has(m.id));
      }
      return true;
    });

    const tree = buildMenuTree(finalMenus);

    res.json({
      success: true,
      data: tree
    });
  } catch (error: any) {
    console.error('获取用户菜单失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户菜单失败: ' + error.message
    });
  }
});

// 获取单个菜单详情
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM sys_menus WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '菜单不存在'
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error: any) {
    console.error('获取菜单详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取菜单详情失败: ' + error.message
    });
  }
});

// 创建菜单
router.post('/', async (req: Request, res: Response) => {
  try {
    const { menu_name, menu_path, permission_code, parent_id, menu_type, icon, sort_order, is_visible } = req.body;

    if (!menu_name) {
      return res.status(400).json({
        success: false,
        message: '菜单名称为必填项'
      });
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO sys_menus (menu_name, menu_path, permission_code, parent_id, menu_type, icon, sort_order, is_visible)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        menu_name,
        menu_path || null,
        permission_code || null,
        parent_id || 0,
        menu_type || 'menu',
        icon || null,
        sort_order || 0,
        is_visible !== false ? 1 : 0
      ]
    );

    res.json({
      success: true,
      data: { id: result.insertId },
      message: '菜单创建成功'
    });
  } catch (error: any) {
    console.error('创建菜单失败:', error);
    res.status(500).json({
      success: false,
      message: '创建菜单失败: ' + error.message
    });
  }
});

// 更新菜单
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { menu_name, menu_path, permission_code, parent_id, menu_type, icon, sort_order, is_visible } = req.body;

    // 检查是否存在
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM sys_menus WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: '菜单不存在'
      });
    }

    // 防止将自己设为自己的父级
    if (parent_id && Number(parent_id) === Number(id)) {
      return res.status(400).json({
        success: false,
        message: '不能将自己设为父菜单'
      });
    }

    await pool.query(
      `UPDATE sys_menus 
       SET menu_name = ?, menu_path = ?, permission_code = ?, parent_id = ?, 
           menu_type = ?, icon = ?, sort_order = ?, is_visible = ?
       WHERE id = ?`,
      [
        menu_name,
        menu_path || null,
        permission_code || null,
        parent_id || 0,
        menu_type || 'menu',
        icon || null,
        sort_order || 0,
        is_visible !== false ? 1 : 0,
        id
      ]
    );

    res.json({
      success: true,
      message: '菜单更新成功'
    });
  } catch (error: any) {
    console.error('更新菜单失败:', error);
    res.status(500).json({
      success: false,
      message: '更新菜单失败: ' + error.message
    });
  }
});

// 删除菜单
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 检查是否有子菜单
    const [children] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM sys_menus WHERE parent_id = ?',
      [id]
    );

    if (children.length > 0) {
      return res.status(400).json({
        success: false,
        message: '存在子菜单，无法删除'
      });
    }

    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM sys_menus WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '菜单不存在'
      });
    }

    res.json({
      success: true,
      message: '菜单删除成功'
    });
  } catch (error: any) {
    console.error('删除菜单失败:', error);
    res.status(500).json({
      success: false,
      message: '删除菜单失败: ' + error.message
    });
  }
});

// 批量更新排序
router.put('/batch/sort', async (req: Request, res: Response) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: '参数错误'
      });
    }

    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      for (const item of items) {
        await conn.query(
          'UPDATE sys_menus SET sort_order = ?, parent_id = ? WHERE id = ?',
          [item.sort_order, item.parent_id || 0, item.id]
        );
      }
      await conn.commit();
      conn.release();

      res.json({
        success: true,
        message: '排序更新成功'
      });
    } catch (err) {
      await conn.rollback();
      conn.release();
      throw err;
    }
  } catch (error: any) {
    console.error('批量更新排序失败:', error);
    res.status(500).json({
      success: false,
      message: '批量更新排序失败: ' + error.message
    });
  }
});

export default router;
