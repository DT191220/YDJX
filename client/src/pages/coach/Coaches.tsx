import { useState, useEffect } from 'react';
import { coachService } from '../../services/coach';
import { Coach, CoachFormData, CoachStatus, Gender } from '../../types/coach';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { usePagination } from '../../hooks/usePagination';
import { useDict } from '../../hooks/useDict';
import { ColumnDef } from '@tanstack/react-table';
import './Coaches.css';

export default function Coaches() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingCoachId, setDeletingCoachId] = useState<number | null>(null);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<CoachStatus | ''>('');

  const { limit, offset, total, page, pages, setLimit, setPage, setTotal } = usePagination();
  
  // 使用字典获取教练状态选项
  const { options: coachStatusOptions } = useDict('coach_status');

  useEffect(() => {
    fetchCoaches();
  }, [limit, offset, keyword, statusFilter]);

  const fetchCoaches = async () => {
    setLoading(true);
    try {
      const response = await coachService.getCoaches({
        limit,
        offset,
        keyword,
        status: statusFilter || undefined,
        sortBy: 'id',
        sortOrder: 'desc'
      });
      setCoaches(response.data!.list);
      setTotal(response.data!.pagination.total);
    } catch (error) {
      console.error('获取教练列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingCoach(null);
    setShowModal(true);
  };

  const handleEdit = (coach: Coach) => {
    setEditingCoach(coach);
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    setDeletingCoachId(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!deletingCoachId) return;

    try {
      await coachService.deleteCoach(deletingCoachId);
      setShowDeleteDialog(false);
      setDeletingCoachId(null);
      fetchCoaches();
    } catch (error) {
      alert('删除失败');
    }
  };

  const columns: ColumnDef<Coach>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      size: 80
    },
    {
      accessorKey: 'name',
      header: '姓名',
      size: 100
    },
    {
      accessorKey: 'phone',
      header: '联系电话',
      size: 120
    },
    {
      accessorKey: 'gender',
      header: '性别',
      size: 80
    },
    {
      accessorKey: 'teaching_subjects',
      header: '教学科目',
      size: 150
    },
    {
      accessorKey: 'teaching_certificate',
      header: '教练证号',
      size: 150
    },
    {
      accessorKey: 'status',
      header: '状态',
      size: 100,
      cell: ({ row }) => {
        const status = row.original.status;
        const statusClass = status === '在职' ? 'status-active' : status === '离职' ? 'status-inactive' : 'status-leave';
        return <span className={`status-badge ${statusClass}`}>{status}</span>;
      }
    },
    {
      accessorKey: 'employment_date',
      header: '入职日期',
      size: 120
    },
    {
      id: 'actions',
      header: '操作',
      size: 150,
      cell: ({ row }) => (
        <div className="action-buttons">
          <button className="btn-edit" onClick={() => handleEdit(row.original)}>
            编辑
          </button>
          <button className="btn-delete" onClick={() => handleDelete(row.original.id)}>
            删除
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="coaches-container">
      <div className="page-header">
        <h2>教练基本信息</h2>
        <button className="btn-primary" onClick={handleAdd}>
          新增教练
        </button>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="搜索姓名、电话或身份证号"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="search-input"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as CoachStatus | '')}
          className="filter-select"
        >
          <option value="">全部状态</option>
          {coachStatusOptions.map(opt => (
            <option key={opt.dict_value} value={opt.dict_value}>{opt.dict_label}</option>
          ))}
        </select>
      </div>

      <Table
        data={coaches}
        columns={columns}
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
        <CoachFormModal
          coach={editingCoach}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchCoaches();
          }}
        />
      )}

      {showDeleteDialog && (
        <ConfirmDialog
          title="确认删除"
          message="确定要删除该教练吗？"
          visible={true}
          onConfirm={confirmDelete}
          onCancel={() => {
            setShowDeleteDialog(false);
            setDeletingCoachId(null);
          }}
        />
      )}
    </div>
  );
}

interface CoachFormModalProps {
  coach: Coach | null;
  onClose: () => void;
  onSuccess: () => void;
}

function CoachFormModal({ coach, onClose, onSuccess }: CoachFormModalProps) {
  const [formData, setFormData] = useState<CoachFormData>({
    name: coach?.name || '',
    id_card: coach?.id_card || '',
    phone: coach?.phone || '',
    gender: coach?.gender || '男',
    address: coach?.address || '',
    license_type: coach?.license_type || '',
    teaching_certificate: coach?.teaching_certificate || '',
    certificate_date: coach?.certificate_date ? coach.certificate_date.split('T')[0] : '',
    teaching_subjects: coach?.teaching_subjects || '',
    employment_date: coach?.employment_date ? coach.employment_date.split('T')[0] : '',
    status: coach?.status || '在职',
    remarks: coach?.remarks || ''
  });

  // 使用字典获取下拉选项
  const { options: genderOptions } = useDict('gender');
  const { options: statusOptions } = useDict('coach_status');
  const { options: teachingSubjectOptions } = useDict('teaching_subject');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (coach?.id) {
        await coachService.updateCoach(coach.id, formData);
      } else {
        await coachService.createCoach(formData);
      }
      onSuccess();
    } catch (error) {
      alert(error instanceof Error ? error.message : '操作失败');
    }
  };

  return (
    <Modal
      title={coach?.id ? '编辑教练' : '新建教练'}
      visible={true}
      onClose={onClose}
      onConfirm={handleSubmit}
      width={800}
    >
      <form onSubmit={handleSubmit} className="coach-form">
        <div className="form-section">
          <h3>基本信息</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">
                姓名 <span className="required">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="请输入姓名"
              />
            </div>

            <div className="form-group">
              <label htmlFor="id_card">
                身份证号 <span className="required">*</span>
              </label>
              <input
                type="text"
                id="id_card"
                value={formData.id_card}
                onChange={(e) => setFormData({ ...formData, id_card: e.target.value })}
                required
                placeholder="请输入身份证号"
                maxLength={18}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="phone">
                联系电话 <span className="required">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                placeholder="请输入联系电话"
                maxLength={11}
              />
            </div>

            <div className="form-group">
              <label htmlFor="gender">性别</label>
              <select
                id="gender"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
              >
                {genderOptions.map(opt => (
                  <option key={opt.dict_value} value={opt.dict_value}>{opt.dict_label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="address">联系地址</label>
            <input
              type="text"
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="请输入联系地址"
            />
          </div>
        </div>

        <div className="form-section">
          <h3>资格信息</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="license_type">驾照类型</label>
              <input
                type="text"
                id="license_type"
                value={formData.license_type}
                onChange={(e) => setFormData({ ...formData, license_type: e.target.value })}
                placeholder="如: C1、C2"
              />
            </div>

            <div className="form-group">
              <label htmlFor="teaching_certificate">教练证号</label>
              <input
                type="text"
                id="teaching_certificate"
                value={formData.teaching_certificate}
                onChange={(e) => setFormData({ ...formData, teaching_certificate: e.target.value })}
                placeholder="请输入教练证号"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="certificate_date">教练证获取日期</label>
              <input
                type="date"
                id="certificate_date"
                value={formData.certificate_date}
                onChange={(e) => setFormData({ ...formData, certificate_date: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label htmlFor="teaching_subjects">教学科目</label>
              <select
                id="teaching_subjects"
                value={formData.teaching_subjects}
                onChange={(e) => setFormData({ ...formData, teaching_subjects: e.target.value })}
              >
                <option value="">请选择</option>
                {teachingSubjectOptions.map(opt => (
                  <option key={opt.dict_value} value={opt.dict_value}>{opt.dict_label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>聘用信息</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="employment_date">入职日期</label>
              <input
                type="date"
                id="employment_date"
                value={formData.employment_date}
                onChange={(e) => setFormData({ ...formData, employment_date: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label htmlFor="status">状态</label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as CoachStatus })}
              >
                {statusOptions.map(opt => (
                  <option key={opt.dict_value} value={opt.dict_value}>{opt.dict_label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="remarks">备注</label>
            <textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="请输入备注信息"
              rows={3}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
