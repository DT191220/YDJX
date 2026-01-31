import { useState, useEffect, useMemo } from 'react';
import { studentService, EnrollmentStatistics } from '../../services/student';
import Pagination from '../../components/common/Pagination';
import '../system/Students.css';
import '../exam/ExamStatistics.css';

type TabType = 'overview' | 'classType' | 'coach' | 'coachDetail';

export default function EnrollmentStatisticsPage() {
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(0); // 0表示全年
  const [statistics, setStatistics] = useState<EnrollmentStatistics | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // 分页状态
  const [overviewPage, setOverviewPage] = useState(1);
  const [classTypePage, setClassTypePage] = useState(1);
  const [coachPage, setCoachPage] = useState(1);
  const [coachDetailPage, setCoachDetailPage] = useState(1);
  const pageLimit = 10;

  // 生成年份选项（最近5年）
  const yearOptions = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= currentYear - 4; y--) {
    yearOptions.push(y);
  }

  // 月份选项
  const monthOptions = [
    { value: 0, label: '全年' },
    ...Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1}月` }))
  ];

  useEffect(() => {
    fetchStatistics();
  }, [selectedYear, selectedMonth]);

  // 切换筛选条件或页签时重置分页
  useEffect(() => {
    setOverviewPage(1);
    setClassTypePage(1);
    setCoachPage(1);
    setCoachDetailPage(1);
  }, [selectedYear, selectedMonth, activeTab]);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const response = await studentService.getEnrollmentStatistics(selectedYear, selectedMonth);
      setStatistics(response.data ?? null);
    } catch (error) {
      console.error('获取招生统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 计算同比增长率
  const calculateYearOverYear = () => {
    if (!statistics || statistics.lastPeriodTotal === 0) return '—';
    const rate = ((statistics.currentTotal - statistics.lastPeriodTotal) / statistics.lastPeriodTotal * 100).toFixed(1);
    return Number(rate) >= 0 ? `+${rate}%` : `${rate}%`;
  };

  // 分页计算
  const paginate = <T,>(data: T[], page: number) => {
    const total = data.length;
    const pages = Math.ceil(total / pageLimit);
    const start = (page - 1) * pageLimit;
    return { data: data.slice(start, start + pageLimit), total, pages };
  };

  const paginatedOverview = useMemo(() => 
    paginate(statistics?.monthlyStats || [], overviewPage), 
    [statistics?.monthlyStats, overviewPage]
  );
  
  const paginatedClassType = useMemo(() => 
    paginate(statistics?.byClassType || [], classTypePage), 
    [statistics?.byClassType, classTypePage]
  );
  
  const paginatedCoach = useMemo(() => 
    paginate(statistics?.byCoach || [], coachPage), 
    [statistics?.byCoach, coachPage]
  );
  
  const paginatedCoachDetail = useMemo(() => 
    paginate(statistics?.coachClassType || [], coachDetailPage), 
    [statistics?.coachClassType, coachDetailPage]
  );

  // 获取时间范围描述
  const getPeriodLabel = () => {
    if (selectedMonth === 0) return `${selectedYear}年`;
    return `${selectedYear}年${selectedMonth}月`;
  };

  if (loading && !statistics) {
    return <div className="students-page exam-statistics-container"><div className="loading">加载中...</div></div>;
  }

  return (
    <div className="students-page exam-statistics-container">
      <div className="page-header">
        <h1>招生统计</h1>
        <div className="header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="year-selector">
            <label>年份：</label>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              {yearOptions.map(year => (
                <option key={year} value={year}>{year}年</option>
              ))}
            </select>
          </div>
          <div className="year-selector">
            <label>月份：</label>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            >
              {monthOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" onClick={fetchStatistics}>
            刷新
          </button>
        </div>
      </div>

      {/* 统计总览卡片 */}
      <div className="statistics-overview">
        <div className="stat-card primary">
          <div className="stat-value">{statistics?.currentTotal || 0}</div>
          <div className="stat-label">{getPeriodLabel()}招生人数</div>
        </div>
        {selectedMonth === 0 && (
          <div className="stat-card">
            <div className="stat-value">{statistics?.lastPeriodTotal || 0}</div>
            <div className="stat-label">{selectedYear - 1}年招生人数</div>
          </div>
        )}
        {selectedMonth > 0 && (
          <div className="stat-card">
            <div className="stat-value">{statistics?.lastPeriodTotal || 0}</div>
            <div className="stat-label">{selectedYear - 1}年{selectedMonth}月</div>
          </div>
        )}
        <div className="stat-card success">
          <div className="stat-value">{calculateYearOverYear()}</div>
          <div className="stat-label">同比增长</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-value">{statistics?.byCoach?.length || 0}</div>
          <div className="stat-label">招生教练数</div>
        </div>
      </div>

      {/* 页签切换 */}
      <div className="tabs-container" style={{ marginBottom: '16px' }}>
        <div className="tabs">
          {selectedMonth === 0 && (
            <button
              className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              月度概览
            </button>
          )}
          <button
            className={`tab ${activeTab === 'classType' ? 'active' : ''}`}
            onClick={() => setActiveTab('classType')}
          >
            班型统计
          </button>
          <button
            className={`tab ${activeTab === 'coach' ? 'active' : ''}`}
            onClick={() => setActiveTab('coach')}
          >
            教练统计
          </button>
          <button
            className={`tab ${activeTab === 'coachDetail' ? 'active' : ''}`}
            onClick={() => setActiveTab('coachDetail')}
          >
            教练-班型明细
          </button>
        </div>
      </div>

      {/* 月度概览（仅全年时显示） */}
      {activeTab === 'overview' && selectedMonth === 0 && (
        <div className="statistics-detail">
          <div className="table-scroll-container">
            <table className="statistics-table">
              <thead>
                <tr>
                  <th>月份</th>
                  <th>招生人数</th>
                  <th>占比</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOverview.data.length > 0 ? (
                  paginatedOverview.data.map((item) => (
                    <tr key={item.month}>
                      <td>{item.monthName}</td>
                      <td className="text-primary" style={{ fontWeight: 600 }}>{item.count}</td>
                      <td>
                        {statistics && statistics.yearTotal > 0 
                          ? ((item.count / statistics.yearTotal) * 100).toFixed(1) + '%'
                          : '0%'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={3} className="no-data">暂无数据</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {paginatedOverview.total > pageLimit && (
            <Pagination
              page={overviewPage}
              pages={paginatedOverview.pages}
              total={paginatedOverview.total}
              limit={pageLimit}
              onPageChange={setOverviewPage}
            />
          )}
        </div>
      )}

      {/* 班型统计 */}
      {activeTab === 'classType' && (
        <div className="statistics-detail">
          <div className="table-scroll-container">
            <table className="statistics-table">
              <thead>
                <tr>
                  <th>班型</th>
                  <th>招生人数</th>
                  <th>占比</th>
                </tr>
              </thead>
              <tbody>
                {paginatedClassType.data.length > 0 ? (
                  paginatedClassType.data.map((item, index) => (
                    <tr key={index}>
                      <td>{item.class_type_name || '未分配'}</td>
                      <td className="text-primary" style={{ fontWeight: 600 }}>{item.count}</td>
                      <td>
                        {statistics && statistics.currentTotal > 0 
                          ? ((item.count / statistics.currentTotal) * 100).toFixed(1) + '%'
                          : '0%'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={3} className="no-data">暂无数据</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {paginatedClassType.total > pageLimit && (
            <Pagination
              page={classTypePage}
              pages={paginatedClassType.pages}
              total={paginatedClassType.total}
              limit={pageLimit}
              onPageChange={setClassTypePage}
            />
          )}
        </div>
      )}

      {/* 教练统计 */}
      {activeTab === 'coach' && (
        <div className="statistics-detail">
          <div className="table-scroll-container">
            <table className="statistics-table">
              <thead>
                <tr>
                  <th>教练</th>
                  <th>招生人数</th>
                  <th>占比</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCoach.data.length > 0 ? (
                  paginatedCoach.data.map((item, index) => (
                    <tr key={index}>
                      <td>{item.coach_name}</td>
                      <td className="text-primary" style={{ fontWeight: 600 }}>{item.count}</td>
                      <td>
                        {statistics && statistics.currentTotal > 0 
                          ? ((item.count / statistics.currentTotal) * 100).toFixed(1) + '%'
                          : '0%'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={3} className="no-data">暂无数据</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {paginatedCoach.total > pageLimit && (
            <Pagination
              page={coachPage}
              pages={paginatedCoach.pages}
              total={paginatedCoach.total}
              limit={pageLimit}
              onPageChange={setCoachPage}
            />
          )}
        </div>
      )}

      {/* 教练-班型明细 */}
      {activeTab === 'coachDetail' && (
        <div className="statistics-detail">
          <div className="table-scroll-container">
            <table className="statistics-table">
              <thead>
                <tr>
                  <th>教练</th>
                  <th>班型</th>
                  <th>招生人数</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCoachDetail.data.length > 0 ? (
                  paginatedCoachDetail.data.map((item, index) => (
                    <tr key={index}>
                      <td>{item.coach_name}</td>
                      <td>{item.class_type_name || '未分配'}</td>
                      <td className="text-primary" style={{ fontWeight: 600 }}>{item.count}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={3} className="no-data">暂无数据</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {paginatedCoachDetail.total > pageLimit && (
            <Pagination
              page={coachDetailPage}
              pages={paginatedCoachDetail.pages}
              total={paginatedCoachDetail.total}
              limit={pageLimit}
              onPageChange={setCoachDetailPage}
            />
          )}
        </div>
      )}
    </div>
  );
}
