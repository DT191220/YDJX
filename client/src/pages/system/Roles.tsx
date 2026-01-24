import { useState, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { roleService } from '../../services/role';
import { permissionService } from '../../services/permission';
import { Role, RoleFormData } from '../../types/role';
import { Permission } from '../../types/permission';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { usePagination } from '../../hooks/usePagination';
import './Roles.css';

export default function Roles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [permissionRole, setPermissionRole] = useState<Role | null>(null);

  const { limit, offset, total, setTotal, page, pages, setPage, setLimit } = usePagination();

  useEffect(() => {
    fetchRoles();
  }, [limit, offset, keyword, statusFilter]);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const response = await roleService.getRoles({
        limit,
        offset,
        keyword,
        status: statusFilter,
        sortBy: 'sort_order',
        sortOrder: 'asc'
      });
      setRoles(response.data!.list);
      setTotal(response.data!.pagination.total);
    } catch (error) {
      console.error('获取角色列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchRoles();
  };

  const handleAdd = () => {
    setEditingRole(null);
    setShowModal(true);
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await roleService.deleteRole(deleteId);
      fetchRoles();
      setDeleteId(null);
    } catch (error) {
      console.error('删除角色失败:', error);
      alert(error instanceof Error ? error.message : '删除失败');
    }
  };

  const handleToggleStatus = async (role: Role) => {
    try {
      const newStatus = role.status === '启用' ? '禁用' : '启用';
      await roleService.updateRoleStatus(role.id, newStatus);
      fetchRoles();
    } catch (error) {
      console.error('修改状态失败:', error);
    }
  };

  const columns: ColumnDef<Role, any>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      size: 80,
    },
    {
      accessorKey: 'role_name',
      header: '角色名称',
    },
    {
      accessorKey: 'role_code',
      header: '角色编码',
    },
    {
      accessorKey: 'description',
      header: '描述',
    },
    {
      accessorKey: 'sort_order',
      header: '排序',
      size: 100,
      cell: ({ getValue }) => getValue() || 0,
    },
    {
      accessorKey: 'status',
      header: '状态',
      size: 100,
      cell: ({ getValue }) => {
        const value = getValue() as string;
        return (
          <span className={`status-tag ${value === '启用' ? 'status-active' : 'status-inactive'}`}>
            {value}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '操作',
      size: 320,
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div className="table-actions">
            <button onClick={() => handleEdit(record)} className="btn-edit">
              编辑
            </button>
            <button onClick={() => setPermissionRole(record)} className="btn-permission">
              配置权限
            </button>
            <button 
              onClick={() => handleToggleStatus(record)}
              className={record.status === '启用' ? 'btn-disable' : 'btn-enable'}
            >
              {record.status === '启用' ? '禁用' : '启用'}
            </button>
            <button onClick={() => setDeleteId(record.id)} className="btn-delete">
              删除
            </button>
          </div>
        );
      },
    }
  ];

  return (
    <div className="roles-page">
      <div className="page-header">
        <h2>角色管理</h2>
      </div>

      <div className="page-toolbar">
        <div className="toolbar-left">
          <input
            type="text"
            placeholder="搜索角色名称/编码/描述"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="search-input"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">全部状态</option>
            <option value="启用">启用</option>
            <option value="禁用">禁用</option>
          </select>
          <button onClick={handleSearch} className="btn-search">
            搜索
          </button>
        </div>
        <div className="toolbar-right">
          <button onClick={handleAdd} className="btn-primary">
            新建角色
          </button>
        </div>
      </div>

      <Table
        columns={columns}
        data={roles}
        loading={loading}
      />

      <Pagination
        page={page}
        pages={pages}
        total={total}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />

      {showModal && (
        <RoleFormModal
          role={editingRole}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchRoles();
          }}
        />
      )}

      {deleteId && (
        <ConfirmDialog
          visible={true}
          title="确认删除"
          message="确定要删除这个角色吗？删除后无法恢复。"
          type="danger"
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {permissionRole && (
        <PermissionConfigModal
          role={permissionRole}
          onClose={() => setPermissionRole(null)}
          onSuccess={() => setPermissionRole(null)}
        />
      )}
    </div>
  );
}

interface RoleFormModalProps {
  role: Role | null;
  onClose: () => void;
  onSuccess: () => void;
}

function RoleFormModal({ role, onClose, onSuccess }: RoleFormModalProps) {
  const [formData, setFormData] = useState<RoleFormData>({
    role_name: '',
    role_code: '',
    description: '',
    status: '启用',
    sort_order: 0
  });
  const [submitting, setSubmitting] = useState(false);

  // 当 role 变化时，更新表单数据
  useEffect(() => {
    if (role) {
      setFormData({
        role_name: role.role_name || '',
        role_code: role.role_code || '',
        description: role.description || '',
        status: role.status || '启用',
        sort_order: role.sort_order || 0
      });
    } else {
      setFormData({
        role_name: '',
        role_code: '',
        description: '',
        status: '启用',
        sort_order: 0
      });
    }
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (role) {
        await roleService.updateRole(role.id, formData);
      } else {
        await roleService.createRole(formData);
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
      title={role ? '编辑角色' : '新建角色'}
      visible={true}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="role-form">
        <div className="form-group">
          <label htmlFor="role_name">
            角色名称 <span className="required">*</span>
          </label>
          <input
            type="text"
            id="role_name"
            value={formData.role_name}
            onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
            required
            placeholder="请输入角色名称"
          />
        </div>

        <div className="form-group">
          <label htmlFor="role_code">
            角色编码 <span className="required">*</span>
          </label>
          <input
            type="text"
            id="role_code"
            value={formData.role_code}
            onChange={(e) => setFormData({ ...formData, role_code: e.target.value })}
            required
            placeholder="例如: ADMIN, TEACHER, STUDENT"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">描述</label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="请输入角色描述"
            rows={3}
          />
        </div>

        <div className="form-row">
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

// 权限配置弹窗组件
interface PermissionConfigModalProps {
  role: Role;
  onClose: () => void;
  onSuccess: () => void;
}

function PermissionConfigModal({ role, onClose, onSuccess }: PermissionConfigModalProps) {
  const [permissionTree, setPermissionTree] = useState<Permission[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expandedIds, setExpandedIds] = useState<number[]>([]);

  // 加载权限树和角色已有权限
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [treeRes, rolePermRes] = await Promise.all([
          permissionService.getPermissionTree(),
          roleService.getRolePermissions(role.id)
        ]);
        
        const tree = treeRes.data || [];
        setPermissionTree(tree);
        
        // 默认展开所有顶级节点
        setExpandedIds(tree.map((p: Permission) => p.id));
        
        // 设置已选中的权限ID
        const existingIds = (rolePermRes.data as any[])?.map((p: any) => p.id) || [];
        setSelectedIds(existingIds);
      } catch (error) {
        console.error('加载权限数据失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [role.id]);

  // 获取所有子节点ID
  const getAllChildIds = (permission: Permission): number[] => {
    let ids: number[] = [];
    if (permission.children) {
      for (const child of permission.children) {
        ids.push(child.id);
        ids = ids.concat(getAllChildIds(child));
      }
    }
    return ids;
  };

  // 获取所有父节点ID
  const getAllParentIds = (permissions: Permission[], targetId: number, parents: number[] = []): number[] => {
    for (const perm of permissions) {
      if (perm.id === targetId) {
        return parents;
      }
      if (perm.children) {
        const result = getAllParentIds(perm.children, targetId, [...parents, perm.id]);
        if (result.length > 0) {
          return result;
        }
      }
    }
    return [];
  };

  // 处理权限选择
  const handleSelect = (permission: Permission, checked: boolean) => {
    let newSelectedIds = [...selectedIds];
    
    if (checked) {
      // 添加当前节点
      newSelectedIds.push(permission.id);
      // 添加所有子节点
      const childIds = getAllChildIds(permission);
      newSelectedIds = [...new Set([...newSelectedIds, ...childIds])];
      // 添加所有父节点
      const parentIds = getAllParentIds(permissionTree, permission.id);
      newSelectedIds = [...new Set([...newSelectedIds, ...parentIds])];
    } else {
      // 移除当前节点
      newSelectedIds = newSelectedIds.filter(id => id !== permission.id);
      // 移除所有子节点
      const childIds = getAllChildIds(permission);
      newSelectedIds = newSelectedIds.filter(id => !childIds.includes(id));
    }
    
    setSelectedIds(newSelectedIds);
  };

  // 切换展开/收起
  const toggleExpand = (id: number) => {
    setExpandedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // 保存权限配置
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await roleService.assignPermissions(role.id, selectedIds);
      onSuccess();
    } catch (error) {
      alert(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 渲染权限树节点
  const renderTreeNode = (permission: Permission, level: number = 0) => {
    const hasChildren = permission.children && permission.children.length > 0;
    const isExpanded = expandedIds.includes(permission.id);
    const isChecked = selectedIds.includes(permission.id);

    return (
      <div key={permission.id} className="permission-tree-node">
        <div 
          className="permission-tree-item"
          style={{ paddingLeft: `${level * 24 + 8}px` }}
        >
          {hasChildren ? (
            <span 
              className={`tree-expand-icon ${isExpanded ? 'expanded' : ''}`}
              onClick={() => toggleExpand(permission.id)}
            >
              ▶
            </span>
          ) : (
            <span className="tree-expand-placeholder" />
          )}
          <label className="permission-checkbox">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => handleSelect(permission, e.target.checked)}
            />
            <span className={`permission-type-tag type-${permission.permission_type}`}>
              {permission.permission_type}
            </span>
            <span className="permission-name">{permission.permission_name}</span>
            <span className="permission-code">({permission.permission_code})</span>
          </label>
        </div>
        {hasChildren && isExpanded && (
          <div className="permission-tree-children">
            {permission.children!.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal
      title={`配置权限 - ${role.role_name}`}
      visible={true}
      onClose={onClose}
      width={700}
    >
      <div className="permission-config-content">
        {loading ? (
          <div className="permission-loading">加载中...</div>
        ) : (
          <>
            <div className="permission-tree-header">
              <span>已选择 {selectedIds.length} 项权限</span>
            </div>
            <div className="permission-tree-container">
              {permissionTree.length === 0 ? (
                <div className="permission-empty">暂无权限数据</div>
              ) : (
                permissionTree.map(permission => renderTreeNode(permission))
              )}
            </div>
          </>
        )}
        <div className="form-actions">
          <button type="button" onClick={onClose} className="btn-cancel">
            取消
          </button>
          <button 
            type="button" 
            onClick={handleSubmit} 
            disabled={submitting || loading}
            className="btn-submit"
          >
            {submitting ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
