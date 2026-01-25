import { useState, useEffect } from 'react';
import { financeService, ProfitReport, BalanceDetailItem, SubjectBalanceItem } from '../../services/finance';
import Table from '../../components/common/Table';
import { ColumnDef } from '@tanstack/react-table';
import '../system/Students.css';

type TabType = 'profit' | 'detail' | 'balance';

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

  useEffect(() => {
    if (activeTab === 'profit') {
      fetchProfitReport();
    } else if (activeTab === 'detail') {
      fetchDetailReport();
    } else if (activeTab === 'balance') {
      fetchBalanceReport();
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

  return (
    <div className="students-page">
      <div className="page-header">
        <h1>报表中心</h1>
      </div>

      {/* 标签页切换 */}
      <div className="tabs" style={{ 
        display: 'flex', 
        gap: '0', 
        marginBottom: '20px',
        borderBottom: '2px solid #e8e8e8'
      }}>
        <button
          className={`tab-btn ${activeTab === 'profit' ? 'active' : ''}`}
          onClick={() => setActiveTab('profit')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: activeTab === 'profit' ? '#1890ff' : 'transparent',
            color: activeTab === 'profit' ? '#fff' : '#666',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'profit' ? 'bold' : 'normal',
            borderRadius: '4px 4px 0 0',
            transition: 'all 0.3s'
          }}
        >
          月度利润表
        </button>
        <button
          className={`tab-btn ${activeTab === 'detail' ? 'active' : ''}`}
          onClick={() => setActiveTab('detail')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: activeTab === 'detail' ? '#1890ff' : 'transparent',
            color: activeTab === 'detail' ? '#fff' : '#666',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'detail' ? 'bold' : 'normal',
            borderRadius: '4px 4px 0 0',
            transition: 'all 0.3s'
          }}
        >
          收支明细表
        </button>
        <button
          className={`tab-btn ${activeTab === 'balance' ? 'active' : ''}`}
          onClick={() => setActiveTab('balance')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: activeTab === 'balance' ? '#1890ff' : 'transparent',
            color: activeTab === 'balance' ? '#fff' : '#666',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'balance' ? 'bold' : 'normal',
            borderRadius: '4px 4px 0 0',
            transition: 'all 0.3s'
          }}
        >
          科目余额表
        </button>
      </div>

      {/* 报表内容 */}
      <div className="tab-content">
        {activeTab === 'profit' && renderProfitReport()}
        {activeTab === 'detail' && renderDetailReport()}
        {activeTab === 'balance' && renderBalanceReport()}
      </div>
    </div>
  );
}
