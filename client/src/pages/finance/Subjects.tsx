import { useState, useEffect } from 'react';
import { financeService, Subject, SubjectFormData } from '../../services/finance';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { ColumnDef } from '@tanstack/react-table';
import '../system/Students.css';

const SUBJECT_TYPES = ['资产', '负债', '权益', '收入', '支出'] as const;
const BALANCE_DIRECTIONS = ['借', '贷'] as const;

export default function Subjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [formData, setFormData] = useState<SubjectFormData>({
    subject_code: '',
    subject_name: '',
    subject_type: '收入',
    balance_direction: '贷',
    parent_code: '',
    is_active: true,
    sort_order: 0
  });

  useEffect(() => {
    fetchSubjects();
  }, [typeFilter]);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const response = await financeService.getSubjects({
        type: typeFilter || undefined
      });
      if (response.data) {
        setSubjects(response.data);
      }
    } catch (error) {
      console.error('获取科目列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingSubject(null);
    setFormData({
      subject_code: '',
      subject_name: '',
      subject_type: '收入',
      balance_direction: '贷',
      parent_code: '',
      is_active: true,
      sort_order: 0
    });
    setShowModal(true);
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData({
      subject_code: subject.subject_code,
      subject_name: subject.subject_name,
      subject_type: subject.subject_type,
      balance_direction: subject.balance_direction,
      parent_code: subject.parent_code || '',
      is_active: subject.is_active,
      sort_order: subject.sort_order
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subject_code || !formData.subject_name) {
      alert('请填写科目代码和名称');
      return;
    }

    try {
      if (editingSubject) {
        await financeService.updateSubject(editingSubject.id, formData);
        alert('科目更新成功');
      } else {
        await financeService.createSubject(formData);
        alert('科目创建成功');
      }
      setShowModal(false);
      fetchSubjects();
    } catch (error: any) {
      console.error('保存科目失败:', error);
      alert(error.message || '保存科目失败');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await financeService.deleteSubject(deleteId);
      alert('操作成功');
      setDeleteId(null);
      fetchSubjects();
    } catch (error: any) {
      console.error('删除科目失败:', error);
      alert(error.message || '删除失败');
    }
  };

  const getTypeBadge = (type: string) => {
    const badges: Record<string, string> = {
      '资产': 'badge-blue',
      '负债': 'badge-red',
      '权益': 'badge-purple',
      '收入': 'badge-green',
      '支出': 'badge-orange'
    };
    return badges[type] || 'badge-gray';
  };

  const columns: ColumnDef<Subject, any>[] = [
    {
      accessorKey: 'subject_code',
      header: '科目代码',
      size: 100,
    },
    {
      accessorKey: 'subject_name',
      header: '科目名称',
      size: 150,
    },
    {
      accessorKey: 'subject_type',
      header: '科目类型',
      size: 100,
      cell: ({ row }) => (
        <span className={`badge ${getTypeBadge(row.original.subject_type)}`}>
          {row.original.subject_type}
        </span>
      ),
    },
    {
      accessorKey: 'balance_direction',
      header: '余额方向',
      size: 80,
      cell: ({ row }) => (
        <span className={row.original.balance_direction === '借' ? 'text-blue' : 'text-green'}>
          {row.original.balance_direction}
        </span>
      ),
    },
    {
      accessorKey: 'is_active',
      header: '状态',
      size: 80,
      cell: ({ row }) => (
        <span className={`badge ${row.original.is_active ? 'badge-green' : 'badge-gray'}`}>
          {row.original.is_active ? '启用' : '停用'}
        </span>
      ),
    },
    {
      accessorKey: 'sort_order',
      header: '排序',
      size: 60,
    },
    {
      header: '操作',
      size: 150,
      cell: ({ row }) => (
        <div className="action-buttons">
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
        <h1>科目管理</h1>
        <div className="header-actions">
          <button onClick={handleAdd} className="btn btn-primary">
            新增科目
          </button>
        </div>
      </div>

      <div className="search-panel">
        <div className="search-row">
          <div className="search-item">
            <label>科目类型</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">全部</option>
              {SUBJECT_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <button onClick={fetchSubjects} className="btn btn-primary">
            查询
          </button>
        </div>
      </div>

      <div className="table-container">
        <Table columns={columns} data={subjects} loading={loading} />
      </div>

      {/* 科目编辑Modal */}
      <Modal
        title={editingSubject ? '编辑科目' : '新增科目'}
        visible={showModal}
        onClose={() => setShowModal(false)}
      >
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label>科目代码 *</label>
            <input
              type="text"
              value={formData.subject_code}
              onChange={(e) => setFormData({ ...formData, subject_code: e.target.value })}
              disabled={!!editingSubject}
              required
              placeholder="如：101, 1001"
            />
          </div>
          <div className="form-group">
            <label>科目名称 *</label>
            <input
              type="text"
              value={formData.subject_name}
              onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
              required
              placeholder="如：学员学费"
            />
          </div>
          <div className="form-group">
            <label>科目类型 *</label>
            <select
              value={formData.subject_type}
              onChange={(e) => setFormData({ ...formData, subject_type: e.target.value })}
              required
            >
              {SUBJECT_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>余额方向 *</label>
            <select
              value={formData.balance_direction}
              onChange={(e) => setFormData({ ...formData, balance_direction: e.target.value })}
              required
            >
              {BALANCE_DIRECTIONS.map(dir => (
                <option key={dir} value={dir}>{dir}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>排序号</label>
            <input
              type="number"
              value={formData.sort_order}
              onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                style={{ marginRight: '8px' }}
              />
              启用
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
        title="确认操作"
        message="如果该科目已被凭证使用，将自动设为停用状态。确定要继续吗？"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
