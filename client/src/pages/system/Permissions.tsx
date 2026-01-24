import { useState, useEffect } from 'react';
import { permissionService } from '../../services/permission';
import { Permission, PermissionFormData } from '../../types/permission';
import Tree, { TreeNode } from '../../components/common/Tree';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import './Permissions.css';

export default function Permissions() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<Set<number | string>>(new Set());

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const response = await permissionService.getPermissionTree();
      setPermissions(response.data || []);
      
      // 默认展开所有节点
      const allIds = new Set<number | string>();
      const collectIds = (list: Permission[]) => {
        list.forEach(item => {
          allIds.add(item.id);
          if (item.children) {
            collectIds(item.children);
          }
        });
      };
      collectIds(response.data || []);
      setExpandedKeys(allIds);
    } catch (error) {
      console.error('获取权限树失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (parentId?: number) => {
    setEditingPermission(parentId ? { parent_id: parentId } as Permission : null);
    setShowModal(true);
  };

  const handleEdit = (permission: Permission) => {
    setEditingPermission(permission);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await permissionService.deletePermission(deleteId);
      fetchPermissions();
      setDeleteId(null);
    } catch (error) {
      console.error('删除权限失败:', error);
      alert(error instanceof Error ? error.message : '删除失败');
    }
  };

  const handleToggle = (id: number | string) => {
    const newExpanded = new Set(expandedKeys);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedKeys(newExpanded);
  };

  const renderTreeNode = (node: Permission, level: number) => {
    const typeMap: Record<string, string> = {
      'menu': '菜单',
      'button': '按钮',
      'api': '接口'
    };

    return (
      <div className="permission-node">
        <div className="permission-info">
          <span className="permission-name">{node.permission_name}</span>
          <span className="permission-code">{node.permission_code}</span>
          <span className={`permission-type type-${node.permission_type}`}>
            {typeMap[node.permission_type] || node.permission_type}
          </span>
          <span className={`status-tag ${node.status === '启用' ? 'status-active' : 'status-inactive'}`}>
            {node.status}
          </span>
        </div>
        <div className="permission-actions">
          <button onClick={() => handleAdd(node.id)} className="btn-add-child">
            添加子权限
          </button>
          <button onClick={() => handleEdit(node)} className="btn-edit">
            编辑
          </button>
          <button onClick={() => setDeleteId(node.id)} className="btn-delete">
            删除
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="permissions-page">加载中...</div>;
  }

  return (
    <div className="permissions-page">
      <div className="page-header">
        <h2>权限管理</h2>
        <button onClick={() => handleAdd()} className="btn-primary">
          新建顶级权限
        </button>
      </div>

      <div className="permissions-tree">
        <Tree
          data={permissions as TreeNode[]}
          renderNode={renderTreeNode}
          expandedKeys={expandedKeys}
          onToggle={handleToggle}
        />
      </div>

      {showModal && (
        <PermissionFormModal
          permission={editingPermission}
          permissions={permissions}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchPermissions();
          }}
        />
      )}

      <ConfirmDialog
        visible={!!deleteId}
        title="确认删除"
        message="确定要删除这个权限吗？删除后无法恢复。"
        type="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

interface PermissionFormModalProps {
  permission: Permission | null;
  permissions: Permission[];
  onClose: () => void;
  onSuccess: () => void;
}

function PermissionFormModal({ permission, permissions, onClose, onSuccess }: PermissionFormModalProps) {
  const [formData, setFormData] = useState<PermissionFormData>({
    permission_name: permission?.permission_name || '',
    permission_code: permission?.permission_code || '',
    permission_type: permission?.permission_type || 'menu',
    parent_id: permission?.parent_id || null,
    route_path: permission?.route_path || '',
    icon: permission?.icon || '',
    sort_order: permission?.sort_order || 0,
    status: permission?.status || '启用'
  });
  const [submitting, setSubmitting] = useState(false);

  // 扁平化权限列表用于父级选择
  const flattenPermissions = (list: Permission[], result: Permission[] = []): Permission[] => {
    list.forEach(item => {
      result.push(item);
      if (item.children) {
        flattenPermissions(item.children, result);
      }
    });
    return result;
  };

  const flatPermissions = flattenPermissions(permissions);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (permission?.id) {
        await permissionService.updatePermission(permission.id, formData);
      } else {
        await permissionService.createPermission(formData);
      }
      onSuccess();
    } catch (error) {
      alert(error instanceof Error ? error.message : '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={permission?.id ? '编辑权限' : '新建权限'}
      visible={true}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="permission-form">
        <div className="form-group">
          <label htmlFor="permission_name">
            权限名称 <span className="required">*</span>
          </label>
          <input
            type="text"
            id="permission_name"
            value={formData.permission_name}
            onChange={(e) => setFormData({ ...formData, permission_name: e.target.value })}
            required
            placeholder="请输入权限名称"
          />
        </div>

        <div className="form-group">
          <label htmlFor="permission_code">
            权限编码 <span className="required">*</span>
          </label>
          <input
            type="text"
            id="permission_code"
            value={formData.permission_code}
            onChange={(e) => setFormData({ ...formData, permission_code: e.target.value })}
            required
            placeholder="例如: system:user:view"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="permission_type">
              权限类型 <span className="required">*</span>
            </label>
            <select
              id="permission_type"
              value={formData.permission_type}
              onChange={(e) => setFormData({ ...formData, permission_type: e.target.value as any })}
              required
            >
              <option value="menu">菜单</option>
              <option value="button">按钮</option>
              <option value="api">接口</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="parent_id">父级权限</label>
            <select
              id="parent_id"
              value={formData.parent_id || ''}
              onChange={(e) => setFormData({ ...formData, parent_id: e.target.value ? parseInt(e.target.value) : null })}
            >
              <option value="">无（顶级权限）</option>
              {flatPermissions
                .filter(p => !permission?.id || p.id !== permission.id)
                .map(p => (
                  <option key={p.id} value={p.id}>
                    {p.permission_name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="route_path">路由路径</label>
          <input
            type="text"
            id="route_path"
            value={formData.route_path}
            onChange={(e) => setFormData({ ...formData, route_path: e.target.value })}
            placeholder="例如: /system/users"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="icon">图标</label>
            <input
              type="text"
              id="icon"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              placeholder="图标名称或类名"
            />
          </div>

          <div className="form-group">
            <label htmlFor="sort_order">排序</label>
            <input
              type="number"
              id="sort_order"
              value={formData.sort_order}
              onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
              placeholder="数字越小越靠前"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="status">状态</label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as '启用' | '禁用' })}
          >
            <option value="启用">启用</option>
            <option value="禁用">禁用</option>
          </select>
        </div>

        <div className="form-actions">
          <button type="button" onClick={onClose} className="btn-cancel">
            取消
          </button>
          <button type="submit" disabled={submitting} className="btn-submit">
            {submitting ? '提交中...' : '确定'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
