import { useState, useEffect } from 'react';
import { classTypeService, serviceConfigService } from '../../services/payment';
import { ClassType, ClassTypeFormData, ServiceConfigFormData, Subject, ClassTypeStatus } from '../../types/payment';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { usePagination } from '../../hooks/usePagination';
import { ColumnDef } from '@tanstack/react-table';
import '../system/Students.css';

const SUBJECTS: Subject[] = ['科目一', '科目二', '科目三', '科目四'];

export default function ClassTypes() {
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingClassType, setEditingClassType] = useState<ClassType | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [formData, setFormData] = useState<ClassTypeFormData>({
    name: '',
    contract_amount: 0,
    description: '',
    status: '启用'
  });

  const [serviceConfigs, setServiceConfigs] = useState<ServiceConfigFormData[]>([
    { subject: '科目一', service_content: '', is_included: 1 },
    { subject: '科目二', service_content: '', is_included: 1 },
    { subject: '科目三', service_content: '', is_included: 1 },
    { subject: '科目四', service_content: '', is_included: 1 },
  ]);

  const { limit, offset, total, setTotal, page, pages, setPage, setLimit } = usePagination();

  useEffect(() => {
    fetchClassTypes();
  }, [limit, offset, keyword, statusFilter]);

  const fetchClassTypes = async () => {
    setLoading(true);
    try {
      const response = await classTypeService.getClassTypes({
        limit,
        offset,
        keyword,
        status: statusFilter
      });
      if (response.data) {
        setClassTypes(response.data.list || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      console.error('获取班型列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchClassTypes();
  };

  const handleAdd = () => {
    setEditingClassType(null);
    setFormData({
      name: '',
      contract_amount: 0,
      description: '',
      status: '启用'
    });
    setShowModal(true);
  };

  const handleEdit = (classType: ClassType) => {
    setEditingClassType(classType);
    setFormData({
      name: classType.name,
      contract_amount: classType.contract_amount,
      description: classType.description || '',
      status: classType.status
    });
    setShowModal(true);
  };

  const handleConfigService = async (classType: ClassType) => {
    setEditingClassType(classType);
    
    // 获取已有的服务配置
    try {
      const response = await serviceConfigService.getServiceConfigsByClassType(classType.id);
      const existingConfigs = response.data;
      
      // 初始化服务配置表单，如果已有配置则使用，否则使用空配置
      const configs = SUBJECTS.map(subject => {
        const existing = existingConfigs.find((c: any) => c.subject === subject);
        return existing ? {
          subject,
          service_content: existing.service_content,
          is_included: existing.is_included
        } : {
          subject,
          service_content: '',
          is_included: 1
        };
      });
      
      setServiceConfigs(configs);
      setShowServiceModal(true);
    } catch (error) {
      console.error('获取服务配置失败:', error);
      alert('获取服务配置失败');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.contract_amount) {
      alert('请填写班型名称和合同金额');
      return;
    }

    try {
      if (editingClassType) {
        await classTypeService.updateClassType(editingClassType.id, formData);
        alert('班型更新成功');
      } else {
        await classTypeService.createClassType(formData);
        alert('班型创建成功');
      }
      setShowModal(false);
      fetchClassTypes();
    } catch (error: any) {
      console.error('保存班型失败:', error);
      alert(error.response?.data?.message || '保存班型失败');
    }
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingClassType) return;

    try {
      await serviceConfigService.batchSaveServiceConfigs(editingClassType.id, serviceConfigs);
      alert('服务配置保存成功');
      setShowServiceModal(false);
    } catch (error: any) {
      console.error('保存服务配置失败:', error);
      alert(error.response?.data?.message || '保存服务配置失败');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await classTypeService.deleteClassType(deleteId);
      alert('班型删除成功');
      setDeleteId(null);
      fetchClassTypes();
    } catch (error: any) {
      console.error('删除班型失败:', error);
      alert(error.response?.data?.message || '删除失败');
    }
  };

  const getStatusBadge = (status: string) => {
    return status === '启用' ? 'badge-green' : 'badge-gray';
  };

  const columns: ColumnDef<ClassType, any>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      size: 60,
    },
    {
      accessorKey: 'name',
      header: '班型名称',
      size: 120,
    },
    {
      accessorKey: 'contract_amount',
      header: '合同金额',
      size: 100,
      cell: ({ row }) => `¥${Number(row.original.contract_amount).toFixed(2)}`,
    },
    {
      accessorKey: 'description',
      header: '描述',
      size: 200,
      cell: ({ row }) => row.original.description || '-',
    },
    {
      accessorKey: 'status',
      header: '状态',
      size: 80,
      cell: ({ row }) => (
        <span className={`badge ${getStatusBadge(row.original.status)}`}>
          {row.original.status}
        </span>
      ),
    },
    {
      header: '操作',
      size: 200,
      cell: ({ row }) => (
        <div className="action-buttons">
          <button
            onClick={() => handleEdit(row.original)}
            className="btn btn-primary btn-sm"
          >
            编辑
          </button>
          <button
            onClick={() => handleConfigService(row.original)}
            className="btn btn-info btn-sm"
          >
            服务配置
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
        <h1>班型管理</h1>
        <div className="header-actions">
          <button onClick={handleAdd} className="btn btn-primary">
            新建班型
          </button>
        </div>
      </div>

      <div className="search-panel">
        <div className="search-row">
          <div className="search-item">
            <label>关键字搜索</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="班型名称或描述"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div className="search-item">
            <label>状态</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">全部</option>
              <option value="启用">启用</option>
              <option value="禁用">禁用</option>
            </select>
          </div>
          <button onClick={handleSearch} className="btn btn-primary">
            查询
          </button>
        </div>
      </div>

      <div className="table-container">
        <Table columns={columns} data={classTypes} loading={loading} />
      </div>

      <Pagination
        page={page}
        pages={pages}
        total={total}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />

      {/* 班型编辑Modal */}
      <Modal
        title={editingClassType ? '编辑班型' : '新建班型'}
        visible={showModal}
        onClose={() => setShowModal(false)}
      >
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label>班型名称 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>合同金额 *</label>
            <input
              type="number"
              step="0.01"
              value={formData.contract_amount}
              onChange={(e) => setFormData({ ...formData, contract_amount: parseFloat(e.target.value) })}
              required
            />
          </div>
          <div className="form-group">
            <label>描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>状态 *</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as ClassTypeStatus })}
              required
            >
              <option value="启用">启用</option>
              <option value="禁用">禁用</option>
            </select>
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

      {/* 服务配置Modal */}
      <Modal
        title={`服务配置 - ${editingClassType?.name}`}
        visible={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        width="700px"
      >
        <form onSubmit={handleServiceSubmit} className="form">
          {serviceConfigs.map((config, index) => (
            <div key={config.subject} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
              <h4 style={{ marginBottom: '10px' }}>{config.subject}</h4>
              <div className="form-group">
                <label>服务内容</label>
                <textarea
                  value={config.service_content}
                  onChange={(e) => {
                    const newConfigs = [...serviceConfigs];
                    newConfigs[index].service_content = e.target.value;
                    setServiceConfigs(newConfigs);
                  }}
                  rows={3}
                  placeholder={`请输入${config.subject}的服务内容`}
                />
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={config.is_included === 1}
                    onChange={(e) => {
                      const newConfigs = [...serviceConfigs];
                      newConfigs[index].is_included = e.target.checked ? 1 : 0;
                      setServiceConfigs(newConfigs);
                    }}
                  />
                  <span>包含此科目服务</span>
                </label>
              </div>
            </div>
          ))}
          <div className="form-actions">
            <button type="button" onClick={() => setShowServiceModal(false)} className="btn btn-default">
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              保存配置
            </button>
          </div>
        </form>
      </Modal>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        visible={!!deleteId}
        title="确认删除"
        message="删除班型后，相关的服务配置也会被删除。如果有学员使用该班型，将无法删除。确定要删除吗？"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
