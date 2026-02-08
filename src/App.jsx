import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from '@react-oauth/google';
import CreateAccount from "./pages/auth/CreateAccount";
import LoginPage from "./pages/auth/LoginPage";
import GoogleCallbackPage from "./pages/auth/GoogleCallbackPage";
import ForgotPassword from "./pages/auth/ForgotPassword";

import StudentTopbar from "./layouts/student/StudentTopbar.jsx";
import StudentDashboard from "./pages/student/StudentDashboard.jsx";
import GradesTable from "./components/student/GradesTable.jsx";  
import AttendanceCalendar from "./components/student/AttendanceCalendar.jsx";
import CustomerServicePage from "./pages/student/CustomerServicePage.jsx";

import TeacherLayout from "./layouts/teacher/TeacherLayout";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import GradeLevel from "./pages/teacher/GradeLevel.jsx";
import EditGrades from "./pages/teacher/EditGrades.jsx";
import ClassList from "./pages/teacher/ClassList";
import QRCodePortal from "./pages/teacher/QRCodePortal.jsx";
import ReportsPage from "./pages/teacher/ReportsPage";
import CustomerService from "./pages/teacher/CustomerService";
import TeacherProfile from "./pages/teacher/TeacherProfile";

import AdminLayout from "./layouts/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminTeachers from "./pages/admin/AdminTeachers";
import AdminApprovals from "./pages/admin/AdminApprovals";
import AdminTeacherApproval from "./pages/admin/AdminTeacherApproval";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminCreateK3 from "./pages/admin/AdminCreateK3.jsx";
import AdminGrades from "./pages/admin/AdminGrades";
import AdminClasses from "./pages/admin/AdminClasses";
import AdminClassList from "./pages/admin/AdminClassList.jsx";
import AdminAssignAdviser from "./pages/admin/AdminAssignAdviser.jsx";
import AdminAssignSubjectTeacher from "./pages/admin/AdminAssignSubjectTeacher.jsx";
import AdminAttendance from "./pages/admin/AdminAttendance";
import AdminReports from "./pages/admin/AdminReports";
import AdminCreateTeacher from "./pages/admin/AdminCreateTeacher.jsx";

const GOOGLE_CLIENT_ID = "545992268289-4fp8qedhktkyccfhfdedkjpn2pc6.apps.googleusercontent.com";

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/create-account" replace />} />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/google-callback" element={<GoogleCallbackPage />} />
          <Route path="/create-account" element={<CreateAccount />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route path="/layouts/student/student-topbar" element={<StudentTopbar />} />
          <Route path="/student/student-dashboard" element={<StudentDashboard />} />
          <Route path="/student/grades-table" element={<GradesTable />} />
          <Route path="/student/attendance-calendar" element={<AttendanceCalendar />} />
          <Route path="/student/customer-service-page" element={<CustomerServicePage />} />

          <Route element={<TeacherLayout />}>
            <Route path="/teacher/teacher-dashboard" element={<TeacherDashboard />} />
            <Route path="/teacher/teacher-profile" element={<TeacherProfile />} />
            <Route path="/grade-level" element={<GradeLevel />} />
            <Route path="/edit-grades" element={<EditGrades />} />
            <Route path="/class-list" element={<ClassList />} />
            <Route path="/qr-portal" element={<QRCodePortal />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/customer-service" element={<CustomerService />} />
          </Route>

          <Route element={<AdminLayout />}>
            <Route path="/admin/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/admin/admin-teachers" element={<AdminTeachers />} />
            <Route path="/admin/approvals" element={<AdminApprovals />} />
            <Route path="/admin/teacher-approvals" element={<AdminTeacherApproval />} />
            <Route path="/admin/admin-students" element={<AdminStudents />} />
            <Route path="/admin/admin/create-k3" element={<AdminCreateK3 />} />
            <Route path="/admin/admin-grades" element={<AdminGrades />} />
            <Route path="/admin/admin-classes" element={<AdminClasses />} />
            <Route path="/admin/assign-adviser" element={<AdminAssignAdviser />} />
            <Route path="/admin/assign-subject-teacher" element={<AdminAssignSubjectTeacher />} />
            <Route path="/admin/admin/classlist/:id" element={<AdminClassList />} />
            <Route path="/admin/admin-attendance" element={<AdminAttendance />} />
            <Route path="/admin/admin-reports" element={<AdminReports />} />
            <Route path="/admin/create-teacher" element={<AdminCreateTeacher />} />
          </Route>

          <Route path="*" element={<div className="p-20 text-center text-3xl font-bold">404 - Page Not Found</div>} />
        </Routes>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;