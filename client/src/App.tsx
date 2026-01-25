import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import ProtectedRoute from './components/common/ProtectedRoute'
import Layout from './components/common/Layout'
import Login from './pages/Login'
import Home from './pages/Home'
import Users from './pages/system/Users'
import Roles from './pages/system/Roles'
import Permissions from './pages/system/Permissions'
import Dicts from './pages/system/Dicts'
import Menus from './pages/system/Menus'
import Students from './pages/system/Students'
import StudentPayment from './pages/students/StudentPayment'
import EnrollmentStatistics from './pages/students/EnrollmentStatistics'
import ClassTypes from './pages/system/ClassTypes'
import ExamVenues from './pages/exam/ExamVenues'
import ExamSchedules from './pages/exam/ExamSchedules'
import StudentProgress from './pages/learning/StudentProgress'
import StudyPlans from './pages/learning/StudyPlans'
import ExamRegistrations from './pages/exam/ExamRegistrations'
import ExamStatistics from './pages/exam/ExamStatistics'
import Coaches from './pages/coach/Coaches'
import SalaryConfig from './pages/coach/SalaryConfig'
import CoachSalary from './pages/coach/CoachSalary'
import Subjects from './pages/finance/Subjects'
import Vouchers from './pages/finance/Vouchers'
import VoucherEntry from './pages/finance/VoucherEntry'
import HeadquarterConfig from './pages/finance/HeadquarterConfig'
import Reports from './pages/finance/Reports'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/students/entry" element={<Students />} />
                    <Route path="/students/payment" element={<StudentPayment />} />
                    <Route path="/students/statistics" element={<EnrollmentStatistics />} />
                    <Route path="/students/headquarter-config" element={<HeadquarterConfig />} />
                    <Route path="/students/class-types" element={<ClassTypes />} />
                    <Route path="/exam/venues" element={<ExamVenues />} />
                    <Route path="/exam/schedules" element={<ExamSchedules />} />
                    <Route path="/exam/registrations" element={<ExamRegistrations />} />
                    <Route path="/exam/statistics" element={<ExamStatistics />} />
                    <Route path="/coaches/info" element={<Coaches />} />
                    <Route path="/coaches/salary-config" element={<SalaryConfig />} />
                    <Route path="/coaches/salary" element={<CoachSalary />} />
                    <Route path="/finance/subjects" element={<Subjects />} />
                    <Route path="/finance/vouchers" element={<Vouchers />} />
                    <Route path="/finance/voucher-entry" element={<VoucherEntry />} />
                    <Route path="/finance/reports" element={<Reports />} />
                    <Route path="/learning/progress" element={<StudentProgress />} />
                    <Route path="/learning/plans" element={<StudyPlans />} />
                    <Route path="/system/users" element={<Users />} />
                    <Route path="/system/roles" element={<Roles />} />
                    <Route path="/system/permissions" element={<Permissions />} />
                    <Route path="/system/dicts" element={<Dicts />} />
                    <Route path="/system/menus" element={<Menus />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
