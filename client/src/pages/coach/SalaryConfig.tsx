import { useState, useEffect } from 'react';
import { salaryConfigService } from '../../services/salary';
import { SalaryConfig as SalaryConfigType, SalaryConfigFormData } from '../../types/salary';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { usePagination } from '../../hooks/usePagination';
import { ColumnDef } from '@tanstack/react-table';
import './SalaryConfig.css';

export default function SalaryConfig() {
  const [configs, setConfigs] = useState<SalaryConfigType[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SalaryConfigType | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingConfigId, setDeletingConfigId] = useState<number | null>(null);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const { limit, offset, total, page, pages, setLimit, setPage, setTotal } = usePagination();

  useEffect(() => {
    fetchConfigs();
  }, [limit, offset, keyword, typeFilter]);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const response = await salaryConfigService.getSalaryConfigs({
        limit,
        offset,
        keyword,
        config_type: typeFilter || undefined
      });
      setConfigs(response.data!.list);
      setTotal(response.data!.pagination.total);
    } catch (error) {
      console.error('获取工资配置列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingConfig(null);
    setShowModal(true);
  };

  const handleEdit = (config: SalaryConfig) => {
    setEditingConfig(config);
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    setDeletingConfigId(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!deletingConfigId) return;

    try {
      await salaryConfigService.deleteSalaryConfig(deletingConfigId);
      setShowDeleteDialog(false);
      setDeletingConfigId(null);
      fetchConfigs();
    } catch (error) {
      alert('删除失败');
    }
  };

  const columns: ColumnDef<SalaryConfigType>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      size: 80
    },
    {
      accessorKey: 'config_name',
      header: '配置名称',
      size: 150
    },
    {
      accessorKey: 'config_type',
      header: '配置类型',
      size: 150,
      cell: ({ row }) => {
        const typeMap: Record<string, string> = {
          'base_daily_salary': '基础日薪',
          'subject2_commission': '科目二提成',
          'subject3_commission': '科目三提成',
          'recruitment_commission': '招生提成'
        };
        return typeMap[row.original.config_type] || row.original.config_type;
      }
    },
    {
      accessorKey: 'amount',
      header: '金额',
      size: 100,
      cell: ({ row }) => `¥${Number(row.original.amount).toFixed(2)}`
    },
    {
      accessorKey: 'effective_date',
      header: '生效日期',
      size: 120,
      cell: ({ row }) => row.original.effective_date.split('T')[0]
    },
    {
      accessorKey: 'expiry_date',
      header: '失效日期',
      size: 120,
      cell: ({ row }) => row.original.expiry_date ? row.original.expiry_date.split('T')[0] : '长期有效'
    },
    {
      accessorKey: 'remarks',
      header: '备注',
      size: 200
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
    <div className="salary-config-container">
      <div className="page-header">
        <h2>工资配置</h2>
        <button className="btn-primary" onClick={handleAdd}>
          新增配置
        </button>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="搜索配置名称或备注"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="search-input"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="filter-select"
        >
          <option value="">全部类型</option>
          <option value="base_daily_salary">基础日薪</option>
          <option value="subject2_commission">科目二提成</option>
          <option value="subject3_commission">科目三提成</option>
          <option value="recruitment_commission">招生提成</option>
        </select>
      </div>

      <Table
        data={configs}
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
        <ConfigFormModal
          config={editingConfig}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchConfigs();
          }}
        />
      )}

      {showDeleteDialog && (
        <ConfirmDialog
          title="确认删除"
          message="确定要删除该工资配置吗？"
          visible={true}
          onConfirm={confirmDelete}
          onCancel={() => {
            setShowDeleteDialog(false);
            setDeletingConfigId(null);
          }}
        />
      )}
    </div>
  );
}

interface ConfigFormModalProps {
  config: SalaryConfigType | null;
  onClose: () => void;
  onSuccess: () => void;
}

function ConfigFormModal({ config, onClose, onSuccess }: ConfigFormModalProps) {
  const [formData, setFormData] = useState<SalaryConfigFormData>({
    config_name: config?.config_name || '',
    config_type: config?.config_type || 'base_daily_salary',
    amount: config?.amount || 0,
    effective_date: config?.effective_date ? config.effective_date.split('T')[0] : '',
    expiry_date: config?.expiry_date ? config.expiry_date.split('T')[0] : '',
    remarks: config?.remarks || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (config?.id) {
        await salaryConfigService.updateSalaryConfig(config.id, formData);
      } else {
        await salaryConfigService.createSalaryConfig(formData);
      }
      onSuccess();
    } catch (error) {
      alert(error instanceof Error ? error.message : '操作失败');
    }
  };

  return (
    <Modal
      title={config?.id ? '编辑工资配置' : '新建工资配置'}
      visible={true}
      onClose={onClose}
      onConfirm={handleSubmit}
      width={600}
    >
      <form onSubmit={handleSubmit} className="config-form">
        <div className="form-group">
          <label htmlFor="config_name">
            配置名称 <span className="required">*</span>
          </label>
          <input
            type="text"
            id="config_name"
            value={formData.config_name}
            onChange={(e) => setFormData({ ...formData, config_name: e.target.value })}
            required
            placeholder="请输入配置名称"
          />
        </div>

        <div className="form-group">
          <label htmlFor="config_type">
            配置类型 <span className="required">*</span>
          </label>
          <select
            id="config_type"
            value={formData.config_type}
            onChange={(e) => setFormData({ ...formData, config_type: e.target.value })}
            required
          >
            <option value="base_daily_salary">基础日薪</option>
            <option value="subject2_commission">科目二提成</option>
            <option value="subject3_commission">科目三提成</option>
            <option value="recruitment_commission">招生提成</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="amount">
            金额 <span className="required">*</span>
          </label>
          <input
            type="number"
            id="amount"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
            required
            min="0"
            step="0.01"
            placeholder="请输入金额"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="effective_date">
              生效日期 <span className="required">*</span>
            </label>
            <input
              type="date"
              id="effective_date"
              value={formData.effective_date}
              onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="expiry_date">失效日期</label>
            <input
              type="date"
              id="expiry_date"
              value={formData.expiry_date}
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              placeholder="不填则长期有效"
            />
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
      </form>
    </Modal>
  );
}
