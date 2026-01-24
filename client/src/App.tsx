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
                    <Route path="/exam/venues" element={<ExamVenues />} />
                    <Route path="/exam/schedules" element={<ExamSchedules />} />
                    <Route path="/exam/registrations" element={<ExamRegistrations />} />
                    <Route path="/exam/statistics" element={<ExamStatistics />} />
                    <Route path="/coaches/info" element={<Coaches />} />
                    <Route path="/coaches/salary-config" element={<SalaryConfig />} />
                    <Route path="/coaches/salary" element={<CoachSalary />} />
                    <Route path="/learning/progress" element={<StudentProgress />} />
                    <Route path="/learning/plans" element={<StudyPlans />} />
                    <Route path="/system/users" element={<Users />} />
                    <Route path="/system/roles" element={<Roles />} />
                    <Route path="/system/permissions" element={<Permissions />} />
                    <Route path="/system/dicts" element={<Dicts />} />
                    <Route path="/system/class-types" element={<ClassTypes />} />
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
