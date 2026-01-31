import { useState, useEffect } from 'react';
import { paymentService } from '../../services/payment';
import { studentService } from '../../services/student';
import { financeService, HeadquarterConfig } from '../../services/finance';
import { StudentPaymentInfo, PaymentRecord, PaymentMethod } from '../../types/payment';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { usePagination } from '../../hooks/usePagination';
import { useDict } from '../../hooks/useDict';
import { ColumnDef } from '@tanstack/react-table';
import '../system/Students.css';

// 辅助函数：安全转换金额为数字
const toNumber = (value: number | string | undefined | null): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
};

// 上缴确认信息接口
interface SubmitConfirmInfo {
  student: StudentPaymentInfo;
  config: HeadquarterConfig | null;
  finalReceipt: number;      // 最终实收 = 实收金额 + 账户余额
  submitAmount: number;       // 上缴金额
  profit: number;            // 利润 = 最终实收 - 上缴金额
}

// 上缴表单
interface SubmitForm {
  operator: string;
  remark: string;
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
  const [deletePaymentId, setDeletePaymentId] = useState<number | null>(null);
  const [submitConfirmInfo, setSubmitConfirmInfo] = useState<SubmitConfirmInfo | null>(null);
  const [submitConfirmLoading, setSubmitConfirmLoading] = useState(false);
  const [submitExecuting, setSubmitExecuting] = useState(false);

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

  const [submitForm, setSubmitForm] = useState<SubmitForm>({
    operator: '',
    remark: ''
  });

  const { limit, offset, total, setTotal, page, pages, setPage, setLimit } = usePagination();

  // 使用字典获取下拉选项
  const { options: paymentStatusOptions } = useDict('payment_status');
  const { options: paymentMethodOptions } = useDict('payment_method');

  useEffect(() => {
    fetchStudents();
  }, [limit, offset, keyword, paymentStatusFilter]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await studentService.getStudents({
        limit,
        offset,
        keyword,
        status: undefined, // 不传入特定状态,在后端过滤
        sortBy: 'id',
        sortOrder: 'desc'
      });
      
      // 前端过滤：排除"咨询中"和"预约报名"状态的学员
      const filteredStudents = response.data!.list.filter(
        student => student.status !== '咨询中' && student.status !== '预约报名'
      );
      
      setStudents(filteredStudents as unknown as StudentPaymentInfo[]);
      // 注意：这里total仍使用后端返回的总数，如需精确统计需要后端支持
      setTotal(response.data!.pagination.total);
    } catch (error) {
      console.error('获取学员列表失败:', error);
    } finally {
      setLoading(false);
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
      const actualAmount = toNumber(student.actual_amount);
      const accountBalance = toNumber(student.account_balance);
      const finalReceipt = actualAmount + accountBalance;
      
      // 计算上缴金额
      let submitAmount = 0;
      if (config) {
        if (config.config_type === 'ratio') {
          // 按比例计算：使用合同金额 * 比例
          const contractAmount = toNumber(student.contract_amount);
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
      setSubmitForm({ operator: '', remark: '' });
      setShowSubmitConfirmModal(true);
    } catch (error) {
      console.error('获取上缴配置失败:', error);
      alert('获取上缴配置失败');
    } finally {
      setSubmitConfirmLoading(false);
    }
  };

  // 执行上缴确认操作
  const handleExecuteSubmit = async () => {
    if (!submitConfirmInfo) return;

    if (!submitForm.operator) {
      alert('请填写经办人');
      return;
    }

    if (!submitConfirmInfo.config) {
      alert('未配置上缴规则，无法执行上缴');
      return;
    }

    // 检查是否已上缴
    if ((submitConfirmInfo.student as any).submit_status === '已上缴') {
      alert('该学员已完成上缴确认，不能重复操作');
      return;
    }

    setSubmitExecuting(true);
    try {
      const response = await paymentService.submitConfirm({
        student_id: submitConfirmInfo.student.id,
        operator: submitForm.operator,
        remark: submitForm.remark
      });

      if (response.success) {
        alert(`上缴确认成功！\n凭证号：${response.data.voucher_no || '无'}\n上缴金额：¥${Number(response.data.submit_amount).toFixed(2)}\n利润：¥${Number(response.data.profit).toFixed(2)}`);
        setShowSubmitConfirmModal(false);
        fetchStudents();
      } else {
        alert(response.message || '上缴确认失败');
      }
    } catch (error: any) {
      console.error('上缴确认失败:', error);
      alert(error.response?.data?.message || '上缴确认失败');
    } finally {
      setSubmitExecuting(false);
    }
  };

  // 执行撤销上缴操作
  const handleExecuteRevoke = async () => {
    if (!submitConfirmInfo) return;

    if (!submitForm.operator) {
      alert('请填写经办人');
      return;
    }

    // 检查是否已上缴
    if ((submitConfirmInfo.student as any).submit_status !== '已上缴') {
      alert('该学员未上缴，无需撤销');
      return;
    }

    if (!confirm(`确定要撤销该学员的上缴吗？\n上缴金额：¥${Number((submitConfirmInfo.student as any).submit_amount || 0).toFixed(2)}`)) {
      return;
    }

    setSubmitExecuting(true);
    try {
      const response = await paymentService.submitRevoke({
        student_id: submitConfirmInfo.student.id,
        operator: submitForm.operator,
        remark: submitForm.remark
      });

      if (response.success) {
        alert(`撤销上缴成功！\n凭证号：${response.data.voucher_no || '无'}\n撤销金额：¥${Number(response.data.revoke_amount).toFixed(2)}`);
        setShowSubmitConfirmModal(false);
        fetchStudents();
      } else {
        alert(response.message || '撤销上缴失败');
      }
    } catch (error: any) {
      console.error('撤销上缴失败:', error);
      alert(error.response?.data?.message || '撤销上缴失败');
    } finally {
      setSubmitExecuting(false);
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
    const actualAmount = toNumber(selectedStudent.actual_amount);

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
    const actualAmount = toNumber(selectedStudent.actual_amount);

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
      alert('缴费记录撤销成功，已生成冲销凭证');
      setDeletePaymentId(null);
      if (selectedStudent) {
        await fetchPaymentRecords(selectedStudent.id);
      }
      fetchStudents();
    } catch (error: any) {
      console.error('撤销缴费记录失败:', error);
      alert(error.response?.data?.message || '撤销缴费记录失败');
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
      accessorKey: 'name',
      header: '姓名',
      size: 80,
    },
    {
      accessorKey: 'phone',
      header: '手机号',
      size: 110,
    },
    {
      accessorKey: 'class_type_name',
      header: '班型',
      size: 80,
      cell: ({ row }) => row.original.class_type_name || '-',
    },
    {
      accessorKey: 'contract_amount',
      header: '合同',
      size: 80,
      cell: ({ row }) => `¥${toNumber(row.original.contract_amount).toFixed(0)}`,
    },
    {
      accessorKey: 'discount_amount',
      header: '减免',
      size: 70,
      cell: ({ row }) => {
        const discount = toNumber(row.original.discount_amount);
        return discount > 0 ? <span style={{ color: '#e6a23c' }}>-¥{discount.toFixed(0)}</span> : '-';
      },
    },
    {
      accessorKey: 'actual_amount',
      header: '实收',
      size: 80,
      cell: ({ row }) => (
        <span style={{ color: '#67c23a' }}>¥{toNumber(row.original.actual_amount).toFixed(0)}</span>
      ),
    },
    {
      accessorKey: 'debt_amount',
      header: '欠费',
      size: 80,
      cell: ({ row }) => {
        const debt = toNumber(row.original.debt_amount);
        const paymentStatus = row.original.payment_status;
        if (paymentStatus === '已退费') return <span style={{ color: '#909399' }}>-</span>;
        return (
          <span style={{ fontWeight: 600, color: debt > 0 ? '#f56c6c' : '#67c23a' }}>
            {debt > 0 ? `¥${debt.toFixed(0)}` : '¥0'}
          </span>
        );
      },
    },
    {
      accessorKey: 'account_balance',
      header: '余额',
      size: 70,
      cell: ({ row }) => {
        const balance = toNumber(row.original.account_balance);
        return balance > 0 ? <span style={{ color: '#409eff' }}>¥{balance.toFixed(0)}</span> : '-';
      },
    },
    {
      accessorKey: 'payment_status',
      header: '缴费',
      size: 80,
      cell: ({ row }) => (
        <span className={`badge ${getPaymentStatusBadge(row.original.payment_status)}`}>
          {row.original.payment_status}
        </span>
      ),
    },
    {
      accessorKey: 'submit_status',
      header: '上缴',
      size: 70,
      cell: ({ row }) => {
        const submitStatus = (row.original as any).submit_status || '未上缴';
        return (
          <span className={`badge ${submitStatus === '已上缴' ? 'badge-green' : 'badge-gray'}`}>
            {submitStatus}
          </span>
        );
      },
    },
    {
      header: '操作',
      size: 220,
      cell: ({ row }) => {
        const submitStatus = (row.original as any).submit_status || '未上缴';
        return (
          <div className="action-buttons">
            <button
              onClick={() => handleAddPayment(row.original)}
              className="btn btn-primary btn-sm"
              disabled={row.original.payment_status === '已退费'}
            >
              缴费
            </button>
            <button
              onClick={() => handleViewRecords(row.original)}
              className="btn btn-info btn-sm"
            >
              记录
            </button>
            <button
              onClick={() => handleDiscount(row.original)}
              className="btn btn-success btn-sm"
              disabled={row.original.payment_status === '已退费' || toNumber(row.original.actual_amount) === 0}
            >
              减免
            </button>
            <button
              onClick={() => handleRefund(row.original)}
              className="btn btn-warning btn-sm"
              disabled={row.original.payment_status === '已退费' || toNumber(row.original.actual_amount) === 0}
            >
              退费
            </button>
            <button
              onClick={() => handleSubmitConfirm(row.original)}
              className="btn btn-sm"
              style={{ 
                backgroundColor: submitStatus === '已上缴' ? '#52c41a' : '#722ed1', 
                color: '#fff' 
              }}
              disabled={submitConfirmLoading}
            >
              {submitStatus === '已上缴' ? '已上缴' : '上缴确认'}
            </button>
          </div>
        );
      },
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
      cell: ({ row }) => `¥${Number(row.original.amount).toFixed(2)}`,
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
          className="btn btn-warning btn-sm"
        >
          撤销
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
              <span>¥{toNumber(selectedStudent?.contract_amount).toFixed(2)}</span>
            </div>
            <div>
              <strong>减免金额：</strong>
              <span>¥{toNumber(selectedStudent?.discount_amount).toFixed(2)}</span>
            </div>
            <div>
              <strong>实收金额：</strong>
              <span>¥{toNumber(selectedStudent?.actual_amount).toFixed(2)}</span>
            </div>
            <div>
              <strong>欠费金额：</strong>
              <span style={{ color: toNumber(selectedStudent?.debt_amount) > 0 ? '#f56c6c' : '#67c23a' }}>
                ¥{toNumber(selectedStudent?.debt_amount).toFixed(2)}
              </span>
            </div>
            <div>
              <strong>账户余额：</strong>
              <span style={{ color: toNumber(selectedStudent?.account_balance) > 0 ? '#409eff' : '#909399' }}>
                ¥{toNumber(selectedStudent?.account_balance).toFixed(2)}
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
                <span>¥{toNumber(selectedStudent?.contract_amount).toFixed(2)}</span>
              </div>
              <div>
                <strong>当前实收金额：</strong>
                <span style={{ color: '#409eff', fontWeight: 'bold' }}>
                  ¥{toNumber(selectedStudent?.actual_amount).toFixed(2)}
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
              max={toNumber(selectedStudent?.actual_amount)}
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
              最大可退费金额：¥{toNumber(selectedStudent?.actual_amount).toFixed(2)}
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

      {/* 撤销确认对话框 */}
      <ConfirmDialog
        visible={!!deletePaymentId}
        title="确认撤销"
        message="撤销缴费记录后，学员的实收金额和欠费金额将自动回退，并生成冲销凭证。确定要撤销吗？"
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
                <span>¥{toNumber(selectedStudent?.contract_amount).toFixed(2)}</span>
              </div>
              <div>
                <strong>当前实收金额：</strong>
                <span style={{ color: '#409eff', fontWeight: 'bold' }}>
                  ¥{toNumber(selectedStudent?.actual_amount).toFixed(2)}
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
              max={toNumber(selectedStudent?.actual_amount)}
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
              最大可减免金额：¥{toNumber(selectedStudent?.actual_amount).toFixed(2)}
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
            {/* 已上缴提示 */}
            {(submitConfirmInfo.student as any).submit_status === '已上缴' && (
              <div style={{ marginBottom: '16px', padding: '12px', background: '#fff7e6', borderRadius: '4px', border: '1px solid #ffc069' }}>
                <div style={{ color: '#d46b08', fontWeight: 'bold' }}>
                  该学员已于 {(submitConfirmInfo.student as any).submit_date} 完成上缴确认
                </div>
              </div>
            )}

            {/* 学员基本信息 */}
            <div style={{ marginBottom: '20px', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>学员信息</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '14px' }}>
                <div><strong>姓名：</strong>{submitConfirmInfo.student.name}</div>
                <div><strong>班型：</strong>{submitConfirmInfo.student.class_type_name || '-'}</div>
                <div><strong>合同金额：</strong>¥{toNumber(submitConfirmInfo.student.contract_amount).toFixed(2)}</div>
                <div><strong>实收金额：</strong>¥{toNumber(submitConfirmInfo.student.actual_amount).toFixed(2)}</div>
                <div><strong>账户余额：</strong>¥{toNumber(submitConfirmInfo.student.account_balance).toFixed(2)}</div>
                <div><strong>减免金额：</strong>¥{toNumber(submitConfirmInfo.student.discount_amount).toFixed(2)}</div>
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
            <div style={{ padding: '16px', background: '#f6ffed', borderRadius: '8px', border: '2px solid #52c41a', marginBottom: '20px' }}>
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

            {/* 上缴操作表单 - 未上缴时显示上缴表单，已上缴时显示撤销表单 */}
            {(submitConfirmInfo.student as any).submit_status !== '已上缴' && submitConfirmInfo.config && (
              <div style={{ marginBottom: '20px', padding: '12px', background: '#fafafa', borderRadius: '4px', border: '1px solid #d9d9d9' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>上缴操作</h4>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>经办人 *</label>
                  <input
                    type="text"
                    value={submitForm.operator}
                    onChange={(e) => setSubmitForm({ ...submitForm, operator: e.target.value })}
                    placeholder="请输入经办人姓名"
                    style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>备注</label>
                  <textarea
                    value={submitForm.remark}
                    onChange={(e) => setSubmitForm({ ...submitForm, remark: e.target.value })}
                    placeholder="请输入备注信息（可选）"
                    rows={2}
                    style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px', resize: 'vertical' }}
                  />
                </div>
              </div>
            )}

            {/* 已上缴时显示撤销操作表单 */}
            {(submitConfirmInfo.student as any).submit_status === '已上缴' && (
              <div style={{ marginBottom: '20px', padding: '12px', background: '#fff1f0', borderRadius: '4px', border: '1px solid #ffa39e' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#cf1322' }}>撤销上缴</h4>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>经办人 *</label>
                  <input
                    type="text"
                    value={submitForm.operator}
                    onChange={(e) => setSubmitForm({ ...submitForm, operator: e.target.value })}
                    placeholder="请输入经办人姓名"
                    style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>备注</label>
                  <textarea
                    value={submitForm.remark}
                    onChange={(e) => setSubmitForm({ ...submitForm, remark: e.target.value })}
                    placeholder="请输入撤销原因（可选）"
                    rows={2}
                    style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px', resize: 'vertical' }}
                  />
                </div>
              </div>
            )}

            <div style={{ marginTop: '20px', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button 
                onClick={() => setShowSubmitConfirmModal(false)} 
                className="btn btn-default"
                style={{ padding: '8px 24px' }}
              >
                关闭
              </button>
              {(submitConfirmInfo.student as any).submit_status !== '已上缴' && submitConfirmInfo.config && (
                <button 
                  onClick={handleExecuteSubmit}
                  disabled={submitExecuting || !submitForm.operator}
                  className="btn"
                  style={{ 
                    padding: '8px 24px', 
                    backgroundColor: '#722ed1', 
                    color: '#fff',
                    opacity: (submitExecuting || !submitForm.operator) ? 0.6 : 1
                  }}
                >
                  {submitExecuting ? '处理中...' : '确认上缴'}
                </button>
              )}
              {(submitConfirmInfo.student as any).submit_status === '已上缴' && (
                <button 
                  onClick={handleExecuteRevoke}
                  disabled={submitExecuting || !submitForm.operator}
                  className="btn"
                  style={{ 
                    padding: '8px 24px', 
                    backgroundColor: '#f5222d', 
                    color: '#fff',
                    opacity: (submitExecuting || !submitForm.operator) ? 0.6 : 1
                  }}
                >
                  {submitExecuting ? '处理中...' : '撤销上缴'}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
