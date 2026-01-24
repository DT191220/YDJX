import { useState, useEffect } from 'react';
import { coachSalaryService } from '../../services/salary';
import { CoachMonthlySalary, CoachMonthlySalaryFormData } from '../../types/salary';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { usePagination } from '../../hooks/usePagination';
import { ColumnDef } from '@tanstack/react-table';
import './CoachSalary.css';

export default function CoachSalary() {
  const [salaries, setSalaries] = useState<CoachMonthlySalary[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingSalary, setEditingSalary] = useState<CoachMonthlySalary | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingSalaryId, setDeletingSalaryId] = useState<number | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showRefreshModal, setShowRefreshModal] = useState(false);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [generateMonth, setGenerateMonth] = useState('');
  const [refreshMonth, setRefreshMonth] = useState('');
  const [deleteMonth, setDeleteMonth] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [coachNameFilter, setCoachNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { limit, offset, total, page, pages, setLimit, setPage, setTotal } = usePagination();

  useEffect(() => {
    setPage(1); // 筛选条件改变时重置到第一页
  }, [monthFilter, coachNameFilter, statusFilter]);

  useEffect(() => {
    fetchSalaries();
  }, [limit, offset, monthFilter, coachNameFilter, statusFilter]);

  const fetchSalaries = async () => {
    setLoading(true);
    try {
      const response = await coachSalaryService.getCoachSalaries({
        limit,
        offset,
        salary_month: monthFilter || undefined,
        coach_name: coachNameFilter || undefined,
        status: statusFilter || undefined,
        sortBy: 'salary_month',
        sortOrder: 'desc'
      });
      setSalaries(response.data!.list);
      setTotal(response.data!.pagination.total);
    } catch (error) {
      console.error('获取工资列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    setGenerateMonth(currentMonth);
    setShowGenerateModal(true);
  };

  const handleRefresh = () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    setRefreshMonth(currentMonth);
    setShowRefreshModal(true);
  };

  const handleBatchDelete = () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    setDeleteMonth(currentMonth);
    setShowBatchDeleteModal(true);
  };

  const confirmGenerate = async () => {
    if (!generateMonth) {
      alert('请选择月份');
      return;
    }

    try {
      const response = await coachSalaryService.generateSalary(generateMonth);
      alert(`成功生成 ${response.data!.generated} 条工资记录`);
      setShowGenerateModal(false);
      fetchSalaries();
    } catch (error) {
      alert(error instanceof Error ? error.message : '生成失败');
    }
  };

  const confirmRefresh = async () => {
    if (!refreshMonth) {
      alert('请选择月份');
      return;
    }

    try {
      const response = await coachSalaryService.refreshSalary(refreshMonth);
      alert(`成功刷新 ${response.data!.refreshed} 条工资记录`);
      setShowRefreshModal(false);
      fetchSalaries();
    } catch (error) {
      alert(error instanceof Error ? error.message : '刷新失败');
    }
  };

  const confirmBatchDelete = async () => {
    if (!deleteMonth) {
      alert('请选择月份');
      return;
    }

    try {
      const response = await coachSalaryService.batchDeleteSalary(deleteMonth);
      alert(`成功删除 ${response.data!.deleted} 条工资记录`);
      setShowBatchDeleteModal(false);
      fetchSalaries();
    } catch (error) {
      alert(error instanceof Error ? error.message : '删除失败');
    }
  };

  const handleEdit = (salary: CoachMonthlySalary) => {
    setEditingSalary(salary);
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    setDeletingSalaryId(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!deletingSalaryId) return;

    try {
      await coachSalaryService.deleteCoachSalary(deletingSalaryId);
      setShowDeleteDialog(false);
      setDeletingSalaryId(null);
      fetchSalaries();
    } catch (error) {
      alert('删除失败');
    }
  };

  const columns: ColumnDef<CoachMonthlySalary>[] = [
    {
      accessorKey: 'salary_month',
      header: '月份',
      size: 100
    },
    {
      accessorKey: 'coach_name',
      header: '教练姓名',
      size: 100
    },
    {
      accessorKey: 'attendance_days',
      header: '出勤天数',
      size: 90
    },
    {
      accessorKey: 'base_salary',
      header: '基础工资',
      size: 100,
      cell: ({ row }) => `¥${Number(row.original.base_salary).toFixed(2)}`
    },
    {
      accessorKey: 'subject2_pass_count',
      header: '科二通过数',
      size: 100
    },
    {
      accessorKey: 'subject3_pass_count',
      header: '科三通过数',
      size: 100
    },
    {
      accessorKey: 'new_student_count',
      header: '新招学员数',
      size: 100
    },
    {
      accessorKey: 'bonus',
      header: '奖金',
      size: 90,
      cell: ({ row }) => `¥${Number(row.original.bonus).toFixed(2)}`
    },
    {
      accessorKey: 'deduction',
      header: '扣薪',
      size: 90,
      cell: ({ row }) => `¥${Number(row.original.deduction).toFixed(2)}`
    },
    {
      accessorKey: 'gross_salary',
      header: '应发工资',
      size: 100,
      cell: ({ row }) => `¥${Number(row.original.gross_salary).toFixed(2)}`
    },
    {
      accessorKey: 'net_salary',
      header: '实发工资',
      size: 100,
      cell: ({ row }) => row.original.net_salary ? `¥${Number(row.original.net_salary).toFixed(2)}` : '-'
    },
    {
      accessorKey: 'status',
      header: '状态',
      size: 90,
      cell: ({ row }) => {
        const statusMap = {
          draft: '草稿',
          confirmed: '已确认',
          paid: '已发放'
        };
        const statusClass = row.original.status === 'paid' ? 'status-paid' : 
                           row.original.status === 'confirmed' ? 'status-confirmed' : 'status-draft';
        return <span className={`status-badge ${statusClass}`}>{statusMap[row.original.status]}</span>;
      }
    },
    {
      id: 'actions',
      header: '操作',
      size: 120,
      cell: ({ row }) => (
        <div className="action-buttons">
          <button className="btn-edit" onClick={() => handleEdit(row.original)}>
            编辑
          </button>
          {row.original.status !== 'paid' && (
            <button className="btn-delete" onClick={() => handleDelete(row.original.id)}>
              删除
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="coach-salary-container">
      <div className="page-header">
        <h2>教练工资</h2>
        <div className="header-actions">
          <button className="btn-danger" onClick={handleBatchDelete}>
            批量删除
          </button>
          <button className="btn-secondary" onClick={handleRefresh}>
            刷新数据
          </button>
          <button className="btn-primary" onClick={handleGenerate}>
            生成工资
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <input
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="month-input"
          placeholder="选择月份"
        />
        <input
          type="text"
          placeholder="搜索教练姓名"
          value={coachNameFilter}
          onChange={(e) => setCoachNameFilter(e.target.value)}
          className="search-input"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="filter-select"
        >
          <option value="">全部状态</option>
          <option value="draft">草稿</option>
          <option value="confirmed">已确认</option>
          <option value="paid">已发放</option>
        </select>
      </div>

      <Table
        data={salaries}
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

      {showGenerateModal && (
        <Modal
          title="生成工资数据"
          visible={true}
          onClose={() => setShowGenerateModal(false)}
          onConfirm={confirmGenerate}
          width={400}
        >
          <div className="generate-form">
            <div className="form-group">
              <label htmlFor="generate_month">
                选择月份 <span className="required">*</span>
              </label>
              <input
                type="month"
                id="generate_month"
                value={generateMonth}
                onChange={(e) => setGenerateMonth(e.target.value)}
                required
              />
            </div>
            <p className="hint">
              系统将自动统计该月份所有在职教练的考试通过数、新招学员数，并计算提成。出勤天数默认为0，需要手动填写。
            </p>
          </div>
        </Modal>
      )}

      {showRefreshModal && (
        <Modal
          title="刷新工资数据"
          visible={true}
          onClose={() => setShowRefreshModal(false)}
          onConfirm={confirmRefresh}
          width={400}
        >
          <div className="generate-form">
            <div className="form-group">
              <label htmlFor="refresh_month">
                选择月份 <span className="required">*</span>
              </label>
              <input
                type="month"
                id="refresh_month"
                value={refreshMonth}
                onChange={(e) => setRefreshMonth(e.target.value)}
                required
              />
            </div>
            <p className="hint">
              系统将重新统计该月份所有工资记录的考试通过数、新招学员数，并重新计算提成。出勤天数、奖金、扣薪等手动填写的数据不会改变。
            </p>
          </div>
        </Modal>
      )}

      {showBatchDeleteModal && (
        <Modal
          title="批量删除工资数据"
          visible={true}
          onClose={() => setShowBatchDeleteModal(false)}
          onConfirm={confirmBatchDelete}
          width={400}
        >
          <div className="generate-form">
            <div className="form-group">
              <label htmlFor="delete_month">
                选择月份 <span className="required">*</span>
              </label>
              <input
                type="month"
                id="delete_month"
                value={deleteMonth}
                onChange={(e) => setDeleteMonth(e.target.value)}
                required
              />
            </div>
            <p className="hint" style={{color: '#ff4d4f'}}>
              警告：此操作将删除该月份所有草稿和已确认状态的工资记录！已发放的工资不会被删除。删除后无法恢复，请谨慎操作！
            </p>
          </div>
        </Modal>
      )}

      {showModal && editingSalary && (
        <SalaryEditModal
          salary={editingSalary}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchSalaries();
          }}
        />
      )}

      {showDeleteDialog && (
        <ConfirmDialog
          title="确认删除"
          message="确定要删除该工资记录吗？"
          visible={true}
          onConfirm={confirmDelete}
          onCancel={() => {
            setShowDeleteDialog(false);
            setDeletingSalaryId(null);
          }}
        />
      )}
    </div>
  );
}

interface SalaryEditModalProps {
  salary: CoachMonthlySalary;
  onClose: () => void;
  onSuccess: () => void;
}

function SalaryEditModal({ salary, onClose, onSuccess }: SalaryEditModalProps) {
  const [formData, setFormData] = useState<CoachMonthlySalaryFormData>({
    attendance_days: salary.attendance_days,
    bonus: salary.bonus,
    deduction: salary.deduction,
    deduction_reason: salary.deduction_reason || '',
    net_salary: salary.net_salary || undefined,
    status: salary.status,
    remarks: salary.remarks || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.deduction && formData.deduction > 0 && !formData.deduction_reason) {
      alert('扣薪大于0时必须填写扣薪原因');
      return;
    }

    try {
      await coachSalaryService.updateCoachSalary(salary.id, formData);
      onSuccess();
    } catch (error) {
      alert(error instanceof Error ? error.message : '操作失败');
    }
  };

  return (
    <Modal
      title="编辑工资记录"
      visible={true}
      onClose={onClose}
      onConfirm={handleSubmit}
      width={700}
    >
      <form onSubmit={handleSubmit} className="salary-form">
        <div className="info-section">
          <h3>基本信息</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">教练姓名：</span>
              <span className="value">{salary.coach_name}</span>
            </div>
            <div className="info-item">
              <span className="label">月份：</span>
              <span className="value">{salary.salary_month}</span>
            </div>
            <div className="info-item">
              <span className="label">科二通过数：</span>
              <span className="value">{salary.subject2_pass_count}</span>
            </div>
            <div className="info-item">
              <span className="label">科二提成：</span>
              <span className="value">¥{Number(salary.subject2_commission).toFixed(2)}</span>
            </div>
            <div className="info-item">
              <span className="label">科三通过数：</span>
              <span className="value">{salary.subject3_pass_count}</span>
            </div>
            <div className="info-item">
              <span className="label">科三提成：</span>
              <span className="value">¥{Number(salary.subject3_commission).toFixed(2)}</span>
            </div>
            <div className="info-item">
              <span className="label">新招学员数：</span>
              <span className="value">{salary.new_student_count}</span>
            </div>
            <div className="info-item">
              <span className="label">招生提成：</span>
              <span className="value">¥{Number(salary.recruitment_commission).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="edit-section">
          <h3>可编辑项</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="attendance_days">
                出勤天数 <span className="required">*</span>
              </label>
              <input
                type="number"
                id="attendance_days"
                value={formData.attendance_days}
                onChange={(e) => setFormData({ ...formData, attendance_days: Number(e.target.value) })}
                required
                min="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="bonus">奖金</label>
              <input
                type="number"
                id="bonus"
                value={formData.bonus}
                onChange={(e) => setFormData({ ...formData, bonus: Number(e.target.value) })}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="deduction">扣薪</label>
              <input
                type="number"
                id="deduction"
                value={formData.deduction}
                onChange={(e) => setFormData({ ...formData, deduction: Number(e.target.value) })}
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label htmlFor="net_salary">实发工资（税后）</label>
              <input
                type="number"
                id="net_salary"
                value={formData.net_salary || ''}
                onChange={(e) => setFormData({ ...formData, net_salary: e.target.value ? Number(e.target.value) : undefined })}
                min="0"
                step="0.01"
                placeholder="手动输入"
              />
            </div>
          </div>

          {formData.deduction && formData.deduction > 0 && (
            <div className="form-group">
              <label htmlFor="deduction_reason">
                扣薪原因 <span className="required">*</span>
              </label>
              <textarea
                id="deduction_reason"
                value={formData.deduction_reason}
                onChange={(e) => setFormData({ ...formData, deduction_reason: e.target.value })}
                required
                rows={2}
                placeholder="请说明扣薪原因"
              />
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="status">状态</label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <option value="draft">草稿</option>
                <option value="confirmed">已确认</option>
                <option value="paid">已发放</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="remarks">备注</label>
            <textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              rows={3}
              placeholder="请输入备注信息"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
