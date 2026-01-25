import { useState, useEffect } from 'react';
import { examScheduleService, examVenueService } from '../../services/exam';
import { ExamSchedule, ExamScheduleFormData, ExamVenue, ExamType } from '../../types/exam';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { ColumnDef } from '@tanstack/react-table';
import { subscribe, EVENTS } from '../../utils/events';
import '../system/Students.css';

const EXAM_TYPES: ExamType[] = ['科目一', '科目二', '科目三', '科目四'];

export default function ExamSchedules() {
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [venues, setVenues] = useState<ExamVenue[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [examTypeFilter, setExamTypeFilter] = useState('');
  const [venueFilter, setVenueFilter] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ExamSchedule | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [formData, setFormData] = useState<ExamScheduleFormData>({
    exam_date: '',
    exam_type: '科目一',
    venue_id: 0,
    person_in_charge: '',
    notes: ''
  });

  useEffect(() => {
    fetchSchedules();
    fetchVenues();
    
    // 监听考试报名变更事件，自动刷新已报考人数
    const unsubscribe = subscribe(EVENTS.EXAM_REGISTRATION_CHANGED, () => {
      fetchSchedules();
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const response = await examScheduleService.getExamSchedules({
        start_date: startDate,
        end_date: endDate,
        exam_type: examTypeFilter,
        venue_id: venueFilter ? parseInt(venueFilter) : undefined
      });
      setSchedules(response.data || []);
    } catch (error) {
      console.error('获取考试安排列表失败:', error);
      alert('获取考试安排列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchVenues = async () => {
    try {
      const response = await examVenueService.getEnabledVenues();
      setVenues(response.data || []);
    } catch (error) {
      console.error('获取场地列表失败:', error);
    }
  };

  const handleSearch = () => {
    fetchSchedules();
  };

  const handleAdd = () => {
    setEditingSchedule(null);
    setFormData({
      exam_date: '',
      exam_type: '科目一',
      venue_id: venues.length > 0 ? venues[0].id : 0,
      person_in_charge: '',
      notes: ''
    });
    setShowModal(true);
  };

  const handleEdit = (schedule: ExamSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      exam_date: schedule.exam_date.split('T')[0],
      exam_type: schedule.exam_type,
      venue_id: schedule.venue_id,
      person_in_charge: schedule.person_in_charge || '',
      notes: schedule.notes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.exam_date) {
        alert('请选择考试日期');
        return;
      }

      if (!formData.venue_id || formData.venue_id === 0) {
        alert('请选择考试场地');
        return;
      }

      if (editingSchedule) {
        await examScheduleService.updateExamSchedule(editingSchedule.id, formData);
        alert('更新考试安排成功');
      } else {
        await examScheduleService.createExamSchedule(formData);
        alert('创建考试安排成功');
      }
      
      setShowModal(false);
      fetchSchedules();
    } catch (error: any) {
      console.error('保存考试安排失败:', error);
      alert(error.response?.data?.message || '保存考试安排失败');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await examScheduleService.deleteExamSchedule(deleteId);
      alert('删除考试安排成功');
      setDeleteId(null);
      fetchSchedules();
    } catch (error: any) {
      console.error('删除考试安排失败:', error);
      alert(error.response?.data?.message || '删除考试安排失败');
    }
  };

  const getExamTypeBadge = (type: ExamType) => {
    const colorMap: Record<ExamType, string> = {
      '科目一': 'badge-blue',
      '科目二': 'badge-green',
      '科目三': 'badge-orange',
      '科目四': 'badge-purple'
    };
    return colorMap[type] || 'badge-gray';
  };

  const columns: ColumnDef<ExamSchedule, any>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      size: 60,
    },
    {
      accessorKey: 'exam_date',
      header: '考试日期',
      size: 120,
      cell: ({ row }) => row.original.exam_date.split('T')[0],
    },
    {
      accessorKey: 'exam_type',
      header: '考试类型',
      size: 100,
      cell: ({ row }) => (
        <span className={`badge ${getExamTypeBadge(row.original.exam_type)}`}>
          {row.original.exam_type}
        </span>
      ),
    },
    {
      accessorKey: 'venue_name',
      header: '考试场地',
      size: 150,
      cell: ({ row }) => row.original.venue_name || '-',
    },
    {
      accessorKey: 'registered_count',
      header: '已报考人数',
      size: 100,
      cell: ({ row }) => row.original.registered_count ?? 0,
    },
    {
      accessorKey: 'person_in_charge',
      header: '负责人',
      size: 100,
      cell: ({ row }) => row.original.person_in_charge || '-',
    },
    {
      header: '操作',
      size: 200,
      cell: ({ row }) => (
        <div className="action-buttons">
          <button className="btn-primary" onClick={() => handleEdit(row.original)}>
            编辑
          </button>
          <button className="btn-danger" onClick={() => setDeleteId(row.original.id)}>
            删除
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="students-container">
      <div className="page-header">
        <h1>考试安排管理</h1>
        <button className="btn-primary" onClick={handleAdd}>
          新增考试安排
        </button>
      </div>

      <div className="filter-section">
        <div className="filter-row">
          <div className="filter-item">
            <label>开始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="filter-item">
            <label>结束日期</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="filter-item">
            <label>考试类型</label>
            <select value={examTypeFilter} onChange={(e) => setExamTypeFilter(e.target.value)}>
              <option value="">全部</option>
              {EXAM_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="filter-item">
            <label>考试场地</label>
            <select value={venueFilter} onChange={(e) => setVenueFilter(e.target.value)}>
              <option value="">全部</option>
              {venues.map(venue => (
                <option key={venue.id} value={venue.id}>{venue.name}</option>
              ))}
            </select>
          </div>
          <div className="filter-actions">
            <button className="btn-primary" onClick={handleSearch}>
              查询
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setExamTypeFilter('');
                setVenueFilter('');
              }}
            >
              重置
            </button>
          </div>
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading">加载中...</div>
        ) : (
          <Table columns={columns} data={schedules} />
        )}
      </div>

      <Modal
        visible={showModal}
        onClose={() => setShowModal(false)}
        title={editingSchedule ? '编辑考试安排' : '新增考试安排'}
      >
        <div className="form-container">
          <div className="form-group">
            <label>
              考试日期 <span className="required">*</span>
            </label>
            <input
              type="date"
              value={formData.exam_date}
              onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>
              考试类型 <span className="required">*</span>
            </label>
            <select
              value={formData.exam_type}
              onChange={(e) => setFormData({ ...formData, exam_type: e.target.value as ExamType })}
            >
              {EXAM_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>
              考试场地 <span className="required">*</span>
            </label>
            <select
              value={formData.venue_id}
              onChange={(e) => setFormData({ ...formData, venue_id: parseInt(e.target.value) })}
            >
              <option value={0}>请选择场地</option>
              {venues.map(venue => (
                <option key={venue.id} value={venue.id}>
                  {venue.name} {venue.address ? `- ${venue.address}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>负责人</label>
            <input
              type="text"
              value={formData.person_in_charge}
              onChange={(e) => setFormData({ ...formData, person_in_charge: e.target.value })}
              placeholder="请输入负责人姓名"
            />
          </div>

          <div className="form-group">
            <label>备注</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="请输入备注信息"
              rows={3}
            />
          </div>

          <div className="form-actions">
            <button className="btn-primary" onClick={handleSubmit}>
              确定
            </button>
            <button className="btn-secondary" onClick={() => setShowModal(false)}>
              取消
            </button>
          </div>
        </div>
      </Modal>

      {deleteId !== null && (
        <ConfirmDialog
          visible={true}
          title="确认删除"
          message="确定要删除这个考试安排吗？如果已有学员报名，将无法删除。"
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
