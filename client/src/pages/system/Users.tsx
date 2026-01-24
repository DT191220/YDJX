import { useState, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { User } from '../../types/user';
import { Role } from '../../types/role';
import { userService } from '../../services/user';
import { roleService } from '../../services/role';
import { usePagination } from '../../hooks/usePagination';
import './Users.css';

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'启用' | '禁用' | ''>('');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const pagination = usePagination(10);

  const columns: ColumnDef<User>[] = [
    { header: 'ID', accessorKey: 'id' },
    { header: '用户名', accessorKey: 'username' },
    { header: '真实姓名', accessorKey: 'real_name' },
    { header: '手机号', accessorKey: 'phone' },
    { header: '邮箱', accessorKey: 'email' },
    { header: '角色', accessorKey: 'roles' },
    {
      header: '状态',
      accessorKey: 'status',
      cell: ({ row }) => (
        <span className={`status-tag status-${row.original.status === '启用' ? 'active' : 'inactive'}`}>
          {row.original.status}
        </span>
      ),
    },
    {
      header: '操作',
      cell: ({ row }) => (
        <div className="action-buttons">
          <button className="btn-edit" onClick={() => handleEdit(row.original)}>
            编辑
          </button>
          <button className="btn-delete" onClick={() => handleDeleteClick(row.original)}>
            删除
          </button>
        </div>
      ),
    },
  ];

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await userService.getList({
        limit: pagination.limit,
        offset: pagination.offset,
        keyword,
        status: statusFilter || undefined,
      });
      setUsers(response.data || []);
      pagination.setTotal(response.pagination?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [pagination.limit, pagination.offset, keyword, statusFilter]);

  const handleCreate = () => {
    setCurrentUser(null);
    setModalVisible(true);
  };

  const handleEdit = (user: User) => {
    setCurrentUser(user);
    setModalVisible(true);
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogVisible(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      await userService.delete(userToDelete.id);
      setDeleteDialogVisible(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setCurrentUser(null);
  };

  const handleSaveSuccess = () => {
    setModalVisible(false);
    setCurrentUser(null);
    fetchUsers();
  };

  return (
    <div className="users-page">
      <div className="page-header">
        <h2>用户管理</h2>
        <button className="btn-primary" onClick={handleCreate}>
          新增用户
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="search-bar">
        <input
          type="text"
          placeholder="搜索用户名、姓名、手机号"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="search-input"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="filter-select"
        >
          <option value="">全部状态</option>
          <option value="启用">启用</option>
          <option value="禁用">禁用</option>
        </select>
      </div>

      <Table data={users} columns={columns} loading={loading} />

      <Pagination
        current={pagination.page}
        total={pagination.total}
        pageSize={pagination.limit}
        onChange={pagination.setPage}
        onPageSizeChange={pagination.setLimit}
      />

      {modalVisible && (
        <UserFormModal
          user={currentUser}
          onClose={handleModalClose}
          onSuccess={handleSaveSuccess}
        />
      )}

      <ConfirmDialog
        visible={deleteDialogVisible}
        title="确认删除"
        message={`确定要删除用户 "${userToDelete?.username}" 吗？此操作不可恢复。`}
        type="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialogVisible(false)}
      />
    </div>
  );
}

// 用户表单模态框组件
function UserFormModal({
  user,
  onClose,
  onSuccess,
}: {
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    username: user?.username || '',
    password: '',
    real_name: user?.real_name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    status: user?.status || '启用',
    role_ids: [] as number[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [allRoles, setAllRoles] = useState<Role[]>([]);

  // 加载角色列表
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await roleService.getRoles({
          limit: 100,
          offset: 0,
          status: '启用',
        });
        setAllRoles(response.data?.list || []);
      } catch (err) {
        console.error('加载角色列表失败:', err);
      }
    };
    fetchRoles();
  }, []);

  // 编辑时加载用户的角色
  useEffect(() => {
    if (user) {
      const fetchUserRoles = async () => {
        try {
          const response = await userService.getRoles(user.id);
          const roleIds = (response.data as any[])?.map((r: any) => r.id) || [];
          setFormData(prev => ({ ...prev, role_ids: roleIds }));
        } catch (err) {
          console.error('加载用户角色失败:', err);
        }
      };
      fetchUserRoles();
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleChange = (roleId: number) => {
    setFormData(prev => {
      const newRoleIds = prev.role_ids.includes(roleId)
        ? prev.role_ids.filter(id => id !== roleId)
        : [...prev.role_ids, roleId];
      return { ...prev, role_ids: newRoleIds };
    });
  };

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);

    try {
      if (user) {
        await userService.update(user.id, formData);
        // 更新用户角色
        await userService.assignRoles(user.id, formData.role_ids);
      } else {
        if (!formData.password) {
          setError('密码不能为空');
          setSubmitting(false);
          return;
        }
        const response = await userService.create(formData);
        // 为新用户分配角色
        if (response.data?.id && formData.role_ids.length > 0) {
          await userService.assignRoles(response.data.id, formData.role_ids);
        }
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={true}
      title={user ? '编辑用户' : '新增用户'}
      onClose={onClose}
      onConfirm={handleSubmit}
      confirmText={submitting ? '保存中...' : '保存'}
    >
      {error && <div className="error-message">{error}</div>}
      
      <div className="form-group">
        <label>用户名 *</label>
        <input
          type="text"
          name="username"
          value={formData.username}
          onChange={handleChange}
          disabled={!!user}
          required
        />
      </div>

      {!user && (
        <div className="form-group">
          <label>密码 *</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>
      )}

      <div className="form-group">
        <label>真实姓名 *</label>
        <input
          type="text"
          name="real_name"
          value={formData.real_name}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label>手机号</label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          pattern="[0-9]{11}"
        />
      </div>

      <div className="form-group">
        <label>邮箱</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label>角色</label>
        <div className="role-checkbox-group">
          {allRoles.map(role => (
            <label key={role.id} className="role-checkbox-item">
              <input
                type="checkbox"
                checked={formData.role_ids.includes(role.id)}
                onChange={() => handleRoleChange(role.id)}
              />
              <span>{role.role_name}</span>
            </label>
          ))}
          {allRoles.length === 0 && <span className="no-roles">暂无可用角色</span>}
        </div>
      </div>

      <div className="form-group">
        <label>状态</label>
        <select name="status" value={formData.status} onChange={handleChange}>
          <option value="启用">启用</option>
          <option value="禁用">禁用</option>
        </select>
      </div>
    </Modal>
  );
}
