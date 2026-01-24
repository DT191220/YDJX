import { useState, useEffect } from 'react';
import { studyPlanService } from '../../services/exam';
import { studentService } from '../../services/student';
import { StudentStudyPlan, PlanType, PlanStatus, StudentStudyPlanFormData } from '../../types/exam';
import { Student } from '../../types/student';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { usePagination } from '../../hooks/usePagination';
import { ColumnDef } from '@tanstack/react-table';
import './StudyPlans.css';

export default function StudyPlans() {
  const [plans, setPlans] = useState<StudentStudyPlan[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<StudentStudyPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [keyword, setKeyword] = useState('');
  const [planTypeFilter, setPlanTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<StudentStudyPlan | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [formData, setFormData] = useState<StudentStudyPlanFormData>({
    student_id: 0,
    plan_type: '日常练车',
    plan_date: '',
    time_slot: '',
    coach_id: undefined,
    status: '待完成',
    reminder_time: '',
    notes: '',
  });

  const { limit, offset, total, setTotal, page, pages, setPage, setLimit } = usePagination();

  useEffect(() => {
    fetchPlans();
    fetchStudents();
  }, []);

  useEffect(() => {
    filterAndPaginate();
  }, [plans, keyword, planTypeFilter, statusFilter, dateStart, dateEnd, offset, limit]);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const response = await studyPlanService.getStudyPlans();
      setPlans(response.data || []);
    } catch (error) {
      console.error('获取学习计划失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await studentService.getStudents({ limit: 1000, offset: 0 });
      setStudents(response.data?.list || []);
    } catch (error) {
      console.error('获取学员列表失败:', error);
    }
  };

  const filterAndPaginate = () => {
    let filtered = [...plans];

    if (keyword) {
      filtered = filtered.filter(item =>
        item.student_name?.includes(keyword) ||
        item.coach_name?.includes(keyword)
      );
    }

    if (planTypeFilter) {
      filtered = filtered.filter(item => item.plan_type === planTypeFilter);
    }

    if (statusFilter) {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    if (dateStart) {
      filtered = filtered.filter(item => item.plan_date >= dateStart);
    }

    if (dateEnd) {
      filtered = filtered.filter(item => item.plan_date <= dateEnd);
    }

    setTotal(filtered.length);
    setFilteredPlans(filtered.slice(offset, offset + limit));
  };

  const handleAdd = () => {
    setEditingPlan(null);
    setFormData({
      student_id: 0,
      plan_type: '日常练车',
      plan_date: '',
      time_slot: '',
      coach_id: undefined,
      status: '待完成',
      reminder_time: '',
      notes: '',
    });
    setShowModal(true);
  };

  const handleEdit = (plan: StudentStudyPlan) => {
    setEditingPlan(plan);
    setFormData({
      student_id: plan.student_id,
      plan_type: plan.plan_type,
      plan_date: plan.plan_date.split('T')[0],
      time_slot: plan.time_slot || '',
      coach_id: plan.coach_id,
      status: plan.status,
      reminder_time: plan.reminder_time ? plan.reminder_time.split('T')[0] : '',
      notes: plan.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.student_id || formData.student_id === 0) {
        alert('请选择学员');
        return;
      }

      if (!formData.plan_date) {
        alert('请选择计划日期');
        return;
      }

      if (editingPlan) {
        await studyPlanService.updateStudyPlan(editingPlan.id, formData);
        alert('更新学习计划成功');
      } else {
        await studyPlanService.createStudyPlan(formData);
        alert('创建学习计划成功');
      }
      
      setShowModal(false);
      fetchPlans();
    } catch (error: any) {
      alert('操作失败: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await studyPlanService.deleteStudyPlan(deleteId);
      alert('删除学习计划成功');
      setDeleteId(null);
      fetchPlans();
    } catch (error: any) {
      alert('删除失败: ' + (error.response?.data?.message || error.message));
    }
  };

  const getPlanTypeBadge = (type: PlanType) => {
    const badges: Record<PlanType, string> = {
      '日常练车': 'badge-info',
      '模拟考试': 'badge-warning',
      '正式考试': 'badge-danger'
    };
    return badges[type] || 'badge-default';
  };

  const getStatusBadge = (status: PlanStatus) => {
    const badges: Record<PlanStatus, string> = {
      '待完成': 'badge-default',
      '已完成': 'badge-success',
      '已取消': 'badge-secondary'
    };
    return badges[status] || 'badge-default';
  };

  const columns: ColumnDef<StudentStudyPlan>[] = [
    {
      accessorKey: 'student_name',
      header: '学员姓名',
      size: 100,
    },
    {
      accessorKey: 'plan_date',
      header: '计划日期',
      size: 110,
      cell: ({ row }) => row.original.plan_date.split('T')[0],
    },
    {
      accessorKey: 'time_slot',
      header: '时间段',
      size: 100,
      cell: ({ row }) => row.original.time_slot || '-',
    },
    {
      accessorKey: 'plan_type',
      header: '计划类型',
      size: 100,
      cell: ({ row }) => (
        <span className={`badge ${getPlanTypeBadge(row.original.plan_type)}`}>
          {row.original.plan_type}
        </span>
      ),
    },
    {
      accessorKey: 'coach_name',
      header: '教练',
      size: 100,
      cell: ({ row }) => row.original.coach_name || '-',
    },
    {
      accessorKey: 'status',
      header: '状态',
      size: 90,
      cell: ({ row }) => (
        <span className={`badge ${getStatusBadge(row.original.status)}`}>
          {row.original.status}
        </span>
      ),
    },
    {
      accessorKey: 'notes',
      header: '备注',
      size: 150,
      cell: ({ row }) => row.original.notes || '-',
    },
    {
      id: 'actions',
      header: '操作',
      size: 150,
      cell: ({ row }) => (
        <div className="action-buttons">
          <button className="btn-sm btn-primary" onClick={() => handleEdit(row.original)}>
            编辑
          </button>
          <button className="btn-sm btn-danger" onClick={() => setDeleteId(row.original.id)}>
            删除
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="study-plans-container">
      <div className="page-header">
        <h2>学习计划管理</h2>
        <button className="btn-primary" onClick={handleAdd}>
          新增计划
        </button>
      </div>

      <div className="filter-section">
        <div className="filter-row">
          <input
            type="text"
            placeholder="搜索学员姓名/教练姓名"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="search-input"
          />

          <select value={planTypeFilter} onChange={(e) => setPlanTypeFilter(e.target.value)}>
            <option value="">全部类型</option>
            <option value="日常练车">日常练车</option>
            <option value="模拟考试">模拟考试</option>
            <option value="正式考试">正式考试</option>
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">全部状态</option>
            <option value="待完成">待完成</option>
            <option value="已完成">已完成</option>
            <option value="已取消">已取消</option>
          </select>

          <input
            type="date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            placeholder="开始日期"
          />

          <input
            type="date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            placeholder="结束日期"
          />
        </div>
      </div>

      <div className="table-container">
        <Table columns={columns} data={filteredPlans} loading={loading} />
      </div>

      <Pagination
        page={page}
        pages={pages}
        total={total}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />

      <Modal
        visible={showModal}
        title={editingPlan ? '编辑学习计划' : '新增学习计划'}
        onClose={() => setShowModal(false)}
        onConfirm={handleSubmit}
      >
        <div className="form-section">
          <div className="form-row">
            <div className="form-group">
              <label>学员 <span className="required">*</span></label>
              <select
                value={formData.student_id}
                onChange={(e) => setFormData({ ...formData, student_id: Number(e.target.value) })}
                required
                disabled={!!editingPlan}
              >
                <option value={0}>请选择学员</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.name} - {student.phone}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>计划类型 <span className="required">*</span></label>
              <select
                value={formData.plan_type}
                onChange={(e) => setFormData({ ...formData, plan_type: e.target.value as PlanType })}
                required
              >
                <option value="日常练车">日常练车</option>
                <option value="模拟考试">模拟考试</option>
                <option value="正式考试">正式考试</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>计划日期 <span className="required">*</span></label>
              <input
                type="date"
                value={formData.plan_date}
                onChange={(e) => setFormData({ ...formData, plan_date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>时间段</label>
              <input
                type="text"
                placeholder="如: 9:00-11:00"
                value={formData.time_slot}
                onChange={(e) => setFormData({ ...formData, time_slot: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>状态</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as PlanStatus })}
              >
                <option value="待完成">待完成</option>
                <option value="已完成">已完成</option>
                <option value="已取消">已取消</option>
              </select>
            </div>

            <div className="form-group">
              <label>提醒时间</label>
              <input
                type="datetime-local"
                value={formData.reminder_time}
                onChange={(e) => setFormData({ ...formData, reminder_time: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: '1 1 100%' }}>
              <label>备注</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        visible={deleteId !== null}
        title="确认删除"
        message="确定要删除这条学习计划吗？"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
