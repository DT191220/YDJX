import { useState, useEffect } from 'react';
import { operationExpenseService } from '../../services/operationExpense';
import { 
  ExpenseConfig, 
  ExpenseConfigFormData, 
  MonthlyExpense, 
  ExpenseSubject 
} from '../../types/operationExpense';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import { usePagination } from '../../hooks/usePagination';
import { ColumnDef } from '@tanstack/react-table';
import '../system/Students.css';

type TabType = 'config' | 'monthly';

export default function Expenses() {
  const [activeTab, setActiveTab] = useState<TabType>('config');
  
  // ========== 配置管理状态 ==========
  const [configs, setConfigs] = useState<ExpenseConfig[]>([]);
  const [configLoading, setConfigLoading] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ExpenseConfig | null>(null);
  const [deleteConfigId, setDeleteConfigId] = useState<number | null>(null);
  const [expenseSubjects, setExpenseSubjects] = useState<ExpenseSubject[]>([]);
  
  const [configForm, setConfigForm] = useState<ExpenseConfigFormData>({
    subject_code: '',
    expense_name: '',
    amount: 0,
    payment_day: 1,
    is_active: true,
    remark: ''
  });

  // ========== 月度支出状态 ==========
  const [monthlyExpenses, setMonthlyExpenses] = useState<MonthlyExpense[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [monthFilter, setMonthFilter] = useState(() => {
    return new Date().toISOString().slice(0, 7);
  });
  const [statusFilter, setStatusFilter] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateMonth, setGenerateMonth] = useState('');
  const [showPayModal, setShowPayModal] = useState(false);
  const [payingExpense, setPayingExpense] = useState<MonthlyExpense | null>(null);
  const [payRemark, setPayRemark] = useState('');
  const [showDeleteMonthlyModal, setShowDeleteMonthlyModal] = useState(false);
  const [deletingMonthlyId, setDeletingMonthlyId] = useState<number | null>(null);

  const { limit, offset, total, page, pages, setLimit, setPage, setTotal } = usePagination();

  // ========== 数据加载 ==========
  useEffect(() => {
    if (activeTab === 'config') {
      fetchConfigs();
      fetchExpenseSubjects();
    } else {
      fetchMonthlyExpenses();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'monthly') {
      setPage(1);
    }
  }, [monthFilter, statusFilter]);

  useEffect(() => {
    if (activeTab === 'monthly') {
      fetchMonthlyExpenses();
    }
  }, [limit, offset, monthFilter, statusFilter]);

  const fetchConfigs = async () => {
    setConfigLoading(true);
    try {
      const response = await operationExpenseService.getConfigs();
      if (response.data) {
        setConfigs(response.data);
      }
    } catch (error) {
      console.error('获取支出配置失败:', error);
    } finally {
      setConfigLoading(false);
    }
  };

  const fetchExpenseSubjects = async () => {
    try {
      const response = await operationExpenseService.getExpenseSubjects();
      if (response.data) {
        setExpenseSubjects(response.data);
      }
    } catch (error) {
      console.error('获取支出科目失败:', error);
    }
  };

  const fetchMonthlyExpenses = async () => {
    setMonthlyLoading(true);
    try {
      const response = await operationExpenseService.getMonthlyExpenses({
        expense_month: monthFilter || undefined,
        status: statusFilter || undefined,
        limit,
        offset
      });
      if (response.data) {
        setMonthlyExpenses(response.data.list);
        setTotal(response.data.pagination.total);
      }
    } catch (error) {
      console.error('获取月度支出失败:', error);
    } finally {
      setMonthlyLoading(false);
    }
  };

  // ========== 配置操作 ==========
  const handleAddConfig = () => {
    setEditingConfig(null);
    setConfigForm({
      subject_code: expenseSubjects[0]?.subject_code || '',
      expense_name: '',
      amount: 0,
      payment_day: 1,
      is_active: true,
      remark: ''
    });
    setShowConfigModal(true);
  };

  const handleEditConfig = (config: ExpenseConfig) => {
    setEditingConfig(config);
    setConfigForm({
      subject_code: config.subject_code,
      expense_name: config.expense_name,
      amount: config.amount,
      payment_day: config.payment_day,
      is_active: config.is_active,
      remark: config.remark || ''
    });
    setShowConfigModal(true);
  };

  const handleSaveConfig = async () => {
    if (!configForm.subject_code || !configForm.expense_name) {
      alert('请填写科目和名称');
      return;
    }
    
    try {
      if (editingConfig) {
        await operationExpenseService.updateConfig(editingConfig.id, configForm);
      } else {
        await operationExpenseService.createConfig(configForm);
      }
      setShowConfigModal(false);
      fetchConfigs();
    } catch (error: any) {
      alert(error.response?.data?.message || '保存失败');
    }
  };

  const handleDeleteConfig = async () => {
    if (!deleteConfigId) return;
    try {
      await operationExpenseService.deleteConfig(deleteConfigId);
      setDeleteConfigId(null);
      fetchConfigs();
    } catch (error: any) {
      alert(error.response?.data?.message || '删除失败');
    }
  };

  // ========== 月度支出操作 ==========
  const handleGenerate = () => {
    setGenerateMonth(monthFilter || new Date().toISOString().slice(0, 7));
    setShowGenerateModal(true);
  };

  const confirmGenerate = async () => {
    if (!generateMonth) {
      alert('请选择月份');
      return;
    }
    try {
      const response = await operationExpenseService.generateMonthly(generateMonth);
      alert(response.message || '生成成功');
      setShowGenerateModal(false);
      setMonthFilter(generateMonth);
      fetchMonthlyExpenses();
    } catch (error: any) {
      alert(error.response?.data?.message || '生成失败');
    }
  };

  const handlePay = (expense: MonthlyExpense) => {
    setPayingExpense(expense);
    setPayRemark('');
    setShowPayModal(true);
  };

  const confirmPay = async () => {
    if (!payingExpense) return;
    try {
      const response = await operationExpenseService.confirmPayment(payingExpense.id, payRemark);
      alert(`支付成功，已生成凭证: ${response.data?.voucher_no}`);
      setShowPayModal(false);
      setPayingExpense(null);
      fetchMonthlyExpenses();
    } catch (error: any) {
      alert(error.response?.data?.message || '支付失败');
    }
  };

  const handleDeleteMonthly = (id: number) => {
    setDeletingMonthlyId(id);
    setShowDeleteMonthlyModal(true);
  };

  const confirmDeleteMonthly = async () => {
    if (!deletingMonthlyId) return;
    try {
      await operationExpenseService.deleteMonthly(deletingMonthlyId);
      setShowDeleteMonthlyModal(false);
      setDeletingMonthlyId(null);
      fetchMonthlyExpenses();
    } catch (error: any) {
      alert(error.response?.data?.message || '删除失败');
    }
  };

  // ========== 表格列定义 ==========
  const configColumns: ColumnDef<ExpenseConfig>[] = [
    { accessorKey: 'id', header: 'ID', size: 60 },
    { accessorKey: 'expense_name', header: '支出名称', size: 150 },
    { 
      accessorKey: 'subject_code', 
      header: '关联科目', 
      size: 180,
      cell: ({ row }) => `${row.original.subject_code} - ${row.original.subject_name || ''}`
    },
    { 
      accessorKey: 'amount', 
      header: '每月金额', 
      size: 120,
      cell: ({ row }) => `¥${row.original.amount.toFixed(2)}`
    },
    { accessorKey: 'payment_day', header: '支付日', size: 80 },
    { 
      accessorKey: 'is_active', 
      header: '状态', 
      size: 80,
      cell: ({ row }) => (
        <span className={`status-tag ${row.original.is_active ? 'status-success' : 'status-disabled'}`}>
          {row.original.is_active ? '启用' : '停用'}
        </span>
      )
    },
    {
      id: 'actions',
      header: '操作',
      size: 150,
      cell: ({ row }) => (
        <div className="action-buttons">
          <button className="btn btn-info btn-sm" onClick={() => handleEditConfig(row.original)}>
            编辑
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfigId(row.original.id)}>
            删除
          </button>
        </div>
      )
    }
  ];

  const monthlyColumns: ColumnDef<MonthlyExpense>[] = [
    { accessorKey: 'expense_month', header: '月份', size: 100 },
    { accessorKey: 'expense_name', header: '支出名称', size: 150 },
    { 
      accessorKey: 'subject_code', 
      header: '科目', 
      size: 150,
      cell: ({ row }) => `${row.original.subject_code} - ${row.original.subject_name || ''}`
    },
    { 
      accessorKey: 'amount', 
      header: '金额', 
      size: 120,
      cell: ({ row }) => `¥${row.original.amount.toFixed(2)}`
    },
    { 
      accessorKey: 'status', 
      header: '状态', 
      size: 100,
      cell: ({ row }) => (
        <span className={`status-tag ${row.original.status === 'paid' ? 'status-success' : 'status-pending'}`}>
          {row.original.status === 'paid' ? '已支付' : '待支付'}
        </span>
      )
    },
    { 
      accessorKey: 'voucher_no', 
      header: '凭证号', 
      size: 130,
      cell: ({ row }) => row.original.voucher_no || '-'
    },
    {
      id: 'actions',
      header: '操作',
      size: 150,
      cell: ({ row }) => (
        <div className="action-buttons">
          {row.original.status === 'pending' ? (
            <>
              <button className="btn btn-primary btn-sm" onClick={() => handlePay(row.original)}>
                确认支付
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteMonthly(row.original.id)}>
                删除
              </button>
            </>
          ) : (
            <span className="text-muted">-</span>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>运营支出管理</h2>
      </div>

      {/* Tab切换 */}
      <div className="tab-container">
        <button 
          className={`tab-btn ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          支出配置
        </button>
        <button 
          className={`tab-btn ${activeTab === 'monthly' ? 'active' : ''}`}
          onClick={() => setActiveTab('monthly')}
        >
          月度支出
        </button>
      </div>

      {/* 支出配置Tab */}
      {activeTab === 'config' && (
        <div className="tab-content">
          <div className="toolbar">
            <button className="btn btn-primary" onClick={handleAddConfig}>
              新增配置
            </button>
          </div>

          <Table
            columns={configColumns}
            data={configs}
            loading={configLoading}
          />
        </div>
      )}

      {/* 月度支出Tab */}
      {activeTab === 'monthly' && (
        <div className="tab-content">
          <div className="filter-section">
            <div className="filter-row">
              <div className="filter-item">
                <label>月份</label>
                <input
                  type="month"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                />
              </div>
              <div className="filter-item">
                <label>状态</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">全部</option>
                  <option value="pending">待支付</option>
                  <option value="paid">已支付</option>
                </select>
              </div>
              <div className="filter-actions">
                <button className="btn btn-primary" onClick={handleGenerate}>
                  生成本月支出
                </button>
              </div>
            </div>
          </div>

          <Table
            columns={monthlyColumns}
            data={monthlyExpenses}
            loading={monthlyLoading}
          />

          <Pagination
            page={page}
            pages={pages}
            total={total}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </div>
      )}

      {/* 配置编辑弹窗 */}
      <Modal
        visible={showConfigModal}
        title={editingConfig ? '编辑支出配置' : '新增支出配置'}
        onClose={() => setShowConfigModal(false)}
        onConfirm={handleSaveConfig}
      >
        <div className="form-group">
          <label>支出科目 <span className="required">*</span></label>
          <select
            value={configForm.subject_code}
            onChange={(e) => setConfigForm({ ...configForm, subject_code: e.target.value })}
          >
            <option value="">请选择科目</option>
            {expenseSubjects.map(s => (
              <option key={s.subject_code} value={s.subject_code}>
                {s.subject_code} - {s.subject_name}
              </option>
            ))}
          </select>
          <p className="form-hint">仅显示"支出"类科目，如需新科目请先在科目管理中添加</p>
        </div>
        <div className="form-group">
          <label>支出名称 <span className="required">*</span></label>
          <input
            type="text"
            value={configForm.expense_name}
            onChange={(e) => setConfigForm({ ...configForm, expense_name: e.target.value })}
            placeholder="如：办公室租金"
          />
        </div>
        <div className="form-group">
          <label>每月金额 <span className="required">*</span></label>
          <input
            type="number"
            value={configForm.amount}
            onChange={(e) => setConfigForm({ ...configForm, amount: parseFloat(e.target.value) || 0 })}
            min="0"
            step="0.01"
          />
        </div>
        <div className="form-group">
          <label>每月支付日</label>
          <input
            type="number"
            value={configForm.payment_day}
            onChange={(e) => setConfigForm({ ...configForm, payment_day: parseInt(e.target.value) || 1 })}
            min="1"
            max="31"
          />
        </div>
        <div className="form-group">
          <label>状态</label>
          <select
            value={configForm.is_active ? 'true' : 'false'}
            onChange={(e) => setConfigForm({ ...configForm, is_active: e.target.value === 'true' })}
          >
            <option value="true">启用</option>
            <option value="false">停用</option>
          </select>
        </div>
        <div className="form-group">
          <label>备注</label>
          <textarea
            value={configForm.remark}
            onChange={(e) => setConfigForm({ ...configForm, remark: e.target.value })}
            rows={2}
          />
        </div>
      </Modal>

      {/* 删除配置确认 */}
      <ConfirmDialog
        visible={deleteConfigId !== null}
        title="确认删除"
        message="确定要删除此支出配置吗？如有关联记录将仅停用。"
        onConfirm={handleDeleteConfig}
        onCancel={() => setDeleteConfigId(null)}
      />

      {/* 生成月度支出弹窗 */}
      <Modal
        visible={showGenerateModal}
        title="生成月度支出"
        onClose={() => setShowGenerateModal(false)}
        onConfirm={confirmGenerate}
      >
        <div className="form-group">
          <label>选择月份</label>
          <input
            type="month"
            value={generateMonth}
            onChange={(e) => setGenerateMonth(e.target.value)}
          />
        </div>
        <p>将根据当前启用的支出配置生成该月度的支出记录。已存在的记录将被跳过。</p>
      </Modal>

      {/* 确认支付弹窗 */}
      <Modal
        visible={showPayModal}
        title="确认支付"
        onClose={() => setShowPayModal(false)}
        onConfirm={confirmPay}
      >
        {payingExpense && (
          <>
            <p><strong>支出项目:</strong> {payingExpense.expense_name}</p>
            <p><strong>支出金额:</strong> ¥{payingExpense.amount.toFixed(2)}</p>
            <p><strong>关联科目:</strong> {payingExpense.subject_code} - {payingExpense.subject_name}</p>
            <div className="form-group">
              <label>备注</label>
              <textarea
                value={payRemark}
                onChange={(e) => setPayRemark(e.target.value)}
                rows={2}
                placeholder="可选填写支付备注"
              />
            </div>
            <p className="form-hint">确认后将自动生成财务凭证（借:支出科目 贷:银行存款）</p>
          </>
        )}
      </Modal>

      {/* 删除月度记录确认 */}
      <ConfirmDialog
        visible={showDeleteMonthlyModal}
        title="确认删除"
        message="确定要删除此支出记录吗？已支付的记录不可删除。"
        onConfirm={confirmDeleteMonthly}
        onCancel={() => setShowDeleteMonthlyModal(false)}
      />
    </div>
  );
}
