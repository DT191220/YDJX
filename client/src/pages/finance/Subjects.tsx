import { useState, useEffect, useMemo } from 'react';
import { financeService, Subject, SubjectFormData, SubjectMapping } from '../../services/finance';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import { ColumnDef } from '@tanstack/react-table';
import '../system/Students.css';

const SUBJECT_TYPES = ['资产', '负债', '权益', '收入', '支出'] as const;
const BALANCE_DIRECTIONS = ['借', '贷'] as const;

type TabType = 'subjects' | 'mapping';

export default function Subjects() {
  const [activeTab, setActiveTab] = useState<TabType>('subjects');
  
  // === 科目管理状态 ===
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  
  // 科目列表分页状态
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  
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

  // === 用途映射状态 ===
  const [mappings, setMappings] = useState<SubjectMapping[]>([]);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [editingMapping, setEditingMapping] = useState<SubjectMapping | null>(null);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [mappingFormSubjectCode, setMappingFormSubjectCode] = useState('');
  const [activeSubjects, setActiveSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    if (activeTab === 'subjects') {
      fetchSubjects();
    } else {
      fetchMappings();
      fetchActiveSubjects();
    }
  }, [activeTab, typeFilter]);

  // 筛选条件或tab变化时重置到第一页
  useEffect(() => {
    setPage(1);
  }, [typeFilter, activeTab]);

  // 计算科目列表分页数据
  const { paginatedSubjects, total, pages } = useMemo(() => {
    const total = subjects.length;
    const pages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedSubjects = subjects.slice(start, end);
    return { paginatedSubjects, total, pages };
  }, [subjects, page, limit]);

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

  // === 用途映射相关函数 ===
  const fetchMappings = async () => {
    setMappingLoading(true);
    try {
      const response = await financeService.getSubjectMappings();
      if (response.data) {
        setMappings(response.data);
      }
    } catch (error) {
      console.error('获取科目映射列表失败:', error);
    } finally {
      setMappingLoading(false);
    }
  };

  const fetchActiveSubjects = async () => {
    try {
      const response = await financeService.getSubjects({ is_active: 'true' });
      if (response.data) {
        setActiveSubjects(response.data);
      }
    } catch (error) {
      console.error('获取启用科目列表失败:', error);
    }
  };

  const handleEditMapping = (mapping: SubjectMapping) => {
    setEditingMapping(mapping);
    setMappingFormSubjectCode(mapping.subject_code);
    setShowMappingModal(true);
  };

  const handleMappingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMapping || !mappingFormSubjectCode) {
      alert('请选择科目');
      return;
    }

    try {
      await financeService.updateSubjectMapping(editingMapping.id, { subject_code: mappingFormSubjectCode });
      alert('科目映射更新成功');
      setShowMappingModal(false);
      setEditingMapping(null);
      fetchMappings();
    } catch (error: any) {
      console.error('更新科目映射失败:', error);
      alert(error.message || '更新科目映射失败');
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

  // 映射表列定义
  const mappingColumns: ColumnDef<SubjectMapping, any>[] = [
    {
      accessorKey: 'usage_code',
      header: '用途代码',
      size: 150,
    },
    {
      accessorKey: 'usage_name',
      header: '用途名称',
      size: 150,
    },
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
      accessorKey: 'description',
      header: '说明',
      size: 200,
      cell: ({ row }) => row.original.description || '-',
    },
    {
      header: '操作',
      size: 100,
      cell: ({ row }) => (
        <button
          onClick={() => handleEditMapping(row.original)}
          className="btn btn-primary btn-sm"
        >
          修改科目
        </button>
      ),
    },
  ];

  return (
    <div className="students-page">
      <div className="page-header">
        <h1>科目管理</h1>
        {activeTab === 'subjects' && (
          <div className="header-actions">
            <button onClick={handleAdd} className="btn btn-primary">
              新增科目
            </button>
          </div>
        )}
      </div>

      {/* 标签页切换 */}
      <div className="tabs-container" style={{ marginBottom: '16px' }}>
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'subjects' ? 'active' : ''}`}
            onClick={() => setActiveTab('subjects')}
          >
            科目列表
          </button>
          <button
            className={`tab ${activeTab === 'mapping' ? 'active' : ''}`}
            onClick={() => setActiveTab('mapping')}
          >
            用途映射
          </button>
        </div>
      </div>

      {/* 科目列表 */}
      {activeTab === 'subjects' && (
        <>
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
            <Table columns={columns} data={paginatedSubjects} loading={loading} />
            {total > 0 && (
              <Pagination
                page={page}
                pages={pages}
                total={total}
                limit={limit}
                onPageChange={setPage}
                onLimitChange={(newLimit) => {
                  setLimit(newLimit);
                  setPage(1);
                }}
              />
            )}
          </div>
        </>
      )}

      {/* 用途映射 */}
      {activeTab === 'mapping' && (
        <>
          <div className="info-panel" style={{ padding: '12px 16px', marginBottom: '16px', backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '4px' }}>
            <p style={{ margin: 0, color: '#1890ff' }}>
              用途映射配置各业务场景（如学员缴费、教练工资等）使用的会计科目。修改后，相关业务生成的凭证将使用新配置的科目。
            </p>
          </div>
          <div className="table-container">
            <Table columns={mappingColumns} data={mappings} loading={mappingLoading} />
          </div>
        </>
      )}

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
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              <span>启用此科目</span>
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

      {/* 映射编辑Modal */}
      <Modal
        title="修改科目映射"
        visible={showMappingModal}
        onClose={() => { setShowMappingModal(false); setEditingMapping(null); }}
      >
        <form onSubmit={handleMappingSubmit} className="form">
          <div className="form-group">
            <label>用途代码</label>
            <input
              type="text"
              value={editingMapping?.usage_code || ''}
              disabled
            />
          </div>
          <div className="form-group">
            <label>用途名称</label>
            <input
              type="text"
              value={editingMapping?.usage_name || ''}
              disabled
            />
          </div>
          <div className="form-group">
            <label>选择科目 *</label>
            <select
              value={mappingFormSubjectCode}
              onChange={(e) => setMappingFormSubjectCode(e.target.value)}
              required
            >
              <option value="">请选择科目</option>
              {activeSubjects.map(subject => (
                <option key={subject.id} value={subject.subject_code}>
                  {subject.subject_code} - {subject.subject_name} ({subject.subject_type})
                </option>
              ))}
            </select>
          </div>
          {editingMapping?.description && (
            <div className="form-group">
              <label>说明</label>
              <p style={{ margin: 0, color: '#666' }}>{editingMapping.description}</p>
            </div>
          )}
          <div className="form-actions">
            <button type="button" onClick={() => { setShowMappingModal(false); setEditingMapping(null); }} className="btn btn-default">
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              确定
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
