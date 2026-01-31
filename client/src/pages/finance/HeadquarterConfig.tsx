import { useState, useEffect, useMemo } from 'react';
import { financeService, HeadquarterConfig, HeadquarterConfigFormData } from '../../services/finance';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import { ColumnDef } from '@tanstack/react-table';
import '../system/Students.css';

const CONFIG_TYPES = [
  { value: 'ratio', label: '比例' },
  { value: 'fixed', label: '固定金额' }
] as const;

interface ClassType {
  id: number;
  name: string;
  contract_amount: number;
}

const getConfigTypeLabel = (type: string) => {
  return type === 'ratio' ? '比例' : '固定金额';
};

export default function HeadquarterConfigPage() {
  const [configs, setConfigs] = useState<HeadquarterConfig[]>([]);
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeConfig, setActiveConfig] = useState<HeadquarterConfig | null>(null);
  
  // 分页状态
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<HeadquarterConfig | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [formData, setFormData] = useState<HeadquarterConfigFormData>({
    class_type_id: null,
    config_name: '',
    config_type: 'ratio',
    ratio: 0.3,
    fixed_amount: undefined,
    effective_date: new Date().toISOString().split('T')[0],
    expire_date: '',
    is_active: true,
    remark: ''
  });

  useEffect(() => {
    fetchConfigs();
    fetchActiveConfig();
    fetchClassTypes();
  }, []);

  // 计算分页数据
  const { paginatedConfigs, total, pages } = useMemo(() => {
    const total = configs.length;
    const pages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedConfigs = configs.slice(start, end);
    return { paginatedConfigs, total, pages };
  }, [configs, page, limit]);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const response = await financeService.getHeadquarterConfigs();
      if (response.data) {
        setConfigs(response.data);
      }
    } catch (error) {
      console.error('获取配置列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveConfig = async () => {
    try {
      const response = await financeService.getActiveHeadquarterConfig();
      setActiveConfig(response.data || null);
    } catch (error) {
      console.error('获取当前生效配置失败:', error);
    }
  };

  const fetchClassTypes = async () => {
    try {
      const response = await fetch('/api/class-types/list/enabled');
      const result = await response.json();
      if (result.success) {
        setClassTypes(result.data);
      }
    } catch (error) {
      console.error('获取班型列表失败:', error);
    }
  };

  const handleAdd = () => {
    setEditingConfig(null);
    setFormData({
      class_type_id: null,
      config_name: '',
      config_type: 'ratio',
      ratio: 0.3,
      fixed_amount: undefined,
      effective_date: new Date().toISOString().split('T')[0],
      expire_date: '',
      is_active: true,
      remark: ''
    });
    setShowModal(true);
  };

  const handleEdit = (config: HeadquarterConfig) => {
    setEditingConfig(config);
    setFormData({
      class_type_id: config.class_type_id || null,
      config_name: config.config_name,
      config_type: config.config_type,
      ratio: config.ratio,
      fixed_amount: config.fixed_amount,
      effective_date: config.effective_date.split('T')[0],
      expire_date: config.expire_date ? config.expire_date.split('T')[0] : '',
      is_active: config.is_active,
      remark: config.remark || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.config_name || !formData.effective_date) {
      alert('请填写配置名称和生效日期');
      return;
    }

    if (formData.config_type === 'ratio') {
      if (formData.ratio === undefined || formData.ratio < 0 || formData.ratio > 1) {
        alert('比例必须在0到1之间');
        return;
      }
    } else {
      if (formData.fixed_amount === undefined || formData.fixed_amount < 0) {
        alert('固定金额必须大于等于0');
        return;
      }
    }

    try {
      const submitData = {
        ...formData,
        expire_date: formData.expire_date || undefined
      };

      if (editingConfig) {
        await financeService.updateHeadquarterConfig(editingConfig.id, submitData);
        alert('配置更新成功');
      } else {
        await financeService.createHeadquarterConfig(submitData);
        alert('配置创建成功');
      }
      setShowModal(false);
      fetchConfigs();
      fetchActiveConfig();
    } catch (error: any) {
      console.error('保存配置失败:', error);
      alert(error.message || '保存配置失败');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await financeService.deleteHeadquarterConfig(deleteId);
      alert('配置删除成功');
      setDeleteId(null);
      fetchConfigs();
      fetchActiveConfig();
    } catch (error: any) {
      console.error('删除配置失败:', error);
      alert(error.message || '删除失败');
    }
  };

  const formatConfigValue = (config: HeadquarterConfig) => {
    if (config.config_type === 'ratio') {
      return `${(Number(config.ratio || 0) * 100).toFixed(2)}%`;
    } else {
      return `${Number(config.fixed_amount || 0).toFixed(2)} 元/人`;
    }
  };

  // 获取选中班型的合同金额
  const getSelectedClassTypeAmount = () => {
    if (!formData.class_type_id) return null;
    const classType = classTypes.find(ct => ct.id === formData.class_type_id);
    return classType ? classType.contract_amount : null;
  };

  const columns: ColumnDef<HeadquarterConfig, any>[] = [
    {
      header: '适用范围',
      size: 150,
      cell: ({ row }) => (
        <span className={`badge ${row.original.class_type_id ? 'badge-blue' : 'badge-purple'}`}>
          {row.original.class_type_name || '全局默认'}
        </span>
      ),
    },
    {
      header: '合同金额',
      size: 100,
      cell: ({ row }) => row.original.class_type_contract_amount 
        ? `¥${Number(row.original.class_type_contract_amount).toFixed(2)}`
        : '-',
    },
    {
      accessorKey: 'config_name',
      header: '配置名称',
      size: 150,
    },
    {
      accessorKey: 'config_type',
      header: '计算类型',
      size: 100,
      cell: ({ row }) => (
        <span className={`badge ${row.original.config_type === 'ratio' ? 'badge-green' : 'badge-orange'}`}>
          {getConfigTypeLabel(row.original.config_type)}
        </span>
      ),
    },
    {
      header: '上缴金额/比例',
      size: 120,
      cell: ({ row }) => formatConfigValue(row.original),
    },
    {
      accessorKey: 'effective_date',
      header: '生效日期',
      size: 110,
      cell: ({ row }) => row.original.effective_date.split('T')[0],
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

  return (
    <div className="students-page">
      <div className="page-header">
        <h1>总校上缴配置</h1>
        <div className="header-actions">
          <button onClick={handleAdd} className="btn btn-primary">
            新增配置
          </button>
        </div>
      </div>

      {/* 当前全局默认配置卡片 */}
      <div className="info-card" style={{ 
        background: '#f0f9ff', 
        border: '1px solid #91d5ff', 
        borderRadius: '8px', 
        padding: '16px', 
        marginBottom: '20px' 
      }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#1890ff' }}>全局默认配置</h3>
        {activeConfig ? (
          <div style={{ display: 'flex', gap: '30px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <span style={{ color: '#666' }}>配置名称：</span>
              <strong>{activeConfig.config_name}</strong>
            </div>
            <div>
              <span style={{ color: '#666' }}>计算方式：</span>
              <strong>{getConfigTypeLabel(activeConfig.config_type)}</strong>
            </div>
            <div>
              <span style={{ color: '#666' }}>上缴金额：</span>
              <strong style={{ color: '#f5222d', fontSize: '18px' }}>{formatConfigValue(activeConfig)}</strong>
            </div>
            <div>
              <span style={{ color: '#666' }}>生效日期：</span>
              <strong>{activeConfig.effective_date.split('T')[0]}</strong>
            </div>
          </div>
        ) : (
          <div style={{ color: '#ff4d4f' }}>
            当前没有生效的全局配置，未配置专属上缴规则的班型将不计算上缴金额
          </div>
        )}
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#888' }}>
          提示：班型专属配置优先级高于全局配置。若某班型设置了专属配置，则使用该配置；否则使用全局配置。
        </div>
      </div>

      <div className="search-panel">
        <div className="search-row">
          <button onClick={fetchConfigs} className="btn btn-primary">
            刷新列表
          </button>
        </div>
      </div>

      <div className="table-container">
        <Table columns={columns} data={paginatedConfigs} loading={loading} />
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

      {/* 配置编辑Modal */}
      <Modal
        title={editingConfig ? '编辑配置' : '新增配置'}
        visible={showModal}
        onClose={() => setShowModal(false)}
      >
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label>适用班型</label>
            <select
              value={formData.class_type_id || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                class_type_id: e.target.value ? Number(e.target.value) : null 
              })}
            >
              <option value="">全局默认（适用所有未单独配置的班型）</option>
              {classTypes.map(ct => (
                <option key={ct.id} value={ct.id}>
                  {ct.name} - 合同金额: ¥{Number(ct.contract_amount).toFixed(2)}
                </option>
              ))}
            </select>
            {getSelectedClassTypeAmount() !== null && (
              <small style={{ color: '#1890ff' }}>
                当前班型合同金额：¥{Number(getSelectedClassTypeAmount()).toFixed(2)}
              </small>
            )}
          </div>

          <div className="form-group">
            <label>配置名称 *</label>
            <input
              type="text"
              value={formData.config_name}
              onChange={(e) => setFormData({ ...formData, config_name: e.target.value })}
              required
              placeholder="如：C1班上缴配置"
            />
          </div>
          <div className="form-group">
            <label>计算类型 *</label>
            <select
              value={formData.config_type}
              onChange={(e) => setFormData({ 
                ...formData, 
                config_type: e.target.value as 'ratio' | 'fixed'
              })}
              required
            >
              {CONFIG_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          
          {formData.config_type === 'ratio' ? (
            <div className="form-group">
              <label>上缴比例 * （0-1之间，如0.3表示30%）</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={formData.ratio || ''}
                onChange={(e) => setFormData({ ...formData, ratio: parseFloat(e.target.value) || 0 })}
                required
                placeholder="如：0.30"
              />
              <small style={{ color: '#888' }}>
                当前比例：{((formData.ratio || 0) * 100).toFixed(2)}%
                {getSelectedClassTypeAmount() !== null && (
                  <span style={{ marginLeft: '10px', color: '#f5222d' }}>
                    预估上缴：¥{(Number(getSelectedClassTypeAmount()) * (formData.ratio || 0)).toFixed(2)}
                  </span>
                )}
              </small>
            </div>
          ) : (
            <div className="form-group">
              <label>固定金额 * （每位学员固定上缴金额）</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.fixed_amount || ''}
                onChange={(e) => setFormData({ ...formData, fixed_amount: parseFloat(e.target.value) || 0 })}
                required
                placeholder="如：1000.00"
              />
            </div>
          )}

          <div className="form-group">
            <label>生效日期 *</label>
            <input
              type="date"
              value={formData.effective_date}
              onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>失效日期（留空表示长期有效）</label>
            <input
              type="date"
              value={formData.expire_date}
              onChange={(e) => setFormData({ ...formData, expire_date: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>备注</label>
            <textarea
              value={formData.remark}
              onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              rows={3}
              placeholder="配置说明..."
            />
          </div>
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              <span>启用</span>
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
        title="确认删除"
        message="确定要删除此配置吗？此操作不可撤销。"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
