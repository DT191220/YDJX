import { useState, useEffect } from 'react';
import { studentService, EnrollmentStatistics } from '../../services/student';
import '../exam/ExamStatistics.css';

export default function EnrollmentStatisticsPage() {
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [statistics, setStatistics] = useState<EnrollmentStatistics | null>(null);

  // 生成年份选项（最近5年）
  const yearOptions = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= currentYear - 4; y--) {
    yearOptions.push(y);
  }

  useEffect(() => {
    fetchStatistics();
  }, [selectedYear]);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const response = await studentService.getEnrollmentStatistics(selectedYear);
      setStatistics(response.data);
    } catch (error) {
      console.error('获取招生统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 计算同比增长率
  const calculateYearOverYear = () => {
    if (!statistics || statistics.lastYearTotal === 0) return '—';
    const rate = ((statistics.yearTotal - statistics.lastYearTotal) / statistics.lastYearTotal * 100).toFixed(1);
    return Number(rate) >= 0 ? `+${rate}%` : `${rate}%`;
  };

  // 获取最大月份招生数用于图表缩放
  const getMaxMonthCount = () => {
    if (!statistics) return 10;
    return Math.max(...statistics.monthlyStats.map(m => m.count), 10);
  };

  if (loading && !statistics) {
    return <div className="exam-statistics-page"><div className="loading">加载中...</div></div>;
  }

  return (
    <div className="exam-statistics-page">
      <div className="page-header">
        <h2>招生统计</h2>
        <div className="year-selector">
          <label>统计年份：</label>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {yearOptions.map(year => (
              <option key={year} value={year}>{year}年</option>
            ))}
          </select>
        </div>
      </div>

      {/* 年度总览卡片 */}
      <div className="statistics-overview">
        <div className="stat-card primary">
          <div className="stat-value">{statistics?.yearTotal || 0}</div>
          <div className="stat-label">{selectedYear}年总招生人数</div>
        </div>
        <div className="stat-card info">
          <div className="stat-value">{statistics?.lastYearTotal || 0}</div>
          <div className="stat-label">{selectedYear - 1}年总招生人数</div>
        </div>
        <div className="stat-card success">
          <div className="stat-value">{calculateYearOverYear()}</div>
          <div className="stat-label">同比增长率</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-value">
            {statistics && statistics.yearTotal > 0 
              ? (statistics.yearTotal / 12).toFixed(1) 
              : 0}
          </div>
          <div className="stat-label">月均招生人数</div>
        </div>
      </div>

      {/* 月度招生趋势 */}
      <div className="statistics-section">
        <h3>月度招生趋势</h3>
        <div className="chart-container">
          <div className="bar-chart">
            {statistics?.monthlyStats.map((item) => (
              <div key={item.month} className="bar-item">
                <div className="bar-wrapper">
                  <div 
                    className="bar" 
                    style={{ 
                      height: `${(item.count / getMaxMonthCount()) * 100}%`,
                      backgroundColor: item.count > 0 ? '#409eff' : '#e4e7ed'
                    }}
                  >
                    {item.count > 0 && <span className="bar-value">{item.count}</span>}
                  </div>
                </div>
                <div className="bar-label">{item.monthName}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="statistics-grid">
        {/* 按班型统计 */}
        <div className="statistics-section">
          <h3>按班型统计</h3>
          <table className="statistics-table">
            <thead>
              <tr>
                <th>班型</th>
                <th>招生人数</th>
                <th>占比</th>
              </tr>
            </thead>
            <tbody>
              {statistics?.byClassType.map((item, index) => (
                <tr key={index}>
                  <td>{item.class_type_name || '未分配'}</td>
                  <td>{item.count}</td>
                  <td>
                    {statistics.yearTotal > 0 
                      ? ((item.count / statistics.yearTotal) * 100).toFixed(1) + '%'
                      : '0%'}
                  </td>
                </tr>
              ))}
              {(!statistics?.byClassType || statistics.byClassType.length === 0) && (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: '#909399' }}>暂无数据</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 按教练统计 */}
        <div className="statistics-section">
          <h3>按教练统计（招生贡献）</h3>
          <table className="statistics-table">
            <thead>
              <tr>
                <th>教练</th>
                <th>招生人数</th>
                <th>占比</th>
              </tr>
            </thead>
            <tbody>
              {statistics?.byCoach.map((item, index) => (
                <tr key={index}>
                  <td>{item.coach_name}</td>
                  <td>{item.count}</td>
                  <td>
                    {statistics.yearTotal > 0 
                      ? ((item.count / statistics.yearTotal) * 100).toFixed(1) + '%'
                      : '0%'}
                  </td>
                </tr>
              ))}
              {(!statistics?.byCoach || statistics.byCoach.length === 0) && (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: '#909399' }}>暂无数据</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
