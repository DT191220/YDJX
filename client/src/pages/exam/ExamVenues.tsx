import { useState, useEffect, useMemo } from 'react';
import { examVenueService } from '../../services/exam';
import { ExamVenue, ExamVenueFormData } from '../../types/exam';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import { ColumnDef } from '@tanstack/react-table';
import '../system/Students.css';

export default function ExamVenues() {
  const [venues, setVenues] = useState<ExamVenue[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // 分页状态
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  
  const [showModal, setShowModal] = useState(false);
  const [editingVenue, setEditingVenue] = useState<ExamVenue | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [formData, setFormData] = useState<ExamVenueFormData>({
    name: '',
    address: '',
    is_active: true
  });

  useEffect(() => {
    fetchVenues();
  }, [keyword, statusFilter]);

  // 筛选条件变化时重置到第一页
  useEffect(() => {
    setPage(1);
  }, [keyword, statusFilter]);

  // 计算分页数据
  const { paginatedVenues, total, pages } = useMemo(() => {
    const total = venues.length;
    const pages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedVenues = venues.slice(start, end);
    return { paginatedVenues, total, pages };
  }, [venues, page, limit]);

  const fetchVenues = async () => {
    setLoading(true);
    try {
      const response = await examVenueService.getExamVenues({
        keyword,
        is_active: statusFilter
      });
      setVenues(response.data || []);
    } catch (error) {
      console.error('获取考试场地列表失败:', error);
      alert('获取考试场地列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchVenues();
  };

  const handleAdd = () => {
    setEditingVenue(null);
    setFormData({
      name: '',
      address: '',
      is_active: true
    });
    setShowModal(true);
  };

  const handleEdit = (venue: ExamVenue) => {
    setEditingVenue(venue);
    setFormData({
      name: venue.name,
      address: venue.address || '',
      is_active: venue.is_active
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name.trim()) {
        alert('请输入场地名称');
        return;
      }

      if (editingVenue) {
        await examVenueService.updateExamVenue(editingVenue.id, formData);
        alert('更新考试场地成功');
      } else {
        await examVenueService.createExamVenue(formData);
        alert('创建考试场地成功');
      }
      
      setShowModal(false);
      fetchVenues();
    } catch (error: any) {
      console.error('保存考试场地失败:', error);
      alert(error.response?.data?.message || '保存考试场地失败');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await examVenueService.deleteExamVenue(deleteId);
      alert('删除考试场地成功');
      setDeleteId(null);
      fetchVenues();
    } catch (error: any) {
      console.error('删除考试场地失败:', error);
      alert(error.response?.data?.message || '删除考试场地失败');
    }
  };

  const columns: ColumnDef<ExamVenue, any>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      size: 80,
    },
    {
      accessorKey: 'name',
      header: '场地名称',
      size: 150,
    },
    {
      accessorKey: 'address',
      header: '场地地址',
      size: 250,
      cell: ({ row }) => row.original.address || '-',
    },
    {
      accessorKey: 'is_active',
      header: '状态',
      size: 100,
      cell: ({ row }) => (
        <span className={`badge ${row.original.is_active ? 'badge-green' : 'badge-gray'}`}>
          {row.original.is_active ? '启用' : '禁用'}
        </span>
      ),
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
        <h1>考试场地配置</h1>
        <button className="btn-primary" onClick={handleAdd}>
          新增场地
        </button>
      </div>

      <div className="filter-section">
        <div className="filter-row">
          <div className="filter-item">
            <label>关键字</label>
            <input
              type="text"
              placeholder="场地名称或地址"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div className="filter-item">
            <label>状态</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">全部</option>
              <option value="true">启用</option>
              <option value="false">禁用</option>
            </select>
          </div>
          <div className="filter-actions">
            <button className="btn-primary" onClick={handleSearch}>
              查询
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setKeyword('');
                setStatusFilter('');
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
          <>
            <Table columns={columns} data={paginatedVenues} />
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
          </>
        )}
      </div>

      <Modal
        visible={showModal}
        onClose={() => setShowModal(false)}
        title={editingVenue ? '编辑考试场地' : '新增考试场地'}
      >
        <div className="form-container">
          <div className="form-group">
            <label>
              场地名称 <span className="required">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="请输入场地名称"
            />
          </div>

          <div className="form-group">
            <label>场地地址</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="请输入场地地址"
            />
          </div>

          <div className="form-group">
            <label>状态</label>
            <select
              value={formData.is_active ? 'true' : 'false'}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
            >
              <option value="true">启用</option>
              <option value="false">禁用</option>
            </select>
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
          message="确定要删除这个考试场地吗？如果该场地已有考试安排，将无法删除。"
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
