import { useState, useEffect } from 'react';
import { financeService, ProfitReport, BalanceDetailItem, SubjectBalanceItem, YearlyProfitReport, ExpenseAllocation, ExpenseAllocationFormData, Subject } from '../../services/finance';
import Table from '../../components/common/Table';
import { ColumnDef } from '@tanstack/react-table';
import '../system/Students.css';

type TabType = 'profit' | 'detail' | 'balance' | 'analysis';

const SUBJECT_TYPES = ['', '资产', '负债', '权益', '收入', '支出'];

export default function Reports() {
  const [activeTab, setActiveTab] = useState<TabType>('profit');
  const [loading, setLoading] = useState(false);
  
  // 利润表状态
  const [profitYearMonth, setProfitYearMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [profitReport, setProfitReport] = useState<ProfitReport | null>(null);
  
  // 收支明细状态
  const [detailStartDate, setDetailStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [detailEndDate, setDetailEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [detailSubjectType, setDetailSubjectType] = useState('');
  const [detailData, setDetailData] = useState<BalanceDetailItem[]>([]);
  
  // 科目余额状态
  const [balanceDate, setBalanceDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [balanceSubjectType, setBalanceSubjectType] = useState('');
  const [balanceData, setBalanceData] = useState<SubjectBalanceItem[]>([]);

  // 利润分析状态
  const [analysisType, setAnalysisType] = useState<'monthly' | 'yearly'>('monthly');
  const [analysisYearMonth, setAnalysisYearMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [analysisYear, setAnalysisYear] = useState(() => new Date().getFullYear());
  const [analysisMonthlyData, setAnalysisMonthlyData] = useState<ProfitReport | null>(null);
  const [analysisYearlyData, setAnalysisYearlyData] = useState<YearlyProfitReport | null>(null);
  
  // 分摊配置弹窗状态
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [allocations, setAllocations] = useState<ExpenseAllocation[]>([]);
  const [expenseSubjects, setExpenseSubjects] = useState<Subject[]>([]);
  const [editingAllocation, setEditingAllocation] = useState<ExpenseAllocation | null>(null);
  const [allocationForm, setAllocationForm] = useState<ExpenseAllocationFormData>({
    expense_name: '',
    subject_code: '',
    total_amount: 0,
    allocation_year: new Date().getFullYear(),
    allocation_method: 'average',
    start_month: 1,
    end_month: 12,
    remark: '',
    is_active: true
  });

  useEffect(() => {
    if (activeTab === 'profit') {
      fetchProfitReport();
    } else if (activeTab === 'detail') {
      fetchDetailReport();
    } else if (activeTab === 'balance') {
      fetchBalanceReport();
    } else if (activeTab === 'analysis') {
      fetchAnalysisReport();
    }
  }, [activeTab]);

  // 获取利润表
  const fetchProfitReport = async () => {
    setLoading(true);
    try {
      const response = await financeService.getProfitMonthly(profitYearMonth);
      if (response.data) {
        setProfitReport(response.data);
      }
    } catch (error) {
      console.error('获取利润表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取收支明细
  const fetchDetailReport = async () => {
    setLoading(true);
    try {
      const response = await financeService.getBalanceDetail({
        startDate: detailStartDate,
        endDate: detailEndDate,
        subjectType: detailSubjectType || undefined
      });
      if (response.data) {
        setDetailData(response.data);
      }
    } catch (error) {
      console.error('获取收支明细失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取科目余额
  const fetchBalanceReport = async () => {
    setLoading(true);
    try {
      const response = await financeService.getSubjectBalance({
        date: balanceDate,
        subjectType: balanceSubjectType || undefined
      });
      if (response.data) {
        setBalanceData(response.data);
      }
    } catch (error) {
      console.error('获取科目余额失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取利润分析数据
  const fetchAnalysisReport = async () => {
    setLoading(true);
    try {
      if (analysisType === 'monthly') {
        const response = await financeService.getProfitMonthly(analysisYearMonth);
        if (response.data) {
          setAnalysisMonthlyData(response.data);
        }
      } else {
        const response = await financeService.getProfitYearly(analysisYear);
        if (response.data) {
          setAnalysisYearlyData(response.data);
        }
      }
    } catch (error) {
      console.error('获取利润分析数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取分摊配置列表
  const fetchAllocations = async () => {
    try {
      const response = await financeService.getExpenseAllocations({ is_active: 'true' });
      if (response.data) {
        setAllocations(response.data);
      }
    } catch (error) {
      console.error('获取分摊配置失败:', error);
    }
  };

  // 获取支出类科目
  const fetchExpenseSubjects = async () => {
    try {
      const response = await financeService.getSubjects({ type: '支出', is_active: 'true' });
      if (response.data) {
        setExpenseSubjects(response.data);
      }
    } catch (error) {
      console.error('获取支出科目失败:', error);
    }
  };

  // 打开分摊配置弹窗
  const openAllocationModal = () => {
    fetchAllocations();
    fetchExpenseSubjects();
    setShowAllocationModal(true);
  };

  // 保存分摊配置
  const saveAllocation = async () => {
    try {
      if (editingAllocation) {
        await financeService.updateExpenseAllocation(editingAllocation.id, allocationForm);
      } else {
        await financeService.createExpenseAllocation(allocationForm);
      }
      fetchAllocations();
      resetAllocationForm();
      // 刷新利润分析数据
      fetchAnalysisReport();
    } catch (error: any) {
      alert(error.response?.data?.message || '保存失败');
    }
  };

  // 编辑分摊配置
  const editAllocation = (allocation: ExpenseAllocation) => {
    setEditingAllocation(allocation);
    setAllocationForm({
      expense_name: allocation.expense_name,
      subject_code: allocation.subject_code,
      total_amount: allocation.total_amount,
      allocation_year: allocation.allocation_year,
      allocation_method: allocation.allocation_method,
      start_month: allocation.start_month,
      end_month: allocation.end_month,
      remark: allocation.remark || '',
      is_active: allocation.is_active
    });
  };

  // 删除分摊配置
  const deleteAllocation = async (id: number) => {
    if (!confirm('确定要删除此分摊配置吗？')) return;
    try {
      await financeService.deleteExpenseAllocation(id);
      fetchAllocations();
      fetchAnalysisReport();
    } catch (error) {
      console.error('删除分摊配置失败:', error);
    }
  };

  // 重置分摊配置表单
  const resetAllocationForm = () => {
    setEditingAllocation(null);
    setAllocationForm({
      expense_name: '',
      subject_code: '',
      total_amount: 0,
      allocation_year: new Date().getFullYear(),
      allocation_method: 'average',
      start_month: 1,
      end_month: 12,
      remark: '',
      is_active: true
    });
  };

  // 收支明细表列定义
  const detailColumns: ColumnDef<BalanceDetailItem, any>[] = [
    { accessorKey: 'voucher_date', header: '日期', size: 100,
      cell: ({ row }) => row.original.voucher_date.split('T')[0] },
    { accessorKey: 'voucher_no', header: '凭证号', size: 120 },
    { accessorKey: 'subject_code', header: '科目代码', size: 80 },
    { accessorKey: 'subject_name', header: '科目名称', size: 120 },
    { accessorKey: 'subject_type', header: '科目类型', size: 80,
      cell: ({ row }) => (
        <span className={`badge ${getTypeBadge(row.original.subject_type)}`}>
          {row.original.subject_type}
        </span>
      )
    },
    { accessorKey: 'entry_type', header: '借/贷', size: 60,
      cell: ({ row }) => (
        <span className={row.original.entry_type === '借' ? 'text-blue' : 'text-green'}>
          {row.original.entry_type}
        </span>
      )
    },
    { accessorKey: 'amount', header: '金额', size: 100,
      cell: ({ row }) => Number(row.original.amount).toFixed(2) },
    { accessorKey: 'description', header: '摘要', size: 200 },
  ];

  // 科目余额表列定义
  const balanceColumns: ColumnDef<SubjectBalanceItem, any>[] = [
    { accessorKey: 'subject_code', header: '科目代码', size: 100 },
    { accessorKey: 'subject_name', header: '科目名称', size: 150 },
    { accessorKey: 'subject_type', header: '科目类型', size: 80,
      cell: ({ row }) => (
        <span className={`badge ${getTypeBadge(row.original.subject_type)}`}>
          {row.original.subject_type}
        </span>
      )
    },
    { accessorKey: 'total_debit', header: '借方发生额', size: 120,
      cell: ({ row }) => Number(row.original.total_debit).toFixed(2) },
    { accessorKey: 'total_credit', header: '贷方发生额', size: 120,
      cell: ({ row }) => Number(row.original.total_credit).toFixed(2) },
    { header: '余额', size: 120,
      cell: ({ row }) => (
        <span style={{ color: row.original.balance >= 0 ? '#52c41a' : '#f5222d' }}>
          {row.original.balance_direction_text} {Number(row.original.balance_abs).toFixed(2)}
        </span>
      )
    },
  ];

  const getTypeBadge = (type: string) => {
    const badges: Record<string, string> = {
      '资产': 'badge-blue',
      '负债': 'badge-red',
      '权益': 'badge-purple',
      '收入': 'badge-green',
      '支出': 'badge-orange'
    };
    return badges[type] || 'badge-gray';
  };

  // 渲染利润表
  const renderProfitReport = () => (
    <div>
      <div className="search-panel">
        <div className="search-row">
          <div className="search-item">
            <label>查询月份</label>
            <input
              type="month"
              value={profitYearMonth}
              onChange={(e) => setProfitYearMonth(e.target.value)}
            />
          </div>
          <button onClick={fetchProfitReport} className="btn btn-primary">
            查询
          </button>
        </div>
      </div>

      {profitReport && (
        <div className="profit-report">
          {/* 收入明细 */}
          <div className="report-section" style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#52c41a', borderBottom: '2px solid #52c41a', paddingBottom: '8px' }}>
              收入项目
            </h3>
            <table className="report-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>科目代码</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>科目名称</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>金额</th>
                </tr>
              </thead>
              <tbody>
                {profitReport.incomeItems.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px' }}>{item.subject_code}</td>
                    <td style={{ padding: '10px' }}>{item.subject_name}</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>{Number(item.amount).toFixed(2)}</td>
                  </tr>
                ))}
                <tr style={{ background: '#f0fff0', fontWeight: 'bold' }}>
                  <td colSpan={2} style={{ padding: '10px' }}>收入合计</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#52c41a' }}>
                    {Number(profitReport.totalIncome).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 支出明细 */}
          <div className="report-section" style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#f5222d', borderBottom: '2px solid #f5222d', paddingBottom: '8px' }}>
              支出项目
            </h3>
            <table className="report-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>科目代码</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>科目名称</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>金额</th>
                </tr>
              </thead>
              <tbody>
                {profitReport.expenseItems.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px' }}>{item.subject_code}</td>
                    <td style={{ padding: '10px' }}>{item.subject_name}</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>{Number(item.amount).toFixed(2)}</td>
                  </tr>
                ))}
                <tr style={{ background: '#fff0f0', fontWeight: 'bold' }}>
                  <td colSpan={2} style={{ padding: '10px' }}>支出合计</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#f5222d' }}>
                    {Number(profitReport.totalExpense).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 净利润 */}
          <div className="report-section" style={{ 
            background: profitReport.netProfit >= 0 ? '#f6ffed' : '#fff2f0',
            border: `2px solid ${profitReport.netProfit >= 0 ? '#52c41a' : '#f5222d'}`,
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <h2 style={{ margin: 0 }}>
              本月净{profitReport.netProfit >= 0 ? '利润' : '亏损'}：
              <span style={{ 
                color: profitReport.netProfit >= 0 ? '#52c41a' : '#f5222d',
                fontSize: '28px',
                marginLeft: '10px'
              }}>
                {Math.abs(Number(profitReport.netProfit)).toFixed(2)} 元
              </span>
            </h2>
          </div>
        </div>
      )}
    </div>
  );

  // 渲染收支明细
  const renderDetailReport = () => (
    <div>
      <div className="search-panel">
        <div className="search-row">
          <div className="search-item">
            <label>开始日期</label>
            <input
              type="date"
              value={detailStartDate}
              onChange={(e) => setDetailStartDate(e.target.value)}
            />
          </div>
          <div className="search-item">
            <label>结束日期</label>
            <input
              type="date"
              value={detailEndDate}
              onChange={(e) => setDetailEndDate(e.target.value)}
            />
          </div>
          <div className="search-item">
            <label>科目类型</label>
            <select
              value={detailSubjectType}
              onChange={(e) => setDetailSubjectType(e.target.value)}
            >
              <option value="">全部</option>
              {SUBJECT_TYPES.filter(t => t).map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <button onClick={fetchDetailReport} className="btn btn-primary">
            查询
          </button>
        </div>
      </div>

      <div className="table-container">
        <Table columns={detailColumns} data={detailData} loading={loading} />
      </div>
    </div>
  );

  // 渲染科目余额
  const renderBalanceReport = () => (
    <div>
      <div className="search-panel">
        <div className="search-row">
          <div className="search-item">
            <label>截止日期</label>
            <input
              type="date"
              value={balanceDate}
              onChange={(e) => setBalanceDate(e.target.value)}
            />
          </div>
          <div className="search-item">
            <label>科目类型</label>
            <select
              value={balanceSubjectType}
              onChange={(e) => setBalanceSubjectType(e.target.value)}
            >
              <option value="">全部</option>
              {SUBJECT_TYPES.filter(t => t).map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <button onClick={fetchBalanceReport} className="btn btn-primary">
            查询
          </button>
        </div>
      </div>

      <div className="table-container">
        <Table columns={balanceColumns} data={balanceData} loading={loading} />
      </div>
    </div>
  );

  // 渲染利润分析
  const renderAnalysisReport = () => (
    <div>
      <div className="search-panel">
        <div className="search-row">
          <div className="search-item">
            <label>查询类型</label>
            <select
              value={analysisType}
              onChange={(e) => setAnalysisType(e.target.value as 'monthly' | 'yearly')}
            >
              <option value="monthly">月度</option>
              <option value="yearly">年度</option>
            </select>
          </div>
          {analysisType === 'monthly' ? (
            <div className="search-item">
              <label>查询月份</label>
              <input
                type="month"
                value={analysisYearMonth}
                onChange={(e) => setAnalysisYearMonth(e.target.value)}
              />
            </div>
          ) : (
            <div className="search-item">
              <label>查询年度</label>
              <select
                value={analysisYear}
                onChange={(e) => setAnalysisYear(parseInt(e.target.value))}
              >
                {[2024, 2025, 2026, 2027, 2028].map(y => (
                  <option key={y} value={y}>{y}年</option>
                ))}
              </select>
            </div>
          )}
          <button onClick={fetchAnalysisReport} className="btn btn-primary">
            查询
          </button>
          <button onClick={openAllocationModal} className="btn btn-secondary" style={{ marginLeft: '10px' }}>
            分摊配置
          </button>
        </div>
      </div>

      {/* 月度利润分析 */}
      {analysisType === 'monthly' && analysisMonthlyData && (
        <div className="profit-report">
          {/* 收入明细 */}
          <div className="report-section" style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#52c41a', borderBottom: '2px solid #52c41a', paddingBottom: '8px' }}>
              收入明细
            </h3>
            <table className="report-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>科目代码</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>科目名称</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>金额</th>
                </tr>
              </thead>
              <tbody>
                {analysisMonthlyData.incomeItems.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px' }}>{item.subject_code}</td>
                    <td style={{ padding: '10px' }}>{item.subject_name}</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>{Number(item.amount).toFixed(2)}</td>
                  </tr>
                ))}
                <tr style={{ background: '#f0fff0', fontWeight: 'bold' }}>
                  <td colSpan={2} style={{ padding: '10px' }}>收入合计</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#52c41a' }}>
                    {Number(analysisMonthlyData.totalIncome).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 实际支出明细 */}
          <div className="report-section" style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#f5222d', borderBottom: '2px solid #f5222d', paddingBottom: '8px' }}>
              支出明细（实际发生）
            </h3>
            <table className="report-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>科目代码</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>科目名称</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>金额</th>
                </tr>
              </thead>
              <tbody>
                {analysisMonthlyData.expenseItems.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px' }}>{item.subject_code}</td>
                    <td style={{ padding: '10px' }}>{item.subject_name}</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>{Number(item.amount).toFixed(2)}</td>
                  </tr>
                ))}
                <tr style={{ background: '#fff0f0', fontWeight: 'bold' }}>
                  <td colSpan={2} style={{ padding: '10px' }}>实际支出合计</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#f5222d' }}>
                    {Number(analysisMonthlyData.totalExpense).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 分摊费用明细 */}
          {analysisMonthlyData.allocatedItems && analysisMonthlyData.allocatedItems.length > 0 && (
            <div className="report-section" style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#fa8c16', borderBottom: '2px solid #fa8c16', paddingBottom: '8px' }}>
                分摊费用（年度费用按月分摊）
              </h3>
              <table className="report-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    <th style={{ padding: '10px', textAlign: 'left' }}>科目代码</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>科目名称</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>费用名称</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>年度总额</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>本月分摊</th>
                  </tr>
                </thead>
                <tbody>
                  {analysisMonthlyData.allocatedItems.map((item, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px' }}>{item.subject_code}</td>
                      <td style={{ padding: '10px' }}>{item.subject_name}</td>
                      <td style={{ padding: '10px' }}>{item.expense_name}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{Number(item.total_amount).toFixed(2)}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{Number(item.monthly_amount).toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#fff7e6', fontWeight: 'bold' }}>
                    <td colSpan={4} style={{ padding: '10px' }}>分摊费用合计</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#fa8c16' }}>
                      {Number(analysisMonthlyData.totalAllocated).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* 净利润汇总 */}
          <div className="report-section" style={{ 
            background: analysisMonthlyData.netProfit >= 0 ? '#f6ffed' : '#fff2f0',
            border: `2px solid ${analysisMonthlyData.netProfit >= 0 ? '#52c41a' : '#f5222d'}`,
            borderRadius: '8px',
            padding: '20px'
          }}>
            <div style={{ marginBottom: '10px', fontSize: '14px', color: '#666' }}>
              净利润 = {Number(analysisMonthlyData.totalIncome).toFixed(2)} (收入) 
              - {Number(analysisMonthlyData.totalExpense).toFixed(2)} (实际支出) 
              - {Number(analysisMonthlyData.totalAllocated || 0).toFixed(2)} (分摊费用)
            </div>
            <h2 style={{ margin: 0, textAlign: 'center' }}>
              本月净{analysisMonthlyData.netProfit >= 0 ? '利润' : '亏损'}：
              <span style={{ 
                color: analysisMonthlyData.netProfit >= 0 ? '#52c41a' : '#f5222d',
                fontSize: '28px',
                marginLeft: '10px'
              }}>
                {Math.abs(Number(analysisMonthlyData.netProfit)).toFixed(2)} 元
              </span>
            </h2>
          </div>
        </div>
      )}

      {/* 年度利润汇总 */}
      {analysisType === 'yearly' && analysisYearlyData && (
        <div className="profit-report">
          <div className="report-section" style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#1890ff', borderBottom: '2px solid #1890ff', paddingBottom: '8px' }}>
              {analysisYearlyData.year}年度利润汇总
            </h3>
            <table className="report-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: '10px', textAlign: 'center' }}>月份</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>收入</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>实际支出</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>分摊费用</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>净利润</th>
                </tr>
              </thead>
              <tbody>
                {analysisYearlyData.monthlyData.map((item) => (
                  <tr key={item.month} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px', textAlign: 'center' }}>{item.month}月</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#52c41a' }}>
                      {Number(item.income).toFixed(2)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#f5222d' }}>
                      {Number(item.expense).toFixed(2)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#fa8c16' }}>
                      {Number(item.allocated).toFixed(2)}
                    </td>
                    <td style={{ 
                      padding: '10px', 
                      textAlign: 'right',
                      color: item.netProfit >= 0 ? '#52c41a' : '#f5222d',
                      fontWeight: 'bold'
                    }}>
                      {Number(item.netProfit).toFixed(2)}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: '#e6f7ff', fontWeight: 'bold' }}>
                  <td style={{ padding: '10px', textAlign: 'center' }}>年度合计</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#52c41a' }}>
                    {Number(analysisYearlyData.yearlyTotal.totalIncome).toFixed(2)}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#f5222d' }}>
                    {Number(analysisYearlyData.yearlyTotal.totalExpense).toFixed(2)}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#fa8c16' }}>
                    {Number(analysisYearlyData.yearlyTotal.totalAllocated).toFixed(2)}
                  </td>
                  <td style={{ 
                    padding: '10px', 
                    textAlign: 'right',
                    color: analysisYearlyData.yearlyTotal.netProfit >= 0 ? '#52c41a' : '#f5222d',
                    fontSize: '16px'
                  }}>
                    {Number(analysisYearlyData.yearlyTotal.netProfit).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 年度净利润汇总 */}
          <div className="report-section" style={{ 
            background: analysisYearlyData.yearlyTotal.netProfit >= 0 ? '#f6ffed' : '#fff2f0',
            border: `2px solid ${analysisYearlyData.yearlyTotal.netProfit >= 0 ? '#52c41a' : '#f5222d'}`,
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <h2 style={{ margin: 0 }}>
              {analysisYearlyData.year}年度净{analysisYearlyData.yearlyTotal.netProfit >= 0 ? '利润' : '亏损'}：
              <span style={{ 
                color: analysisYearlyData.yearlyTotal.netProfit >= 0 ? '#52c41a' : '#f5222d',
                fontSize: '28px',
                marginLeft: '10px'
              }}>
                {Math.abs(Number(analysisYearlyData.yearlyTotal.netProfit)).toFixed(2)} 元
              </span>
            </h2>
          </div>
        </div>
      )}

      {/* 分摊配置弹窗 */}
      {showAllocationModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', 
          justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="modal-content" style={{
            background: '#fff', borderRadius: '8px', padding: '24px',
            width: '800px', maxHeight: '80vh', overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>费用分摊配置</h2>
              <button onClick={() => setShowAllocationModal(false)} style={{
                border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer'
              }}>×</button>
            </div>

            {/* 配置表单 */}
            <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '4px', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 12px 0' }}>{editingAllocation ? '编辑配置' : '新增配置'}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>费用名称 *</label>
                  <input
                    type="text"
                    value={allocationForm.expense_name}
                    onChange={(e) => setAllocationForm({...allocationForm, expense_name: e.target.value})}
                    placeholder="如：2026年场地租赁费"
                    style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>关联科目 *</label>
                  <select
                    value={allocationForm.subject_code}
                    onChange={(e) => setAllocationForm({...allocationForm, subject_code: e.target.value})}
                    style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                  >
                    <option value="">请选择</option>
                    {expenseSubjects.map(s => (
                      <option key={s.subject_code} value={s.subject_code}>{s.subject_code} - {s.subject_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>分摊年度 *</label>
                  <select
                    value={allocationForm.allocation_year}
                    onChange={(e) => setAllocationForm({...allocationForm, allocation_year: parseInt(e.target.value)})}
                    style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                  >
                    {[2024, 2025, 2026, 2027, 2028].map(y => (
                      <option key={y} value={y}>{y}年</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>年度总金额 *</label>
                  <input
                    type="number"
                    value={allocationForm.total_amount}
                    onChange={(e) => setAllocationForm({...allocationForm, total_amount: parseFloat(e.target.value) || 0})}
                    style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>开始月份</label>
                  <select
                    value={allocationForm.start_month}
                    onChange={(e) => setAllocationForm({...allocationForm, start_month: parseInt(e.target.value)})}
                    style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                      <option key={m} value={m}>{m}月</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>结束月份</label>
                  <select
                    value={allocationForm.end_month}
                    onChange={(e) => setAllocationForm({...allocationForm, end_month: parseInt(e.target.value)})}
                    style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                      <option key={m} value={m}>{m}月</option>
                    ))}
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>备注</label>
                  <input
                    type="text"
                    value={allocationForm.remark || ''}
                    onChange={(e) => setAllocationForm({...allocationForm, remark: e.target.value})}
                    style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                  />
                </div>
              </div>
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                <button onClick={saveAllocation} className="btn btn-primary">
                  {editingAllocation ? '更新' : '添加'}
                </button>
                {editingAllocation && (
                  <button onClick={resetAllocationForm} className="btn btn-secondary">取消编辑</button>
                )}
              </div>
            </div>

            {/* 配置列表 */}
            <h4 style={{ margin: '0 0 12px 0' }}>已配置列表</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e8e8e8' }}>费用名称</th>
                  <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e8e8e8' }}>科目</th>
                  <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #e8e8e8' }}>年度总额</th>
                  <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #e8e8e8' }}>月均</th>
                  <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #e8e8e8' }}>分摊期间</th>
                  <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #e8e8e8' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {allocations.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#999', border: '1px solid #e8e8e8' }}>
                      暂无分摊配置
                    </td>
                  </tr>
                ) : (
                  allocations.map(a => (
                    <tr key={a.id}>
                      <td style={{ padding: '8px', border: '1px solid #e8e8e8' }}>{a.expense_name}</td>
                      <td style={{ padding: '8px', border: '1px solid #e8e8e8' }}>{a.subject_code} - {a.subject_name}</td>
                      <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #e8e8e8' }}>
                        {Number(a.total_amount).toFixed(2)}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #e8e8e8' }}>
                        {Number(a.monthly_amount).toFixed(2)}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #e8e8e8' }}>
                        {a.allocation_year}年 {a.start_month}-{a.end_month}月
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #e8e8e8' }}>
                        <button 
                          onClick={() => editAllocation(a)} 
                          style={{ marginRight: '8px', padding: '2px 8px', cursor: 'pointer' }}
                        >
                          编辑
                        </button>
                        <button 
                          onClick={() => deleteAllocation(a.id)}
                          style={{ padding: '2px 8px', cursor: 'pointer', color: '#f5222d' }}
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="students-page">
      <div className="page-header">
        <h1>报表中心</h1>
      </div>

      {/* 标签页切换 */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'profit' ? 'active' : ''}`}
          onClick={() => setActiveTab('profit')}
        >
          月度利润表
        </button>
        <button
          className={`tab ${activeTab === 'detail' ? 'active' : ''}`}
          onClick={() => setActiveTab('detail')}
        >
          收支明细表
        </button>
        <button
          className={`tab ${activeTab === 'balance' ? 'active' : ''}`}
          onClick={() => setActiveTab('balance')}
        >
          科目余额表
        </button>
        <button
          className={`tab ${activeTab === 'analysis' ? 'active' : ''}`}
          onClick={() => setActiveTab('analysis')}
        >
          利润分析
        </button>
      </div>

      {/* 报表内容 */}
      <div className="tab-content">
        {activeTab === 'profit' && renderProfitReport()}
        {activeTab === 'detail' && renderDetailReport()}
        {activeTab === 'balance' && renderBalanceReport()}
        {activeTab === 'analysis' && renderAnalysisReport()}
      </div>
    </div>
  );
}
