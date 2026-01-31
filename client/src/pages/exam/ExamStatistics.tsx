import { useState, useEffect, useMemo } from 'react';
import { examRegistrationService } from '../../services/exam';
import { ExamRegistration } from '../../types/exam';
import { studentService } from '../../services/student';
import Pagination from '../../components/common/Pagination';
import '../system/Students.css';
import './ExamStatistics.css';

interface SubjectStat {
  subject: string;
  total: number;
  passed: number;
  failed: number;
  pending: number;
  passRate: string;
}

interface MonthStat {
  month: number;
  monthLabel: string;
  total: number;
  passed: number;
  failed: number;
  pending: number;
  passRate: string;
}

interface YearCompareStat {
  year: number;
  total: number;
  passed: number;
  failed: number;
  pending: number;
  passRate: string;
}

interface CoachStat {
  coachName: string;
  subject: string;
  total: number;
  passed: number;
  failed: number;
  pending: number;
  passRate: string;
}

interface StudentData {
  id: number;
  coach_subject2_name?: string;
  coach_subject3_name?: string;
}

type TabType = 'subject' | 'monthly' | 'yearCompare' | 'coach';

export default function ExamStatistics() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('subject');
  
  // 年份/月份筛选
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(0); // 0表示全年
  
  // 原始数据
  const [allRegistrations, setAllRegistrations] = useState<ExamRegistration[]>([]);
  const [allStudents, setAllStudents] = useState<StudentData[]>([]);
  
  // 分页状态
  const [monthlyPage, setMonthlyPage] = useState(1);
  const [yearComparePage, setYearComparePage] = useState(1);
  const [coachPage, setCoachPage] = useState(1);
  const pageLimit = 10;

  // 年份选项
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);
  
  // 月份选项
  const monthOptions = [
    { value: 0, label: '全年' },
    ...Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1}月` }))
  ];

  useEffect(() => {
    fetchAllData();
  }, []);

  // 切换年份/月份时重置分页和Tab
  useEffect(() => {
    setMonthlyPage(1);
    setYearComparePage(1);
    setCoachPage(1);
    // 如果选择了具体月份且当前在月度概览tab，切换到分科目统计
    if (selectedMonth > 0 && activeTab === 'monthly') {
      setActiveTab('subject');
    }
  }, [selectedYear, selectedMonth]);

  const calculatePassRate = (passed: number, failed: number): string => {
    const completed = passed + failed;
    return completed > 0 ? ((passed / completed) * 100).toFixed(1) + '%' : '0%';
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [regResponse, studentsResponse] = await Promise.all([
        examRegistrationService.getExamRegistrations(),
        studentService.getStudents({ limit: 10000, offset: 0 })
      ]);
      
      setAllRegistrations(regResponse.data || []);
      setAllStudents(studentsResponse.data?.list || []);
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 根据年份/月份筛选数据
  const filteredRegistrations = useMemo(() => {
    return allRegistrations.filter((r: ExamRegistration) => {
      if (!r.exam_date) return false;
      const date = new Date(r.exam_date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      if (year !== selectedYear) return false;
      if (selectedMonth > 0 && month !== selectedMonth) return false;
      return true;
    });
  }, [allRegistrations, selectedYear, selectedMonth]);

  // 去年同期数据
  const lastYearRegistrations = useMemo(() => {
    return allRegistrations.filter((r: ExamRegistration) => {
      if (!r.exam_date) return false;
      const date = new Date(r.exam_date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      if (year !== selectedYear - 1) return false;
      if (selectedMonth > 0 && month !== selectedMonth) return false;
      return true;
    });
  }, [allRegistrations, selectedYear, selectedMonth]);

  // 总览统计
  const overviewStats = useMemo(() => {
    const current = {
      total: filteredRegistrations.length,
      passed: filteredRegistrations.filter((r: ExamRegistration) => r.exam_result === '通过').length,
      failed: filteredRegistrations.filter((r: ExamRegistration) => r.exam_result === '未通过').length,
      pending: filteredRegistrations.filter((r: ExamRegistration) => r.exam_result === '待考试').length
    };
    
    const lastYear = {
      total: lastYearRegistrations.length,
      passed: lastYearRegistrations.filter((r: ExamRegistration) => r.exam_result === '通过').length,
      failed: lastYearRegistrations.filter((r: ExamRegistration) => r.exam_result === '未通过').length
    };
    
    const growth = lastYear.total > 0 
      ? ((current.total - lastYear.total) / lastYear.total * 100).toFixed(1)
      : current.total > 0 ? '+100.0' : '0.0';
    
    return {
      currentTotal: current.total,
      currentPassed: current.passed,
      currentFailed: current.failed,
      currentPending: current.pending,
      passRate: calculatePassRate(current.passed, current.failed),
      lastYearTotal: lastYear.total,
      growth: parseFloat(growth) >= 0 ? `+${growth}%` : `${growth}%`
    };
  }, [filteredRegistrations, lastYearRegistrations]);

  // 分科目统计
  const subjectStats = useMemo((): SubjectStat[] => {
    const subjects = ['科目一', '科目二', '科目三', '科目四'];
    return subjects.map(subject => {
      const subjectRegs = filteredRegistrations.filter((r: ExamRegistration) => r.exam_type === subject);
      const passed = subjectRegs.filter((r: ExamRegistration) => r.exam_result === '通过').length;
      const failed = subjectRegs.filter((r: ExamRegistration) => r.exam_result === '未通过').length;
      const pending = subjectRegs.filter((r: ExamRegistration) => r.exam_result === '待考试').length;
      
      return {
        subject,
        total: subjectRegs.length,
        passed,
        failed,
        pending,
        passRate: calculatePassRate(passed, failed)
      };
    });
  }, [filteredRegistrations]);

  // 月度概览（仅全年模式）
  const monthlyStats = useMemo((): MonthStat[] => {
    if (selectedMonth > 0) return [];
    
    const monthMap = new Map<number, { total: number; passed: number; failed: number; pending: number }>();
    
    // 初始化12个月
    for (let i = 1; i <= 12; i++) {
      monthMap.set(i, { total: 0, passed: 0, failed: 0, pending: 0 });
    }
    
    filteredRegistrations.forEach((r: ExamRegistration) => {
      if (!r.exam_date) return;
      const date = new Date(r.exam_date);
      const month = date.getMonth() + 1;
      const stat = monthMap.get(month)!;
      
      stat.total++;
      if (r.exam_result === '通过') stat.passed++;
      else if (r.exam_result === '未通过') stat.failed++;
      else if (r.exam_result === '待考试') stat.pending++;
    });
    
    return Array.from(monthMap.entries()).map(([month, stat]) => ({
      month,
      monthLabel: `${month}月`,
      total: stat.total,
      passed: stat.passed,
      failed: stat.failed,
      pending: stat.pending,
      passRate: calculatePassRate(stat.passed, stat.failed)
    }));
  }, [filteredRegistrations, selectedMonth]);

  // 年度对比（近5年同期）
  const yearCompareStats = useMemo((): YearCompareStat[] => {
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
    
    return years.map(year => {
      const yearRegs = allRegistrations.filter((r: ExamRegistration) => {
        if (!r.exam_date) return false;
        const date = new Date(r.exam_date);
        const regYear = date.getFullYear();
        const regMonth = date.getMonth() + 1;
        
        if (regYear !== year) return false;
        if (selectedMonth > 0 && regMonth !== selectedMonth) return false;
        return true;
      });
      
      const passed = yearRegs.filter((r: ExamRegistration) => r.exam_result === '通过').length;
      const failed = yearRegs.filter((r: ExamRegistration) => r.exam_result === '未通过').length;
      const pending = yearRegs.filter((r: ExamRegistration) => r.exam_result === '待考试').length;
      
      return {
        year,
        total: yearRegs.length,
        passed,
        failed,
        pending,
        passRate: calculatePassRate(passed, failed)
      };
    });
  }, [allRegistrations, selectedMonth, currentYear]);

  // 教练员统计
  const coachStats = useMemo((): CoachStat[] => {
    const coachMap = new Map<string, { total: number; passed: number; failed: number; pending: number }>();
    
    filteredRegistrations.forEach((r: ExamRegistration) => {
      if (r.exam_type !== '科目二' && r.exam_type !== '科目三') return;
      
      const student = allStudents.find((s: StudentData) => s.id === r.student_id);
      if (!student) return;
      
      const coachName = r.exam_type === '科目二' 
        ? student.coach_subject2_name 
        : student.coach_subject3_name;
      
      if (!coachName) return;
      
      const key = `${coachName}-${r.exam_type}`;
      
      if (!coachMap.has(key)) {
        coachMap.set(key, { total: 0, passed: 0, failed: 0, pending: 0 });
      }
      
      const stat = coachMap.get(key)!;
      stat.total++;
      if (r.exam_result === '通过') stat.passed++;
      else if (r.exam_result === '未通过') stat.failed++;
      else if (r.exam_result === '待考试') stat.pending++;
    });
    
    return Array.from(coachMap.entries())
      .map(([key, stat]) => {
        const [coachName, subject] = key.split('-');
        return {
          coachName,
          subject,
          total: stat.total,
          passed: stat.passed,
          failed: stat.failed,
          pending: stat.pending,
          passRate: calculatePassRate(stat.passed, stat.failed)
        };
      })
      .sort((a, b) => {
        if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
        return b.total - a.total; // 按报考人次降序
      });
  }, [filteredRegistrations, allStudents]);

  // 分页计算
  const paginatedMonthly = useMemo(() => {
    const total = monthlyStats.length;
    const pages = Math.ceil(total / pageLimit);
    const start = (monthlyPage - 1) * pageLimit;
    return { data: monthlyStats.slice(start, start + pageLimit), total, pages };
  }, [monthlyStats, monthlyPage]);

  const paginatedYearCompare = useMemo(() => {
    const total = yearCompareStats.length;
    const pages = Math.ceil(total / pageLimit);
    const start = (yearComparePage - 1) * pageLimit;
    return { data: yearCompareStats.slice(start, start + pageLimit), total, pages };
  }, [yearCompareStats, yearComparePage]);

  const paginatedCoach = useMemo(() => {
    const total = coachStats.length;
    const pages = Math.ceil(total / pageLimit);
    const start = (coachPage - 1) * pageLimit;
    return { data: coachStats.slice(start, start + pageLimit), total, pages };
  }, [coachStats, coachPage]);

  // 时间段标签
  const periodLabel = selectedMonth > 0 
    ? `${selectedYear}年${selectedMonth}月` 
    : `${selectedYear}年`;

  const lastPeriodLabel = selectedMonth > 0 
    ? `${selectedYear - 1}年${selectedMonth}月` 
    : `${selectedYear - 1}年`;

  return (
    <div className="students-page exam-statistics-container">
      <div className="page-header">
        <h1>考试统计</h1>
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span>年份：</span>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="form-select"
            style={{ width: '100px' }}
          >
            {yearOptions.map(year => (
              <option key={year} value={year}>{year}年</option>
            ))}
          </select>
          
          <span>月份：</span>
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="form-select"
            style={{ width: '90px' }}
          >
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          
          <button className="btn btn-primary" onClick={fetchAllData}>
            刷新
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : (
        <>
          {/* 总览卡片 */}
          <div className="statistics-overview">
            <div className="stat-card">
              <div className="stat-value">{overviewStats.currentTotal}</div>
              <div className="stat-label">{periodLabel}报考人次</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{overviewStats.lastYearTotal}</div>
              <div className="stat-label">{lastPeriodLabel}报考</div>
            </div>
            <div className="stat-card primary">
              <div className="stat-value">{overviewStats.growth}</div>
              <div className="stat-label">同比增长</div>
            </div>
            <div className="stat-card warning">
              <div className="stat-value">{overviewStats.currentPending}</div>
              <div className="stat-label">待考试人次</div>
            </div>
            <div className="stat-card success">
              <div className="stat-value">{overviewStats.passRate}</div>
              <div className="stat-label">通过率</div>
            </div>
          </div>

          {/* Tab切换 */}
          <div className="tabs-container" style={{ marginBottom: '16px' }}>
            <div className="tabs">
              <button
                className={`tab ${activeTab === 'subject' ? 'active' : ''}`}
                onClick={() => setActiveTab('subject')}
              >
                分科目统计
              </button>
              {selectedMonth === 0 && (
                <button
                  className={`tab ${activeTab === 'monthly' ? 'active' : ''}`}
                  onClick={() => setActiveTab('monthly')}
                >
                  月度概览
                </button>
              )}
              <button
                className={`tab ${activeTab === 'yearCompare' ? 'active' : ''}`}
                onClick={() => setActiveTab('yearCompare')}
              >
                年度对比
              </button>
              <button
                className={`tab ${activeTab === 'coach' ? 'active' : ''}`}
                onClick={() => setActiveTab('coach')}
              >
                教练员统计
              </button>
            </div>
          </div>

          {/* 分科目统计 */}
          {activeTab === 'subject' && (
            <div className="statistics-detail">
              <table className="statistics-table">
                <thead>
                  <tr>
                    <th>科目</th>
                    <th>报考人次</th>
                    <th>通过</th>
                    <th>未通过</th>
                    <th>待考试</th>
                    <th>通过率</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectStats.map(stat => (
                    <tr key={stat.subject}>
                      <td>{stat.subject}</td>
                      <td>{stat.total}</td>
                      <td className="text-success">{stat.passed}</td>
                      <td className="text-danger">{stat.failed}</td>
                      <td className="text-warning">{stat.pending}</td>
                      <td className="text-primary">{stat.passRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 月度概览 */}
          {activeTab === 'monthly' && selectedMonth === 0 && (
            <div className="statistics-detail">
              <div className="table-scroll-container">
                <table className="statistics-table">
                  <thead>
                    <tr>
                      <th>月份</th>
                      <th>报考人次</th>
                      <th>通过</th>
                      <th>未通过</th>
                      <th>待考试</th>
                      <th>通过率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedMonthly.data.length > 0 ? (
                      paginatedMonthly.data.map(stat => (
                        <tr key={stat.month}>
                          <td>{stat.monthLabel}</td>
                          <td>{stat.total}</td>
                          <td className="text-success">{stat.passed}</td>
                          <td className="text-danger">{stat.failed}</td>
                          <td className="text-warning">{stat.pending}</td>
                          <td className="text-primary">{stat.passRate}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="no-data">暂无数据</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {paginatedMonthly.total > pageLimit && (
                <Pagination
                  page={monthlyPage}
                  pages={paginatedMonthly.pages}
                  total={paginatedMonthly.total}
                  limit={pageLimit}
                  onPageChange={setMonthlyPage}
                  onLimitChange={() => {}}
                />
              )}
            </div>
          )}

          {/* 年度对比 */}
          {activeTab === 'yearCompare' && (
            <div className="statistics-detail">
              <div className="table-scroll-container">
                <table className="statistics-table">
                  <thead>
                    <tr>
                      <th>年份</th>
                      <th>{selectedMonth > 0 ? `${selectedMonth}月` : '全年'}报考</th>
                      <th>通过</th>
                      <th>未通过</th>
                      <th>待考试</th>
                      <th>通过率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedYearCompare.data.length > 0 ? (
                      paginatedYearCompare.data.map(stat => (
                        <tr key={stat.year} className={stat.year === selectedYear ? 'highlight-row' : ''}>
                          <td>{stat.year}年</td>
                          <td>{stat.total}</td>
                          <td className="text-success">{stat.passed}</td>
                          <td className="text-danger">{stat.failed}</td>
                          <td className="text-warning">{stat.pending}</td>
                          <td className="text-primary">{stat.passRate}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="no-data">暂无数据</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {paginatedYearCompare.total > pageLimit && (
                <Pagination
                  page={yearComparePage}
                  pages={paginatedYearCompare.pages}
                  total={paginatedYearCompare.total}
                  limit={pageLimit}
                  onPageChange={setYearComparePage}
                  onLimitChange={() => {}}
                />
              )}
            </div>
          )}

          {/* 教练员统计 */}
          {activeTab === 'coach' && (
            <div className="statistics-detail">
              <div className="table-scroll-container">
                <table className="statistics-table">
                  <thead>
                    <tr>
                      <th>教练姓名</th>
                      <th>科目</th>
                      <th>报考人次</th>
                      <th>通过</th>
                      <th>未通过</th>
                      <th>待考试</th>
                      <th>通过率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCoach.data.length > 0 ? (
                      paginatedCoach.data.map((stat, index) => (
                        <tr key={`${stat.coachName}-${stat.subject}-${index}`}>
                          <td>{stat.coachName}</td>
                          <td>{stat.subject}</td>
                          <td>{stat.total}</td>
                          <td className="text-success">{stat.passed}</td>
                          <td className="text-danger">{stat.failed}</td>
                          <td className="text-warning">{stat.pending}</td>
                          <td className="text-primary">{stat.passRate}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="no-data">暂无数据</td>
                      </tr>
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
                  onLimitChange={() => {}}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
