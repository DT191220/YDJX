import { useState, useEffect } from 'react';
import { studentProgressService } from '../../services/exam';
import { StudentExamProgress, SubjectStatus } from '../../types/exam';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import { usePagination } from '../../hooks/usePagination';
import { ColumnDef } from '@tanstack/react-table';
import './StudentProgress.css';

export default function StudentProgress() {
  const [progressList, setProgressList] = useState<StudentExamProgress[]>([]);
  const [filteredList, setFilteredList] = useState<StudentExamProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [subject1Filter, setSubject1Filter] = useState('');
  const [subject2Filter, setSubject2Filter] = useState('');
  const [subject3Filter, setSubject3Filter] = useState('');
  const [subject4Filter, setSubject4Filter] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editingProgress, setEditingProgress] = useState<StudentExamProgress | null>(null);

  const [formData, setFormData] = useState({
    subject1_status: '未考' as SubjectStatus,
    subject1_pass_date: '',
    subject2_status: '未考' as SubjectStatus,
    subject2_pass_date: '',
    subject3_status: '未考' as SubjectStatus,
    subject3_pass_date: '',
    subject4_status: '未考' as SubjectStatus,
    subject4_pass_date: '',
  });

  const { limit, offset, total, setTotal, page, pages, setPage, setLimit } = usePagination();

  useEffect(() => {
    fetchProgress();
  }, []);

  useEffect(() => {
    filterAndPaginate();
  }, [progressList, keyword, subject1Filter, subject2Filter, subject3Filter, subject4Filter, offset, limit]);

  const fetchProgress = async () => {
    setLoading(true);
    try {
      const response = await studentProgressService.getStudentProgress();
      setProgressList(response.data || []);
    } catch (error) {
      console.error('获取学员进度失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndPaginate = () => {
    let filtered = [...progressList];

    if (keyword) {
      filtered = filtered.filter(item =>
        item.student_name?.includes(keyword) ||
        item.student_phone?.includes(keyword) ||
        item.student_id_card?.includes(keyword)
      );
    }

    if (subject1Filter) filtered = filtered.filter(item => item.subject1_status === subject1Filter);
    if (subject2Filter) filtered = filtered.filter(item => item.subject2_status === subject2Filter);
    if (subject3Filter) filtered = filtered.filter(item => item.subject3_status === subject3Filter);
    if (subject4Filter) filtered = filtered.filter(item => item.subject4_status === subject4Filter);

    setTotal(filtered.length);
    setFilteredList(filtered.slice(offset, offset + limit));
  };

  const handleEdit = (progress: StudentExamProgress) => {
    setEditingProgress(progress);
    setFormData({
      subject1_status: progress.subject1_status,
      subject1_pass_date: progress.subject1_pass_date?.split('T')[0] || '',
      subject2_status: progress.subject2_status,
      subject2_pass_date: progress.subject2_pass_date?.split('T')[0] || '',
      subject3_status: progress.subject3_status,
      subject3_pass_date: progress.subject3_pass_date?.split('T')[0] || '',
      subject4_status: progress.subject4_status,
      subject4_pass_date: progress.subject4_pass_date?.split('T')[0] || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!editingProgress) return;

    try {
      await studentProgressService.updateStudentProgress(editingProgress.id, formData);
      alert('更新学员进度成功');
      setShowModal(false);
      fetchProgress();
    } catch (error: any) {
      alert('更新学员进度失败: ' + (error.response?.data?.message || error.message));
    }
  };

  const getStatusBadge = (status: SubjectStatus) => {
    const badges: Record<SubjectStatus, string> = {
      '未考': 'badge-default',
      '已通过': 'badge-success',
      '未通过': 'badge-danger'
    };
    return badges[status] || 'badge-default';
  };

  const getWarningIcon = (failedCount: number) => {
    if (failedCount >= 5) return '❌';
    if (failedCount === 4) return '⚠️';
    if (failedCount === 3) return '⚡';
    return '';
  };

  const getWarningClass = (failedCount: number) => {
    if (failedCount >= 5) return 'warning-critical';
    if (failedCount === 4) return 'warning-high';
    if (failedCount === 3) return 'warning-medium';
    return '';
  };

  const columns: ColumnDef<StudentExamProgress>[] = [
    {
      accessorKey: 'student_name',
      header: '学员姓名',
      size: 100,
      cell: ({ row }) => (
        <div>
          {row.original.student_name}
          {row.original.exam_qualification === 'disqualified' && (
            <span className="disqualified-badge">废考</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'student_phone',
      header: '手机号码',
      size: 120,
    },
    {
      accessorKey: 'license_type',
      header: '驾照类型',
      size: 80,
    },
    {
      accessorKey: 'subject1_status',
      header: '科目一',
      size: 120,
      cell: ({ row }) => (
        <div className="subject-cell">
          <span className={`badge ${getStatusBadge(row.original.subject1_status)}`}>
            {row.original.subject1_status}
          </span>
          <div className="exam-stats">
            <span className="exam-count">考{row.original.subject1_total_count}次</span>
            {row.original.subject1_failed_count > 0 && (
              <span className={`failed-count ${getWarningClass(row.original.subject1_failed_count)}`}>
                {getWarningIcon(row.original.subject1_failed_count)}连挂{row.original.subject1_failed_count}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'subject2_status',
      header: '科目二',
      size: 120,
      cell: ({ row }) => (
        <div className="subject-cell">
          <span className={`badge ${getStatusBadge(row.original.subject2_status)}`}>
            {row.original.subject2_status}
          </span>
          <div className="exam-stats">
            <span className="exam-count">考{row.original.subject2_total_count}次</span>
            {row.original.subject2_failed_count > 0 && (
              <span className={`failed-count ${getWarningClass(row.original.subject2_failed_count)}`}>
                {getWarningIcon(row.original.subject2_failed_count)}连挂{row.original.subject2_failed_count}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'subject3_status',
      header: '科目三',
      size: 120,
      cell: ({ row }) => (
        <div className="subject-cell">
          <span className={`badge ${getStatusBadge(row.original.subject3_status)}`}>
            {row.original.subject3_status}
          </span>
          <div className="exam-stats">
            <span className="exam-count">考{row.original.subject3_total_count}次</span>
            {row.original.subject3_failed_count > 0 && (
              <span className={`failed-count ${getWarningClass(row.original.subject3_failed_count)}`}>
                {getWarningIcon(row.original.subject3_failed_count)}连挂{row.original.subject3_failed_count}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'subject4_status',
      header: '科目四',
      size: 120,
      cell: ({ row }) => (
        <div className="subject-cell">
          <span className={`badge ${getStatusBadge(row.original.subject4_status)}`}>
            {row.original.subject4_status}
          </span>
          <div className="exam-stats">
            <span className="exam-count">考{row.original.subject4_total_count}次</span>
            {row.original.subject4_failed_count > 0 && (
              <span className={`failed-count ${getWarningClass(row.original.subject4_failed_count)}`}>
                {getWarningIcon(row.original.subject4_failed_count)}连挂{row.original.subject4_failed_count}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'total_progress',
      header: '总进度',
      size: 100,
      cell: ({ row }) => (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${row.original.total_progress}%` }}>
            {row.original.total_progress}%
          </div>
        </div>
      ),
    },
    {
      id: 'actions',
      header: '操作',
      size: 100,
      cell: ({ row }) => (
        <div className="action-buttons">
          <button className="btn-sm btn-primary" onClick={() => handleEdit(row.original)}>
            更新进度
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="student-progress-container">
      <div className="page-header">
        <h2>学员学习进度</h2>
      </div>

      <div className="filter-section">
        <div className="filter-row">
          <input
            type="text"
            placeholder="搜索学员姓名/手机号/身份证"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="search-input"
          />
          
          <select value={subject1Filter} onChange={(e) => setSubject1Filter(e.target.value)}>
            <option value="">全部科目一</option>
            <option value="未考">未考</option>
            <option value="已通过">已通过</option>
            <option value="未通过">未通过</option>
          </select>

          <select value={subject2Filter} onChange={(e) => setSubject2Filter(e.target.value)}>
            <option value="">全部科目二</option>
            <option value="未考">未考</option>
            <option value="已通过">已通过</option>
            <option value="未通过">未通过</option>
          </select>

          <select value={subject3Filter} onChange={(e) => setSubject3Filter(e.target.value)}>
            <option value="">全部科目三</option>
            <option value="未考">未考</option>
            <option value="已通过">已通过</option>
            <option value="未通过">未通过</option>
          </select>

          <select value={subject4Filter} onChange={(e) => setSubject4Filter(e.target.value)}>
            <option value="">全部科目四</option>
            <option value="未考">未考</option>
            <option value="已通过">已通过</option>
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
        title="更新学员考试进度"
        onClose={() => setShowModal(false)}
        onConfirm={handleSubmit}
      >
        <div className="form-section">
          <div className="form-row">
            <label>学员姓名：{editingProgress?.student_name}</label>
          </div>

          <div className="form-group-title">科目一</div>
          <div className="form-row">
            <div className="form-group">
              <label>状态 <span className="required">*</span></label>
              <select
                value={formData.subject1_status}
                onChange={(e) => setFormData({ ...formData, subject1_status: e.target.value as SubjectStatus })}
                required
              >
                <option value="未考">未考</option>
                <option value="已通过">已通过</option>
                <option value="未通过">未通过</option>
              </select>
            </div>
            {formData.subject1_status === '已通过' && (
              <div className="form-group">
                <label>通过日期</label>
                <input
                  type="date"
                  value={formData.subject1_pass_date}
                  onChange={(e) => setFormData({ ...formData, subject1_pass_date: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="form-group-title">科目二</div>
          <div className="form-row">
            <div className="form-group">
              <label>状态 <span className="required">*</span></label>
              <select
                value={formData.subject2_status}
                onChange={(e) => setFormData({ ...formData, subject2_status: e.target.value as SubjectStatus })}
                required
              >
                <option value="未考">未考</option>
                <option value="已通过">已通过</option>
                <option value="未通过">未通过</option>
              </select>
            </div>
            {formData.subject2_status === '已通过' && (
              <div className="form-group">
                <label>通过日期</label>
                <input
                  type="date"
                  value={formData.subject2_pass_date}
                  onChange={(e) => setFormData({ ...formData, subject2_pass_date: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="form-group-title">科目三</div>
          <div className="form-row">
            <div className="form-group">
              <label>状态 <span className="required">*</span></label>
              <select
                value={formData.subject3_status}
                onChange={(e) => setFormData({ ...formData, subject3_status: e.target.value as SubjectStatus })}
                required
              >
                <option value="未考">未考</option>
                <option value="已通过">已通过</option>
                <option value="未通过">未通过</option>
              </select>
            </div>
            {formData.subject3_status === '已通过' && (
              <div className="form-group">
                <label>通过日期</label>
                <input
                  type="date"
                  value={formData.subject3_pass_date}
                  onChange={(e) => setFormData({ ...formData, subject3_pass_date: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="form-group-title">科目四</div>
          <div className="form-row">
            <div className="form-group">
              <label>状态 <span className="required">*</span></label>
              <select
                value={formData.subject4_status}
                onChange={(e) => setFormData({ ...formData, subject4_status: e.target.value as SubjectStatus })}
                required
              >
                <option value="未考">未考</option>
                <option value="已通过">已通过</option>
                <option value="未通过">未通过</option>
              </select>
            </div>
            {formData.subject4_status === '已通过' && (
              <div className="form-group">
                <label>通过日期</label>
                <input
                  type="date"
                  value={formData.subject4_pass_date}
                  onChange={(e) => setFormData({ ...formData, subject4_pass_date: e.target.value })}
                />
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
