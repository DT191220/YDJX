import { useState, useEffect } from 'react';
import { examRegistrationService } from '../../services/exam';
import { studentService } from '../../services/student';
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
  month: string;
  total: number;
  passed: number;
  failed: number;
  pending: number;
  passRate: string;
}

interface YearStat {
  year: string;
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

interface StatisticsData {
  totalRegistrations: number;
  passCount: number;
  failCount: number;
  pendingCount: number;
  passRate: string;
  subjectStats: SubjectStat[];
  monthStats: MonthStat[];
  yearStats: YearStat[];
  coachStats: CoachStat[];
}

export default function ExamStatistics() {
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<StatisticsData>({
    totalRegistrations: 0,
    passCount: 0,
    failCount: 0,
    pendingCount: 0,
    passRate: '0%',
    subjectStats: [],
    monthStats: [],
    yearStats: [],
    coachStats: []
  });

  useEffect(() => {
    fetchStatistics();
  }, []);

  const calculatePassRate = (passed: number, failed: number): string => {
    const completed = passed + failed;
    return completed > 0 ? ((passed / completed) * 100).toFixed(1) + '%' : '0%';
  };

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const response = await examRegistrationService.getExamRegistrations();
      const registrations = response.data || [];

      // 计算总体统计
      const passCount = registrations.filter((r: any) => r.exam_result === '通过').length;
      const failCount = registrations.filter((r: any) => r.exam_result === '未通过').length;
      const pendingCount = registrations.filter((r: any) => r.exam_result === '待考试').length;
      const totalRegistrations = registrations.length;
      const passRate = calculatePassRate(passCount, failCount);

      // 按科目统计
      const subjects = ['科目一', '科目二', '科目三', '科目四'];
      const subjectStats = subjects.map(subject => {
        const subjectRegs = registrations.filter((r: any) => r.exam_type === subject);
        const passed = subjectRegs.filter((r: any) => r.exam_result === '通过').length;
        const failed = subjectRegs.filter((r: any) => r.exam_result === '未通过').length;
        const pending = subjectRegs.filter((r: any) => r.exam_result === '待考试').length;

        return {
          subject,
          total: subjectRegs.length,
          passed,
          failed,
          pending,
          passRate: calculatePassRate(passed, failed)
        };
      });

      // 按月度统计
      const monthMap = new Map<string, { total: number; passed: number; failed: number; pending: number }>();
      registrations.forEach((r: any) => {
        if (r.exam_date) {
          const date = new Date(r.exam_date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          if (!monthMap.has(monthKey)) {
            monthMap.set(monthKey, { total: 0, passed: 0, failed: 0, pending: 0 });
          }
          
          const stat = monthMap.get(monthKey)!;
          stat.total++;
          if (r.exam_result === '通过') stat.passed++;
          else if (r.exam_result === '未通过') stat.failed++;
          else if (r.exam_result === '待考试') stat.pending++;
        }
      });

      const monthStats: MonthStat[] = Array.from(monthMap.entries())
        .sort((a, b) => b[0].localeCompare(a[0])) // 按月份降序
        .slice(0, 12) // 最近12个月
        .map(([month, stat]) => ({
          month,
          total: stat.total,
          passed: stat.passed,
          failed: stat.failed,
          pending: stat.pending,
          passRate: calculatePassRate(stat.passed, stat.failed)
        }));

      // 按年度统计
      const yearMap = new Map<string, { total: number; passed: number; failed: number; pending: number }>();
      registrations.forEach((r: any) => {
        if (r.exam_date) {
          const date = new Date(r.exam_date);
          const yearKey = String(date.getFullYear());
          
          if (!yearMap.has(yearKey)) {
            yearMap.set(yearKey, { total: 0, passed: 0, failed: 0, pending: 0 });
          }
          
          const stat = yearMap.get(yearKey)!;
          stat.total++;
          if (r.exam_result === '通过') stat.passed++;
          else if (r.exam_result === '未通过') stat.failed++;
          else if (r.exam_result === '待考试') stat.pending++;
        }
      });

      const yearStats: YearStat[] = Array.from(yearMap.entries())
        .sort((a, b) => b[0].localeCompare(a[0])) // 按年份降序
        .map(([year, stat]) => ({
          year,
          total: stat.total,
          passed: stat.passed,
          failed: stat.failed,
          pending: stat.pending,
          passRate: calculatePassRate(stat.passed, stat.failed)
        }));

      // 按教练统计（科二、科三）
      const studentsResponse = await studentService.getStudents({ limit: 10000, offset: 0 });
      const students = studentsResponse.data?.list || [];

      const coachMap = new Map<string, { total: number; passed: number; failed: number; pending: number }>();
      
      registrations.forEach((r: any) => {
        // 只统计科目二和科目三
        if (r.exam_type !== '科目二' && r.exam_type !== '科目三') return;

        const student = students.find((s: any) => s.id === r.student_id);
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

      const coachStats: CoachStat[] = Array.from(coachMap.entries())
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
          // 先按科目排序，再按教练名排序
          if (a.subject !== b.subject) {
            return a.subject.localeCompare(b.subject);
          }
          return a.coachName.localeCompare(b.coachName);
        });

      setStatistics({
        totalRegistrations,
        passCount,
        failCount,
        pendingCount,
        passRate,
        subjectStats,
        monthStats,
        yearStats,
        coachStats
      });
    } catch (error) {
      console.error('获取统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="exam-statistics-container">
      <div className="page-header">
        <h2>考试统计</h2>
        <button className="btn-primary" onClick={fetchStatistics}>
          刷新数据
        </button>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : (
        <>
          <div className="statistics-overview">
            <div className="stat-card">
              <div className="stat-value">{statistics.totalRegistrations}</div>
              <div className="stat-label">总报考人次</div>
            </div>
            <div className="stat-card success">
              <div className="stat-value">{statistics.passCount}</div>
              <div className="stat-label">通过人次</div>
            </div>
            <div className="stat-card danger">
              <div className="stat-value">{statistics.failCount}</div>
              <div className="stat-label">未通过人次</div>
            </div>
            <div className="stat-card warning">
              <div className="stat-value">{statistics.pendingCount}</div>
              <div className="stat-label">待考试人次</div>
            </div>
            <div className="stat-card primary">
              <div className="stat-value">{statistics.passRate}</div>
              <div className="stat-label">总通过率</div>
            </div>
          </div>

          <div className="statistics-grid">
            <div className="statistics-detail">
              <h3>分科目统计</h3>
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
                  {statistics.subjectStats.map(stat => (
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

            <div className="statistics-detail">
              <h3>年度考试统计</h3>
              <table className="statistics-table">
                <thead>
                  <tr>
                    <th>年份</th>
                    <th>报考人次</th>
                    <th>通过</th>
                    <th>未通过</th>
                    <th>待考试</th>
                    <th>通过率</th>
                  </tr>
                </thead>
                <tbody>
                  {statistics.yearStats.length > 0 ? (
                    statistics.yearStats.map(stat => (
                      <tr key={stat.year}>
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
          </div>

          <div className="statistics-detail full-width">
            <h3>月度考试统计（近12个月）</h3>
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
                {statistics.monthStats.length > 0 ? (
                  statistics.monthStats.map(stat => (
                    <tr key={stat.month}>
                      <td>{stat.month}</td>
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

          <div className="statistics-detail full-width">
            <h3>教练员考试通过情况统计</h3>
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
                {statistics.coachStats.length > 0 ? (
                  statistics.coachStats.map((stat, index) => (
                    <tr key={index}>
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
        </>
      )}
    </div>
  );
}
