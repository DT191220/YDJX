import { useState, useEffect } from 'react';
import { examRegistrationService, examScheduleService, studentProgressService } from '../../services/exam';
import { studentService } from '../../services/student';
import { ExamRegistration, ExamSchedule, ExamResultUpdateData } from '../../types/exam';
import { Student } from '../../types/student';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { usePagination } from '../../hooks/usePagination';
import { ColumnDef } from '@tanstack/react-table';
import './ExamRegistrations.css';

export default function ExamRegistrations() {
  const [registrations, setRegistrations] = useState<ExamRegistration[]>([]);
  const [filteredList, setFilteredList] = useState<ExamRegistration[]>([]);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  
  const [keyword, setKeyword] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [editingRegistration, setEditingRegistration] = useState<ExamRegistration | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    student_id: 0,
    exam_schedule_id: 0,
    notes: '',
  });

  const [resultData, setResultData] = useState<ExamResultUpdateData>({
    exam_result: '通过',
    exam_score: '',
    notes: '',
  });

  const { limit, offset, total, setTotal, page, pages, setPage, setLimit } = usePagination();

  useEffect(() => {
    fetchRegistrations();
    fetchStudents();
    fetchSchedules();
  }, []);

  useEffect(() => {
    filterAndPaginate();
  }, [registrations, keyword, resultFilter, offset, limit]);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const response = await examRegistrationService.getExamRegistrations();
      setRegistrations(response.data || []);
    } catch (error) {
      console.error('获取考试报名列表失败:', error);
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

  const fetchSchedules = async () => {
    try {
      const response = await examScheduleService.getExamSchedules();
      setSchedules(response.data || []);
    } catch (error) {
      console.error('获取考试安排列表失败:', error);
    }
  };

  const filterAndPaginate = () => {
    let filtered = [...registrations];

    if (keyword) {
      filtered = filtered.filter(item =>
        item.student_name?.includes(keyword) ||
        item.student_phone?.includes(keyword)
      );
    }

    if (resultFilter) {
      filtered = filtered.filter(item => item.exam_result === resultFilter);
    }

    setTotal(filtered.length);
    setFilteredList(filtered.slice(offset, offset + limit));
  };

  const handleAdd = () => {
    setFormData({
      student_id: 0,
      exam_schedule_id: 0,
      notes: '',
    });
    setShowModal(true);
  };

  const handleUpdateResult = (registration: ExamRegistration) => {
    setEditingRegistration(registration);
    setResultData({
      exam_result: registration.exam_result === '待考试' ? '通过' : registration.exam_result,
      exam_score: registration.exam_score || '',
      notes: registration.notes || '',
    });
    setShowResultModal(true);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.student_id || formData.student_id === 0) {
        alert('请选择学员');
        return;
      }

      if (!formData.exam_schedule_id || formData.exam_schedule_id === 0) {
        alert('请选择考试安排');
        return;
      }

      // 检查学员资格
      const student = students.find(s => s.id === formData.student_id);
      if (student?.status === '废考') {
        alert('该学员已废考,无法报名考试');
        return;
      }

      const schedule = schedules.find(s => s.id === formData.exam_schedule_id);
      if (schedule) {
        const eligibility = await studentProgressService.checkEligibility(
          formData.student_id,
          schedule.exam_type
        );
        
        if (!eligibility.data?.eligible) {
          alert(eligibility.data?.reason || '该学员不符合报考条件');
          return;
        }
      }

      await examRegistrationService.createExamRegistration(formData);
      alert('考试报名成功');
      setShowModal(false);
      fetchRegistrations();
    } catch (error: any) {
      alert('操作失败: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleSubmitResult = async () => {
    if (!editingRegistration) return;

    try {
      await examRegistrationService.updateExamResult(editingRegistration.id, resultData);
      alert('更新考试结果成功');
      setShowResultModal(false);
      fetchRegistrations();
    } catch (error: any) {
      alert('操作失败: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await examRegistrationService.deleteExamRegistration(deleteId);
      alert('删除考试报名成功');
      setDeleteId(null);
      fetchRegistrations();
    } catch (error: any) {
      alert('删除失败: ' + (error.response?.data?.message || error.message));
    }
  };

  const getResultBadge = (result: string) => {
    const badges: Record<string, string> = {
      '待考试': 'badge-default',
      '通过': 'badge-success',
      '未通过': 'badge-danger'
    };
    return badges[result] || 'badge-default';
  };

  const columns: ColumnDef<ExamRegistration>[] = [
    {
      accessorKey: 'student_name',
      header: '学员姓名',
      size: 100,
    },
    {
      accessorKey: 'student_phone',
      header: '手机号码',
      size: 120,
    },
    {
      accessorKey: 'exam_date',
      header: '考试日期',
      size: 110,
      cell: ({ row }) => row.original.exam_date?.split('T')[0] || '-',
    },
    {
      accessorKey: 'exam_type',
      header: '考试科目',
      size: 90,
    },
    {
      accessorKey: 'venue_name',
      header: '考试场地',
      size: 120,
      cell: ({ row }) => row.original.venue_name || '-',
    },
    {
      accessorKey: 'exam_result',
      header: '考试结果',
      size: 90,
      cell: ({ row }) => (
        <span className={`badge ${getResultBadge(row.original.exam_result)}`}>
          {row.original.exam_result}
        </span>
      ),
    },
    {
      accessorKey: 'exam_score',
      header: '考试成绩',
      size: 90,
      cell: ({ row }) => row.original.exam_score || '-',
    },
    {
      id: 'actions',
      header: '操作',
      size: 180,
      cell: ({ row }) => (
        <div className="action-buttons">
          <button className="btn-sm btn-primary" onClick={() => handleUpdateResult(row.original)}>
            录入成绩
          </button>
          <button className="btn-sm btn-danger" onClick={() => setDeleteId(row.original.id)}>
            删除
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="exam-registrations-container">
      <div className="page-header">
        <h2>学员考试管理</h2>
        <button className="btn-primary" onClick={handleAdd}>
          新增报名
        </button>
      </div>

      <div className="filter-section">
        <div className="filter-row">
          <input
            type="text"
            placeholder="搜索学员姓名/手机号"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="search-input"
          />

          <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value)}>
            <option value="">全部结果</option>
            <option value="待考试">待考试</option>
            <option value="通过">通过</option>
            <option value="未通过">未通过</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <Table columns={columns} data={filteredList} loading={loading} />
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
        title="新增考试报名"
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
              >
                <option value={0}>请选择学员</option>
                {students.filter(s => s.status !== '废考').map(student => (
                  <option key={student.id} value={student.id}>
                    {student.name} - {student.phone}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>考试安排 <span className="required">*</span></label>
              <select
                value={formData.exam_schedule_id}
                onChange={(e) => setFormData({ ...formData, exam_schedule_id: Number(e.target.value) })}
                required
              >
                <option value={0}>请选择考试安排</option>
                {schedules.map(schedule => (
                  <option key={schedule.id} value={schedule.id}>
                    {schedule.exam_date.split('T')[0]} - {schedule.exam_type} - {schedule.venue_name}
                  </option>
                ))}
              </select>
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

      <Modal
        visible={showResultModal}
        title="录入考试成绩"
        onClose={() => setShowResultModal(false)}
        onConfirm={handleSubmitResult}
      >
        <div className="form-section">
          <div className="form-row">
            <label>学员: {editingRegistration?.student_name}</label>
          </div>
          <div className="form-row">
            <label>科目: {editingRegistration?.exam_type}</label>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>考试结果 <span className="required">*</span></label>
              <select
                value={resultData.exam_result}
                onChange={(e) => setResultData({ ...resultData, exam_result: e.target.value as '通过' | '未通过' })}
                required
              >
                <option value="通过">通过</option>
                <option value="未通过">未通过</option>
              </select>
            </div>

            <div className="form-group">
              <label>考试成绩</label>
              <input
                type="text"
                value={resultData.exam_score}
                onChange={(e) => setResultData({ ...resultData, exam_score: e.target.value })}
                placeholder="如: 95分"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: '1 1 100%' }}>
              <label>备注</label>
              <textarea
                value={resultData.notes}
                onChange={(e) => setResultData({ ...resultData, notes: e.target.value })}
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
        message="确定要删除这条考试报名记录吗？"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
