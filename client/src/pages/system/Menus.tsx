import { useState, useEffect } from 'react';
import { menuService, Menu, MenuFormData } from '../../services/menu';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { ColumnDef } from '@tanstack/react-table';
import './Students.css';

export default function Menus() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [flatMenus, setFlatMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set()); // 默认折叠

  const [formData, setFormData] = useState<MenuFormData>({
    menu_name: '',
    menu_path: '',
    permission_code: '',
    parent_id: 0,
    menu_type: 'menu',
    icon: '',
    sort_order: 0,
    is_visible: true
  });

  useEffect(() => {
    fetchMenus();
  }, []);

  const fetchMenus = async () => {
    setLoading(true);
    try {
      // 获取树形结构用于展示
      const treeResponse = await menuService.getMenus();
      if (treeResponse.data) {
        setMenus(treeResponse.data);
      }
      // 获取扁平结构用于选择父级
      const flatResponse = await menuService.getMenus(true);
      if (flatResponse.data) {
        setFlatMenus(flatResponse.data);
      }
    } catch (error) {
      console.error('获取菜单列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (parentId: number = 0) => {
    setEditingMenu(null);
    setFormData({
      menu_name: '',
      menu_path: '',
      permission_code: '',
      parent_id: parentId,
      menu_type: parentId === 0 ? 'group' : 'menu',
      icon: '',
      sort_order: 0,
      is_visible: true
    });
    setShowModal(true);
  };

  const handleEdit = (menu: Menu) => {
    setEditingMenu(menu);
    setFormData({
      menu_name: menu.menu_name,
      menu_path: menu.menu_path || '',
      permission_code: menu.permission_code || '',
      parent_id: menu.parent_id,
      menu_type: menu.menu_type,
      icon: menu.icon || '',
      sort_order: menu.sort_order,
      is_visible: menu.is_visible
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.menu_name) {
      alert('请填写菜单名称');
      return;
    }

    try {
      if (editingMenu) {
        await menuService.updateMenu(editingMenu.id, formData);
        alert('菜单更新成功');
      } else {
        await menuService.createMenu(formData);
        alert('菜单创建成功');
      }
      setShowModal(false);
      fetchMenus();
    } catch (error: any) {
      console.error('保存菜单失败:', error);
      alert(error.message || '保存失败');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await menuService.deleteMenu(deleteId);
      alert('菜单删除成功');
      setDeleteId(null);
      fetchMenus();
    } catch (error: any) {
      console.error('删除菜单失败:', error);
      alert(error.message || '删除失败');
    }
  };

  // 切换展开/折叠状态
  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  // 将树形数据展平为表格数据，带层级标识（根据展开状态）
  const flattenForTable = (items: Menu[], level: number = 0): (Menu & { level: number; hasChildren: boolean })[] => {
    const result: (Menu & { level: number; hasChildren: boolean })[] = [];
    items.forEach(item => {
      const hasChildren = !!(item.children && item.children.length > 0);
      result.push({ ...item, level, hasChildren });
      // 只有展开的节点才显示子节点
      if (hasChildren && expandedIds.has(item.id)) {
        result.push(...flattenForTable(item.children!, level + 1));
      }
    });
    return result;
  };

  const tableData = flattenForTable(menus);

  // 获取可选的父级菜单（排除自己和自己的子菜单）
  const getAvailableParents = () => {
    if (!editingMenu) {
      return flatMenus.filter(m => m.menu_type === 'group');
    }
    
    // 获取当前菜单及其所有子菜单的ID
    const getDescendantIds = (id: number): number[] => {
      const ids = [id];
      flatMenus.filter(m => m.parent_id === id).forEach(m => {
        ids.push(...getDescendantIds(m.id));
      });
      return ids;
    };
    
    const excludeIds = getDescendantIds(editingMenu.id);
    return flatMenus.filter(m => !excludeIds.includes(m.id) && (m.menu_type === 'group' || m.parent_id === 0));
  };

  const columns: ColumnDef<Menu & { level: number; hasChildren: boolean }, any>[] = [
    {
      accessorKey: 'menu_name',
      header: '菜单名称',
      size: 250,
      cell: ({ row }) => (
        <span style={{ paddingLeft: `${row.original.level * 20}px`, display: 'inline-flex', alignItems: 'center' }}>
          {row.original.hasChildren ? (
            <span 
              onClick={() => toggleExpand(row.original.id)}
              style={{ 
                cursor: 'pointer', 
                marginRight: '6px', 
                color: '#1890ff',
                fontWeight: 'bold',
                width: '16px',
                display: 'inline-block'
              }}
            >
              {expandedIds.has(row.original.id) ? '▼' : '▶'}
            </span>
          ) : (
            <span style={{ width: '22px', display: 'inline-block' }}>
              {row.original.level > 0 && <span style={{ color: '#ccc' }}>└</span>}
            </span>
          )}
          {row.original.menu_name}
        </span>
      ),
    },
    {
      accessorKey: 'menu_type',
      header: '类型',
      size: 80,
      cell: ({ row }) => (
        <span className={`badge ${row.original.menu_type === 'group' ? 'badge-purple' : 'badge-blue'}`}>
          {row.original.menu_type === 'group' ? '菜单组' : '菜单项'}
        </span>
      ),
    },
    {
      accessorKey: 'menu_path',
      header: '路由路径',
      size: 200,
      cell: ({ row }) => row.original.menu_path || '-',
    },
    {
      accessorKey: 'permission_code',
      header: '权限编码',
      size: 180,
      cell: ({ row }) => (
        <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
          {row.original.permission_code || '-'}
        </code>
      ),
    },
    {
      accessorKey: 'sort_order',
      header: '排序',
      size: 60,
    },
    {
      accessorKey: 'is_visible',
      header: '可见',
      size: 60,
      cell: ({ row }) => (
        <span className={`badge ${row.original.is_visible ? 'badge-green' : 'badge-gray'}`}>
          {row.original.is_visible ? '是' : '否'}
        </span>
      ),
    },
    {
      header: '操作',
      size: 200,
      cell: ({ row }) => (
        <div className="action-buttons">
          {row.original.menu_type === 'group' && (
            <button
              onClick={() => handleAdd(row.original.id)}
              className="btn btn-success btn-sm"
            >
              添加子菜单
            </button>
          )}
          <button
            onClick={() => handleEdit(row.original)}
            className="btn btn-primary btn-sm"
          >
            编辑
          </button>
          <button
            onClick={() => setDeleteId(row.original.id)}
            className="btn btn-danger btn-sm"
          >
            删除
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="students-page">
      <div className="page-header">
        <h1>菜单管理</h1>
        <div className="header-actions">
          <button onClick={() => handleAdd(0)} className="btn btn-primary">
            新增菜单组
          </button>
        </div>
      </div>

      <div className="info-card" style={{ 
        background: '#fffbe6', 
        border: '1px solid #ffe58f', 
        borderRadius: '8px', 
        padding: '12px 16px', 
        marginBottom: '16px',
        fontSize: '14px',
        color: '#d48806'
      }}>
        提示：修改菜单配置后，用户需要刷新页面才能看到最新的菜单。菜单的权限编码需要与权限管理中的编码保持一致。
      </div>

      <div className="table-container">
        <Table columns={columns} data={tableData} loading={loading} />
      </div>

      {/* 菜单编辑Modal */}
      <Modal
        title={editingMenu ? '编辑菜单' : '新增菜单'}
        visible={showModal}
        onClose={() => setShowModal(false)}
      >
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label>菜单名称 *</label>
            <input
              type="text"
              value={formData.menu_name}
              onChange={(e) => setFormData({ ...formData, menu_name: e.target.value })}
              required
              placeholder="如：学员信息管理"
            />
          </div>

          <div className="form-group">
            <label>菜单类型 *</label>
            <select
              value={formData.menu_type}
              onChange={(e) => setFormData({ ...formData, menu_type: e.target.value as 'group' | 'menu' })}
            >
              <option value="group">菜单组（一级菜单）</option>
              <option value="menu">菜单项（二级菜单）</option>
            </select>
          </div>

          <div className="form-group">
            <label>上级菜单</label>
            <select
              value={formData.parent_id || 0}
              onChange={(e) => setFormData({ ...formData, parent_id: Number(e.target.value) })}
            >
              <option value={0}>无（顶级菜单）</option>
              {getAvailableParents().map(m => (
                <option key={m.id} value={m.id}>{m.menu_name}</option>
              ))}
            </select>
          </div>

          {formData.menu_type === 'menu' && (
            <div className="form-group">
              <label>路由路径</label>
              <input
                type="text"
                value={formData.menu_path}
                onChange={(e) => setFormData({ ...formData, menu_path: e.target.value })}
                placeholder="如：/students/entry"
              />
              <small style={{ color: '#999' }}>菜单项需要配置路由路径</small>
            </div>
          )}

          <div className="form-group">
            <label>权限编码</label>
            <input
              type="text"
              value={formData.permission_code}
              onChange={(e) => setFormData({ ...formData, permission_code: e.target.value })}
              placeholder="如：student:entry"
            />
            <small style={{ color: '#999' }}>需与权限管理中的编码一致</small>
          </div>

          <div className="form-group">
            <label>排序号</label>
            <input
              type="number"
              min="0"
              value={formData.sort_order}
              onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
              placeholder="数字越小越靠前"
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={formData.is_visible}
                onChange={(e) => setFormData({ ...formData, is_visible: e.target.checked })}
                style={{ marginRight: '8px' }}
              />
              菜单可见
            </label>
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => setShowModal(false)} className="btn btn-default">
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              确定
            </button>
          </div>
        </form>
      </Modal>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        visible={!!deleteId}
        title="确认删除"
        message="确定要删除此菜单吗？如果存在子菜单，需要先删除子菜单。"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
