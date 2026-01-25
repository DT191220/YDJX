import { useState, useEffect } from 'react';
import { paymentService, classTypeService } from '../../services/payment';
import { studentService } from '../../services/student';
import { financeService, HeadquarterConfig } from '../../services/finance';
import { StudentPaymentInfo, PaymentRecord, PaymentMethod, ClassType } from '../../types/payment';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { usePagination } from '../../hooks/usePagination';
import { useDict } from '../../hooks/useDict';
import { ColumnDef } from '@tanstack/react-table';
import '../system/Students.css';

// 上缴确认信息接口
interface SubmitConfirmInfo {
  student: StudentPaymentInfo;
  config: HeadquarterConfig | null;
  finalReceipt: number;      // 最终实收 = 实收金额 + 账户余额
  submitAmount: number;       // 上缴金额
  profit: number;            // 利润 = 最终实收 - 上缴金额
}

export default function StudentPayment() {
  const [students, setStudents] = useState<StudentPaymentInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRecordsModal, setShowRecordsModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentPaymentInfo | null>(null);
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [deletePaymentId, setDeletePaymentId] = useState<number | null>(null);
  const [submitConfirmInfo, setSubmitConfirmInfo] = useState<SubmitConfirmInfo | null>(null);
  const [submitConfirmLoading, setSubmitConfirmLoading] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: '现金' as PaymentMethod,
    operator: '',
    notes: ''
  });

  const [refundForm, setRefundForm] = useState({
    amount: '',
    operator: '',
    notes: ''
  });

  const [discountForm, setDiscountForm] = useState({
    amount: '',
    operator: '',
    notes: ''
  });

  const { limit, offset, total, setTotal, page, pages, setPage, setLimit } = usePagination();

  // 使用字典获取下拉选项
  const { options: paymentStatusOptions } = useDict('payment_status');
  const { options: paymentMethodOptions } = useDict('payment_method');

  useEffect(() => {
    fetchStudents();
    fetchClassTypes();
  }, [limit, offset, keyword, paymentStatusFilter]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await studentService.getStudents({
        limit,
        offset,
        keyword,
        status: '', // 不传入特定状态,在后端过滤
        sortBy: 'id',
        sortOrder: 'desc'
      });
      
      // 前端过滤：排除"咨询中"和"预约报名"状态的学员
      const filteredStudents = response.data!.list.filter(
        student => student.status !== '咨询中' && student.status !== '预约报名'
      );
      
      setStudents(filteredStudents);
      // 注意：这里total仍使用后端返回的总数，如需精确统计需要后端支持
      setTotal(response.data!.pagination.total);
    } catch (error) {
      console.error('获取学员列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClassTypes = async () => {
    try {
      const response = await classTypeService.getEnabledClassTypes();
      setClassTypes(response.data);
    } catch (error) {
      console.error('获取班型列表失败:', error);
    }
  };

  const fetchPaymentRecords = async (studentId: number) => {
    try {
      const response = await paymentService.getPaymentsByStudent(studentId);
      setPaymentRecords(response.data);
    } catch (error) {
      console.error('获取缴费记录失败:', error);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchStudents();
  };

  const handleAddPayment = (student: StudentPaymentInfo) => {
    setSelectedStudent(student);
    setPaymentForm({
      amount: '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: '现金',
      operator: '',
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const handleViewRecords = async (student: StudentPaymentInfo) => {
    setSelectedStudent(student);
    await fetchPaymentRecords(student.id);
    setShowRecordsModal(true);
  };

  const handleRefund = (student: StudentPaymentInfo) => {
    setSelectedStudent(student);
    setRefundForm({
      amount: '',
      operator: '',
      notes: ''
    });
    setShowRefundModal(true);
  };

  const handleDiscount = (student: StudentPaymentInfo) => {
    setSelectedStudent(student);
    setDiscountForm({
      amount: '',
      operator: '',
      notes: ''
    });
    setShowDiscountModal(true);
  };

  // 上缴确认功能
  const handleSubmitConfirm = async (student: StudentPaymentInfo) => {
    setSubmitConfirmLoading(true);
    try {
      // 获取该学员班型对应的上缴配置
      let config: HeadquarterConfig | null = null;
      
      if (student.class_type_id) {
        // 先尝试获取班型专属配置
        const response = await financeService.getActiveHeadquarterConfig(student.class_type_id);
        config = response.data || null;
      }
      
      // 如果没有班型专属配置，获取全局默认配置
      if (!config) {
        const response = await financeService.getActiveHeadquarterConfig();
        config = response.data || null;
      }
      
      // 计算最终实收 = 实收金额 + 账户余额
      const actualAmount = parseFloat(student.actual_amount || '0');
      const accountBalance = parseFloat(student.account_balance || '0');
      const finalReceipt = actualAmount + accountBalance;
      
      // 计算上缴金额
      let submitAmount = 0;
      if (config) {
        if (config.config_type === 'ratio') {
          // 按比例计算：使用合同金额 * 比例
          const contractAmount = parseFloat(student.contract_amount || '0');
          submitAmount = contractAmount * Number(config.ratio || 0);
        } else {
          // 固定金额
          submitAmount = Number(config.fixed_amount || 0);
        }
      }
      
      // 计算利润 = 最终实收 - 上缴金额
      const profit = finalReceipt - submitAmount;
      
      setSubmitConfirmInfo({
        student,
        config,
        finalReceipt,
        submitAmount,
        profit
      });
      setShowSubmitConfirmModal(true);
    } catch (error) {
      console.error('获取上缴配置失败:', error);
      alert('获取上缴配置失败');
    } finally {
      setSubmitConfirmLoading(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStudent) return;

    if (!paymentForm.amount || !paymentForm.operator) {
      alert('请填写缴费金额和经办人');
      return;
    }

    try {
      await paymentService.createPayment({
        student_id: selectedStudent.id,
        amount: parseFloat(paymentForm.amount),
        payment_date: paymentForm.payment_date,
        payment_method: paymentForm.payment_method,
        operator: paymentForm.operator,
        notes: paymentForm.notes
      });

      alert('缴费记录创建成功');
      setShowPaymentModal(false);
      fetchStudents();
    } catch (error: any) {
      console.error('创建缴费记录失败:', error);
      alert(error.response?.data?.message || '创建缴费记录失败');
    }
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStudent) return;

    const refundAmount = parseFloat(refundForm.amount);
    const actualAmount = parseFloat(selectedStudent.actual_amount || 0);

    if (!refundForm.amount || !refundForm.operator) {
      alert('请填写退费金额和经办人');
      return;
    }

    if (isNaN(refundAmount) || refundAmount <= 0) {
      alert('退费金额必须大于0');
      return;
    }

    if (refundAmount > actualAmount) {
      alert(`退费金额不能超过实收金额 ¥${actualAmount.toFixed(2)}`);
      return;
    }

    try {
      await paymentService.refundPayment({
        student_id: selectedStudent.id,
        amount: refundAmount,
        operator: refundForm.operator,
        notes: refundForm.notes
      });

      alert('退费成功');
      setShowRefundModal(false);
      fetchStudents();
    } catch (error: any) {
      console.error('退费失败:', error);
      alert(error.response?.data?.message || '退费失败');
    }
  };

  const handleDiscountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStudent) return;

    const discountAmount = parseFloat(discountForm.amount);
    const actualAmount = parseFloat(selectedStudent.actual_amount || 0);

    if (!discountForm.amount || !discountForm.operator) {
      alert('请填写减免金额和经办人');
      return;
    }

    if (isNaN(discountAmount) || discountAmount <= 0) {
      alert('减免金额必须大于0');
      return;
    }

    if (discountAmount > actualAmount) {
      alert(`减免金额不能超过实收金额 ¥${actualAmount.toFixed(2)}`);
      return;
    }

    try {
      await paymentService.discountPayment({
        student_id: selectedStudent.id,
        amount: discountAmount,
        operator: discountForm.operator,
        notes: discountForm.notes
      });

      alert('减免成功');
      setShowDiscountModal(false);
      fetchStudents();
    } catch (error: any) {
      console.error('减免失败:', error);
      alert(error.response?.data?.message || '减免失败');
    }
  };

  const handleDeletePayment = async () => {
    if (!deletePaymentId) return;

    try {
      await paymentService.deletePayment(deletePaymentId);
      alert('缴费记录删除成功');
      setDeletePaymentId(null);
      if (selectedStudent) {
        await fetchPaymentRecords(selectedStudent.id);
      }
      fetchStudents();
    } catch (error: any) {
      console.error('删除缴费记录失败:', error);
      alert(error.response?.data?.message || '删除缴费记录失败');
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusMap: { [key: string]: string } = {
      '未缴费': 'badge-gray',
      '部分缴费': 'badge-yellow',
      '已缴费': 'badge-green',
      '已退费': 'badge-purple'
    };
    return statusMap[status] || 'badge-gray';
  };

  const columns: ColumnDef<StudentPaymentInfo, any>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      size: 60,
    },
    {
      accessorKey: 'name',
      header: '姓名',
      size: 100,
    },
    {
      accessorKey: 'phone',
      header: '手机号',
      size: 120,
    },
    {
      accessorKey: 'class_type_name',
      header: '报名班型',
      size: 100,
      cell: ({ row }) => row.original.class_type_name || '-',
    },
    {
      accessorKey: 'contract_amount',
      header: '合同金额',
      size: 100,
      cell: ({ row }) => `¥${parseFloat(row.original.contract_amount || 0).toFixed(2)}`,
    },
    {
      accessorKey: 'discount_amount',
      header: '减免金额',
      size: 100,
      cell: ({ row }) => `¥${parseFloat(row.original.discount_amount || 0).toFixed(2)}`,
    },
    {
      accessorKey: 'payable_amount',
      header: '应缴金额',
      size: 100,
      cell: ({ row }) => {
        const payable = parseFloat(row.original.contract_amount || 0) - parseFloat(row.original.discount_amount || 0);
        return (
          <span style={{ fontWeight: 'bold', color: '#409eff' }}>
            ¥{payable.toFixed(2)}
          </span>
        );
      },
    },
    {
      accessorKey: 'actual_amount',
      header: '实收金额',
      size: 100,
      cell: ({ row }) => `¥${parseFloat(row.original.actual_amount || 0).toFixed(2)}`,
    },
    {
      accessorKey: 'debt_amount',
      header: '欠费金额',
      size: 100,
      cell: ({ row }) => {
        const debt = parseFloat(row.original.debt_amount || 0);
        const paymentStatus = row.original.payment_status;
        
        // 已退费学员显示 "-"，避免字段类型问题
        if (paymentStatus === '已退费') {
          return (
            <span style={{ color: '#909399' }}>
              -
            </span>
          );
        }
        
        return (
          <span style={{ fontWeight: 'bold', color: debt > 0 ? '#f56c6c' : '#67c23a' }}>
            ¥{debt.toFixed(2)}
          </span>
        );
      },
    },
    {
      accessorKey: 'account_balance',
      header: '账户余额',
      size: 100,
      cell: ({ row }) => {
        const balance = parseFloat(row.original.account_balance || 0);
        return (
          <span style={{ fontWeight: 'bold', color: balance > 0 ? '#409eff' : '#909399' }}>
            ¥{balance.toFixed(2)}
          </span>
        );
      },
    },
    {
      accessorKey: 'payment_status',
      header: '缴费状态',
      size: 100,
      cell: ({ row }) => (
        <span className={`badge ${getPaymentStatusBadge(row.original.payment_status)}`}>
          {row.original.payment_status}
        </span>
      ),
    },
    {
      header: '操作',
      size: 350,
      cell: ({ row }) => (
        <div className="action-buttons">
          <button
            onClick={() => handleAddPayment(row.original)}
            className="btn btn-primary btn-sm"
            disabled={row.original.payment_status === '已退费'}
          >
            添加缴费
          </button>
          <button
            onClick={() => handleViewRecords(row.original)}
            className="btn btn-info btn-sm"
          >
            缴费记录
          </button>
          <button
            onClick={() => handleDiscount(row.original)}
            className="btn btn-success btn-sm"
            disabled={row.original.payment_status === '已退费' || parseFloat(row.original.actual_amount || 0) === 0}
          >
            减免
          </button>
          <button
            onClick={() => handleRefund(row.original)}
            className="btn btn-warning btn-sm"
            disabled={row.original.payment_status === '已退费' || parseFloat(row.original.actual_amount || 0) === 0}
          >
            退费
          </button>
          <button
            onClick={() => handleSubmitConfirm(row.original)}
            className="btn btn-sm"
            style={{ backgroundColor: '#722ed1', color: '#fff' }}
            disabled={submitConfirmLoading}
          >
            上缴确认
          </button>
        </div>
      ),
    },
  ];

  const recordColumns: ColumnDef<PaymentRecord, any>[] = [
    {
      accessorKey: 'payment_date',
      header: '缴费日期',
      size: 120,
    },
    {
      accessorKey: 'amount',
      header: '缴费金额',
      size: 100,
      cell: ({ row }) => `¥${parseFloat(row.original.amount).toFixed(2)}`,
    },
    {
      accessorKey: 'payment_method',
      header: '缴费方式',
      size: 100,
    },
    {
      accessorKey: 'operator',
      header: '经办人',
      size: 100,
    },
    {
      accessorKey: 'notes',
      header: '备注',
      size: 150,
      cell: ({ row }) => row.original.notes || '-',
    },
    {
      header: '操作',
      size: 80,
      cell: ({ row }) => (
        <button
          onClick={() => setDeletePaymentId(row.original.id)}
          className="btn btn-danger btn-sm"
        >
          删除
        </button>
      ),
    },
  ];

  return (
    <div className="students-page">
      <div className="page-header">
        <h1>报名与缴费</h1>
        <div className="header-actions">
          <button onClick={handleSearch} className="btn btn-primary">
            刷新
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
              placeholder="姓名/手机/身份证号"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div className="search-item">
            <label>缴费状态</label>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
            >
              <option value="">全部</option>
              {paymentStatusOptions.map(opt => (
                <option key={opt.dict_value} value={opt.dict_value}>{opt.dict_label}</option>
              ))}
            </select>
          </div>
          <button onClick={handleSearch} className="btn btn-primary">
            查询
          </button>
        </div>
      </div>

      <div className="table-container">
        <Table columns={columns} data={students} loading={loading} />
      </div>

      <Pagination
        page={page}
        pages={pages}
        total={total}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />

      {/* 添加缴费记录Modal */}
      <Modal
        title={`添加缴费记录 - ${selectedStudent?.name}`}
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
      >
        <form onSubmit={handlePaymentSubmit} className="form">
          <div className="form-group">
            <label>缴费金额 *</label>
            <input
              type="number"
              step="0.01"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>缴费日期 *</label>
            <input
              type="date"
              value={paymentForm.payment_date}
              onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>缴费方式 *</label>
            <select
              value={paymentForm.payment_method}
              onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value as PaymentMethod })}
              required
            >
              {paymentMethodOptions.map(opt => (
                <option key={opt.dict_value} value={opt.dict_value}>{opt.dict_label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>经办人 *</label>
            <input
              type="text"
              value={paymentForm.operator}
              onChange={(e) => setPaymentForm({ ...paymentForm, operator: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>备注</label>
            <textarea
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              rows={3}
            />
          </div>
          <div className="form-actions">
            <button type="button" onClick={() => setShowPaymentModal(false)} className="btn btn-default">
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              确定
            </button>
          </div>
        </form>
      </Modal>

      {/* 缴费记录列表Modal */}
      <Modal
        title={`缴费记录 - ${selectedStudent?.name}`}
        visible={showRecordsModal}
        onClose={() => setShowRecordsModal(false)}
        width="800px"
      >
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <strong>合同金额：</strong>
              <span>¥{parseFloat(selectedStudent?.contract_amount || 0).toFixed(2)}</span>
            </div>
            <div>
              <strong>减免金额：</strong>
              <span>¥{parseFloat(selectedStudent?.discount_amount || 0).toFixed(2)}</span>
            </div>
            <div>
              <strong>实收金额：</strong>
              <span>¥{parseFloat(selectedStudent?.actual_amount || 0).toFixed(2)}</span>
            </div>
            <div>
              <strong>欠费金额：</strong>
              <span style={{ color: parseFloat(selectedStudent?.debt_amount || 0) > 0 ? '#f56c6c' : '#67c23a' }}>
                ¥{parseFloat(selectedStudent?.debt_amount || 0).toFixed(2)}
              </span>
            </div>
            <div>
              <strong>账户余额：</strong>
              <span style={{ color: parseFloat(selectedStudent?.account_balance || 0) > 0 ? '#409eff' : '#909399' }}>
                ¥{parseFloat(selectedStudent?.account_balance || 0).toFixed(2)}
              </span>
            </div>
            <div>
              <strong>缴费状态：</strong>
              <span className={`badge ${getPaymentStatusBadge(selectedStudent?.payment_status || '')}`}>
                {selectedStudent?.payment_status}
              </span>
            </div>
          </div>
        </div>
        <Table columns={recordColumns} data={paymentRecords} />
      </Modal>

      {/* 退费Modal */}
      <Modal
        title={`退费 - ${selectedStudent?.name}`}
        visible={showRefundModal}
        onClose={() => setShowRefundModal(false)}
      >
        <form onSubmit={handleRefundSubmit} className="form">
          <div style={{ marginBottom: '16px', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '14px' }}>
              <div>
                <strong>合同金额：</strong>
                <span>¥{parseFloat(selectedStudent?.contract_amount || 0).toFixed(2)}</span>
              </div>
              <div>
                <strong>当前实收金额：</strong>
                <span style={{ color: '#409eff', fontWeight: 'bold' }}>
                  ¥{parseFloat(selectedStudent?.actual_amount || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>退费金额 *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={parseFloat(selectedStudent?.actual_amount || 0)}
              value={refundForm.amount}
              onChange={(e) => {
                const value = e.target.value;
                // 只允许输入数字和小数点
                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                  setRefundForm({ ...refundForm, amount: value });
                }
              }}
              required
              placeholder="请输入退费金额"
            />
            <small style={{ color: '#999', display: 'block', marginTop: '4px' }}>
              最大可退费金额：¥{parseFloat(selectedStudent?.actual_amount || 0).toFixed(2)}
            </small>
          </div>

          <div className="form-group">
            <label>经办人 *</label>
            <input
              type="text"
              value={refundForm.operator}
              onChange={(e) => setRefundForm({ ...refundForm, operator: e.target.value })}
              required
              placeholder="请输入经办人姓名"
            />
          </div>

          <div className="form-group">
            <label>备注</label>
            <textarea
              value={refundForm.notes}
              onChange={(e) => setRefundForm({ ...refundForm, notes: e.target.value })}
              placeholder="请输入退费备注信息"
              rows={3}
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => setShowRefundModal(false)} className="btn-cancel">
              取消
            </button>
            <button type="submit" className="btn btn-warning">
              确认退费
            </button>
          </div>
        </form>
      </Modal>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        visible={!!deletePaymentId}
        title="确认删除"
        message="删除缴费记录后，学员的实收金额和欠费金额将自动回退。确定要删除吗？"
        onConfirm={handleDeletePayment}
        onCancel={() => setDeletePaymentId(null)}
      />

      {/* 减免Modal */}
      <Modal
        title={`减免 - ${selectedStudent?.name}`}
        visible={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
      >
        <form onSubmit={handleDiscountSubmit} className="form">
          <div style={{ marginBottom: '16px', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '14px' }}>
              <div>
                <strong>合同金额：</strong>
                <span>¥{parseFloat(selectedStudent?.contract_amount || 0).toFixed(2)}</span>
              </div>
              <div>
                <strong>当前实收金额：</strong>
                <span style={{ color: '#409eff', fontWeight: 'bold' }}>
                  ¥{parseFloat(selectedStudent?.actual_amount || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>减免金额 *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={parseFloat(selectedStudent?.actual_amount || 0)}
              value={discountForm.amount}
              onChange={(e) => {
                const value = e.target.value;
                // 只允许输入数字和小数点
                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                  setDiscountForm({ ...discountForm, amount: value });
                }
              }}
              required
              placeholder="请输入减免金额"
            />
            <small style={{ color: '#999', display: 'block', marginTop: '4px' }}>
              最大可减免金额：¥{parseFloat(selectedStudent?.actual_amount || 0).toFixed(2)}
            </small>
            <small style={{ color: '#e6a23c', display: 'block', marginTop: '4px' }}>
              减免后实收金额 = 当前实收金额 - 减免金额
            </small>
          </div>

          <div className="form-group">
            <label>经办人 *</label>
            <input
              type="text"
              value={discountForm.operator}
              onChange={(e) => setDiscountForm({ ...discountForm, operator: e.target.value })}
              required
              placeholder="请输入经办人姓名"
            />
          </div>

          <div className="form-group">
            <label>备注</label>
            <textarea
              value={discountForm.notes}
              onChange={(e) => setDiscountForm({ ...discountForm, notes: e.target.value })}
              placeholder="请输入减免原因或备注信息"
              rows={3}
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => setShowDiscountModal(false)} className="btn-cancel">
              取消
            </button>
            <button type="submit" className="btn btn-success">
              确认减免
            </button>
          </div>
        </form>
      </Modal>

      {/* 上缴确认Modal */}
      <Modal
        title={`上缴确认 - ${submitConfirmInfo?.student.name}`}
        visible={showSubmitConfirmModal}
        onClose={() => setShowSubmitConfirmModal(false)}
        width="500px"
      >
        {submitConfirmInfo && (
          <div style={{ padding: '10px 0' }}>
            {/* 学员基本信息 */}
            <div style={{ marginBottom: '20px', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>学员信息</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '14px' }}>
                <div><strong>姓名：</strong>{submitConfirmInfo.student.name}</div>
                <div><strong>班型：</strong>{submitConfirmInfo.student.class_type_name || '-'}</div>
                <div><strong>合同金额：</strong>¥{parseFloat(submitConfirmInfo.student.contract_amount || '0').toFixed(2)}</div>
                <div><strong>实收金额：</strong>¥{parseFloat(submitConfirmInfo.student.actual_amount || '0').toFixed(2)}</div>
                <div><strong>账户余额：</strong>¥{parseFloat(submitConfirmInfo.student.account_balance || '0').toFixed(2)}</div>
                <div><strong>减免金额：</strong>¥{parseFloat(submitConfirmInfo.student.discount_amount || '0').toFixed(2)}</div>
              </div>
            </div>

            {/* 上缴配置信息 */}
            <div style={{ marginBottom: '20px', padding: '12px', background: '#e6f7ff', borderRadius: '4px', border: '1px solid #91d5ff' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#1890ff' }}>上缴配置</h4>
              {submitConfirmInfo.config ? (
                <div style={{ fontSize: '14px' }}>
                  <div style={{ marginBottom: '4px' }}>
                    <strong>配置名称：</strong>{submitConfirmInfo.config.config_name}
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    <strong>适用范围：</strong>
                    <span className={`badge ${submitConfirmInfo.config.class_type_id ? 'badge-blue' : 'badge-purple'}`} style={{ marginLeft: '4px' }}>
                      {submitConfirmInfo.config.class_type_name || '全局默认'}
                    </span>
                  </div>
                  <div>
                    <strong>计算方式：</strong>
                    {submitConfirmInfo.config.config_type === 'ratio' 
                      ? `按比例 ${(Number(submitConfirmInfo.config.ratio || 0) * 100).toFixed(2)}%`
                      : `固定金额 ¥${Number(submitConfirmInfo.config.fixed_amount || 0).toFixed(2)}`
                    }
                  </div>
                </div>
              ) : (
                <div style={{ color: '#ff4d4f' }}>未配置上缴规则</div>
              )}
            </div>

            {/* 利润计算结果 */}
            <div style={{ padding: '16px', background: '#f6ffed', borderRadius: '8px', border: '2px solid #52c41a' }}>
              <h4 style={{ margin: '0 0 16px 0', color: '#52c41a', textAlign: 'center' }}>利润核算</h4>
              <div style={{ fontSize: '14px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>最终实收（实收金额 + 账户余额）：</span>
                  <strong style={{ color: '#1890ff' }}>¥{submitConfirmInfo.finalReceipt.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>总校上缴金额：</span>
                  <strong style={{ color: '#f5222d' }}>- ¥{submitConfirmInfo.submitAmount.toFixed(2)}</strong>
                </div>
                <div style={{ borderTop: '1px dashed #ccc', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 'bold' }}>报名费利润：</span>
                  <strong style={{ 
                    fontSize: '20px', 
                    color: submitConfirmInfo.profit >= 0 ? '#52c41a' : '#f5222d' 
                  }}>
                    ¥{submitConfirmInfo.profit.toFixed(2)}
                  </strong>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button 
                onClick={() => setShowSubmitConfirmModal(false)} 
                className="btn btn-primary"
                style={{ padding: '8px 40px' }}
              >
                确定
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
