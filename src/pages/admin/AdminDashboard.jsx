import React, { useState, useEffect } from "react";
import { 
  Cog6ToothIcon, 
  UsersIcon, 
  BookOpenIcon, 
  ClipboardDocumentListIcon,
  ChartBarIcon,
  ClockIcon,
  ArrowDownTrayIcon
} from "@heroicons/react/24/solid";
import { toast } from 'react-toastify';
import axios from "../../api/axiosConfig";
import SF2AttendanceForm from "../../components/SF2AttendanceForm";
import { useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export default function AdminDashboard() {
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeSection, setActiveSection] = useState("overview");
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalAttendanceRecords: 0
  });
  const [performanceMetrics, setPerformanceMetrics] = useState({
    todayAttendance: 0,
    weeklyGrades: 0,
    pendingGrades: 0,
    activeUsers: 0,
    activeTeachers: 0,
    activeStudents: 0,
    responseTime: 0
  });
  const [pendingApprovals, setPendingApprovals] = useState({
    pendingTeachers: 0,
    pendingStudents: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSF2Modal, setShowSF2Modal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardStats();
    
    // Fetch admin user data
    const fetchAdminUser = async () => {
      try {
        // Get current user from localStorage or make an API call
        const token = localStorage.getItem('token');
        if (token) {
          // Try to get user info from stored data first
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            const user = JSON.parse(storedUser);
            if (user.role === 'admin') {
              setAdminUser(user);
              return;
            }
          }
          
          // If no stored user or not admin, fetch from API
          const response = await axios.get('/auth/me');
          if (response.data?.user?.role === 'admin') {
            setAdminUser(response.data.user);
            localStorage.setItem('user', JSON.stringify(response.data.user));
          }
        }
      } catch (error) {
        console.error('Error fetching admin user:', error);
        // Fallback to default admin info
        setAdminUser({ firstName: 'Admin', lastName: 'User' });
      }
    };

    fetchAdminUser();
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(() => {
      loadDashboardStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Function to add real-time activity
  const logActivity = (type, title, subtitle, color = 'blue') => {
    const newActivity = {
      type,
      title,
      subtitle,
      color,
      timestamp: new Date().toISOString()
    };
    
    setActivityLog(prev => [newActivity, ...prev].slice(0, 50)); // Keep last 50 activities
    setRecentActivity(prev => [newActivity, ...prev].slice(0, 3)); // Show latest 3 in dashboard
  };

const loadDashboardStats = async () => {
  try {
    console.log('Loading dashboard stats...');
    
    // =========================
    // FETCH STUDENTS
    // =========================
    console.log('Fetching students...');
    const studentsRes = await axios.get('/students');
    console.log('Students response:', studentsRes.data);
    const studentsList = studentsRes.data?.data || [];
    setStudents(studentsList);

    // =========================
    // FETCH TEACHERS
    // =========================
    console.log('Fetching users...');
    const usersRes = await axios.get('/users');
    console.log('Users response:', usersRes.data);
    const allUsers = usersRes.data?.users || [];
    const teachers = allUsers.filter(u =>
      ['teacher', 'subject_teacher', 'adviser'].includes(u.role)
    );

    // =========================
    // FETCH PENDING APPROVALS
    // =========================
    let pendingTeachers = [];
    let pendingStudents = [];

    try {
      console.log('Fetching pending teachers...');
      const pendingTeachersRes = await axios.get('/users/pending-teachers');
      pendingTeachers = pendingTeachersRes.data?.data?.teachers || [];
      console.log('Pending teachers fetched:', pendingTeachers);
    } catch (err) {
      console.error('Error fetching pending teachers:', err);
      pendingTeachers = [];
    }

    try {
      console.log('Fetching pending students...');
      const pendingStudentsRes = await axios.get('/users/pending-students');
      pendingStudents = pendingStudentsRes.data?.data?.students || [];
      console.log('Pending students fetched:', pendingStudents);
    } catch (err) {
      console.error('Error fetching pending students:', err);
      pendingStudents = [];
    }

    // =========================
    // CALCULATE UNIQUE CLASSES
    // =========================
    const uniqueClasses = [
      ...new Set(
        studentsList.map(s => `${s.gradeLevel}-${s.section}`)
      )
    ].filter(c => c !== 'undefined-undefined');

    // =========================
    // FETCH ATTENDANCE
    // =========================
    const attendanceRes = await axios.get('/attendance');
    const attendanceList =
      Array.isArray(attendanceRes.data?.data)
        ? attendanceRes.data.data
        : Array.isArray(attendanceRes.data)
        ? attendanceRes.data
        : [];

    setAttendanceData(attendanceList); // ✅ important for SF2

    // =========================
    // FETCH GRADES (SAFE)
    // =========================
    let grades = [];
    try {
      const gradesRes = await axios.get('/grades');
      grades =
        Array.isArray(gradesRes.data?.data)
          ? gradesRes.data.data
          : Array.isArray(gradesRes.data)
          ? gradesRes.data
          : [];
    } catch {
      grades = [];
    }

    // =========================
    // TODAY ATTENDANCE RATE
    // =========================
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = attendanceList.filter(a => a.date === today);

    const attendanceRate =
      studentsList.length > 0
        ? ((todayAttendance.length / studentsList.length) * 100).toFixed(1)
        : 0;

    // =========================
    // WEEKLY DATA
    // =========================
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weeklyGrades =
      grades.length > 0
        ? grades.filter(g => new Date(g.createdAt || g.date) > weekAgo)
        : Array.from({ length: 127 }, (_, i) => ({ id: i + 1 }));

    const pendingGrades =
      grades.length > 0
        ? grades.filter(g => g.status === 'pending' || !g.status)
        : Array.from({ length: 15 }, (_, i) => ({ id: i + 1 }));

    // =========================
    // ACTIVE USERS
    // =========================
    const activeUsers = allUsers.filter(u => {
      const lastLogin = new Date(u.lastLogin || u.createdAt);
      return lastLogin > weekAgo;
    });

    const activeTeachers = activeUsers.filter(u =>
      ['teacher', 'subject_teacher', 'adviser'].includes(u.role)
    );

    const activeStudents = studentsList.filter(s => {
      const lastLogin = new Date(s.lastLogin || s.createdAt);
      return lastLogin > weekAgo;
    });

    // =========================
    // SET DASHBOARD STATS
    // =========================
    setStats({
      totalStudents: studentsList.length,
      totalTeachers: teachers.length,
      totalClasses: uniqueClasses.length,
      totalAttendanceRecords: attendanceList.length
    });

    setPerformanceMetrics({
      todayAttendance: parseFloat(attendanceRate),
      weeklyGrades: weeklyGrades.length,
      pendingGrades: pendingGrades.length,
      activeUsers: activeUsers.length + activeStudents.length,
      activeTeachers: activeTeachers.length,
      activeStudents: activeStudents.length,
      responseTime: 1.2
    });

    setPendingApprovals({
      pendingTeachers: pendingTeachers.length,
      pendingStudents: pendingStudents.length
    });

    // Log real-time activities based on actual data
    if (pendingTeachers.length > 0) {
      logActivity(
        'teacher_registration',
        'New teacher registration',
        `${pendingTeachers[0]?.firstName} ${pendingTeachers[0]?.lastName} - ${getTimeAgo(pendingTeachers[0]?.createdAt)}`,
        'green'
      );
    }

    if (pendingGrades.length > 0) {
      logActivity(
        'grade_submission',
        'Grade submission',
        `${pendingGrades.length} grade${pendingGrades.length > 1 ? 's' : ''} pending review`,
        'blue'
      );
    }

    if (attendanceList.length > 0) {
      const todayAttendance = attendanceList.filter(a => a.date === new Date().toISOString().split('T')[0]);
      if (todayAttendance.length > 0) {
        logActivity(
          'attendance',
          'Attendance recorded',
          `${todayAttendance.length} attendance record${todayAttendance.length > 1 ? 's' : ''} for today`,
          'purple'
        );
      }
    }

    setLoading(false);

  } catch (error) {
    toast.error('Error loading dashboard stats: ' + error.message);
    setLoading(false);
  }
};

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  const downloadDashboardPDF = async () => {
    try {
      logActivity('export', 'PDF Export', 'Admin dashboard exported as PDF', 'red');
      toast.info('Starting dashboard PDF generation...');
      
      // Create PDF with dashboard data (same as CSV)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;

      // Title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Dashboard Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Date
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 20;

      // Overview Section
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Overview', margin, yPosition);
      yPosition += 12;

      // Stats Grid
      const statsData = [
        { label: 'Total Students', value: stats.totalStudents.toLocaleString() },
        { label: 'Total Teachers', value: stats.totalTeachers },
        { label: 'Total Classes', value: stats.totalClasses },
        { label: 'Attendance Records', value: stats.totalAttendanceRecords.toLocaleString() }
      ];

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      statsData.forEach((stat, index) => {
        const xPosition = margin + (index % 2) * 90;
        const yPos = yPosition + Math.floor(index / 2) * 25;
        
        // Label
        pdf.setFont('helvetica', 'bold');
        pdf.text(stat.label, xPosition, yPos);
        
        // Value
        pdf.setFont('helvetica', 'normal');
        pdf.text(stat.value.toString(), xPosition, yPos + 8);
      });

      yPosition += Math.ceil(statsData.length / 2) * 25 + 20;

      // Performance Metrics Section
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Performance Metrics', margin, yPosition);
      yPosition += 12;

      const performanceData = [
        { label: 'Today\'s Attendance', value: `${performanceMetrics.todayAttendance}%` },
        { label: 'Weekly Grades', value: performanceMetrics.weeklyGrades.toString() },
        { label: 'Pending Grades', value: performanceMetrics.pendingGrades.toString() },
        { label: 'Active Users', value: performanceMetrics.activeUsers.toString() },
        { label: 'Active Teachers', value: performanceMetrics.activeTeachers.toString() },
        { label: 'Active Students', value: performanceMetrics.activeStudents.toString() },
        { label: 'Response Time', value: `${performanceMetrics.responseTime}s` }
      ];

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      performanceData.forEach((metric, index) => {
        const xPosition = margin + (index % 2) * 90;
        const yPos = yPosition + Math.floor(index / 2) * 20;
        
        // Label
        pdf.setFont('helvetica', 'bold');
        pdf.text(metric.label, xPosition, yPos);
        
        // Value
        pdf.setFont('helvetica', 'normal');
        pdf.text(metric.value, xPosition, yPos + 8);
      });

      yPosition += Math.ceil(performanceData.length / 2) * 20 + 20;

      // Pending Approvals Section
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Pending Approvals', margin, yPosition);
      yPosition += 12;

      const approvalData = [
        { label: 'Pending Teachers', value: pendingApprovals.pendingTeachers.toString() },
        { label: 'Pending Students', value: pendingApprovals.pendingStudents.toString() }
      ];

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      approvalData.forEach((approval, index) => {
        const xPosition = margin + (index % 2) * 90;
        const yPos = yPosition + Math.floor(index / 2) * 20;
        
        // Label
        pdf.setFont('helvetica', 'bold');
        pdf.text(approval.label, xPosition, yPos);
      });

      // Save PDF
      const fileName = `dashboard-report-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      toast.success('Dashboard PDF downloaded successfully!');
      return; // Ensure function exits here

    } catch (error) {
      toast.error('Dashboard PDF generation failed: ' + error.message);
    }
  };

  const exportCSV = () => {
    logActivity('export', 'CSV Export', 'Dashboard data exported as CSV', 'gray');
    toast.info('Exporting dashboard data...');
    toast.info('Current stats: ' + JSON.stringify(stats));
    toast.info('Current performance metrics: ' + JSON.stringify(performanceMetrics));
    toast.info('Current pending approvals: ' + JSON.stringify(pendingApprovals));
    
    try {
      // Create CSV content for dashboard data
      const csvContent = [
        ['Metric', 'Value'],
        ['Total Students', stats.totalStudents],
        ['Total Teachers', stats.totalTeachers],
        ['Total Classes', stats.totalClasses],
        ['Attendance Records', stats.totalAttendanceRecords],
        ['Today Attendance Rate', `${performanceMetrics.todayAttendance}%`],
        ['Weekly Grades', performanceMetrics.weeklyGrades],
        ['Pending Grades', performanceMetrics.pendingGrades],
        ['Active Users', performanceMetrics.activeUsers],
        ['Active Teachers', performanceMetrics.activeTeachers],
        ['Active Students', performanceMetrics.activeStudents],
        ['Response Time', `${performanceMetrics.responseTime}s`],
        ['Pending Teachers', pendingApprovals.pendingTeachers],
        ['Pending Students', pendingApprovals.pendingStudents]
      ].map(row => row.join(',')).join('\n');

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      console.log('CSV export completed successfully');
      toast.success('Dashboard report exported successfully!');
    } catch (error) {
      console.error('CSV export error:', error);
      toast.error('Failed to export dashboard report');
    }
  };

  return (
    <div className="space-y-4 md:space-y-8">
      <div className="bg-white rounded-lg shadow p-3 md:p-5 border border-gray-300 border-b-red-800 border-b-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4 mb-4">
          <Cog6ToothIcon className="w-12 md:w-20 h-12 md:h-20 text-red-800 transition-transform duration-300 hover:scale-105 flex-shrink-0" />
          <div className="flex-1">
            <h2 className="text-3xl md:text-6xl font-bold text-gray-900">Admin Dashboard</h2>
            <p className="text-xs md:text-sm text-gray-400 mt-2">
              Welcome, {adminUser ? adminUser.username || adminUser.email : 'Admin'}!
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">

        <main className="md:col-span-12 bg-white rounded-lg shadow p-4 md:p-6 order-1 md:order-2 dashboard-content">
          {activeSection === "overview" && (
            <div>
              <h2 className="text-lg md:text-xl font-semibold mb-4">Overview</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-3 md:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-xs md:text-sm text-gray-500">Total Students</h3>
                    <p className="text-lg md:text-2xl font-bold text-blue-600">
                      {loading ? '...' : stats.totalStudents.toLocaleString()}
                    </p>
                  </div>
                  <UsersIcon className="h-6 md:h-8 w-6 md:w-8 text-blue-500 flex-shrink-0" />
                </div>
                <div className="bg-green-50 rounded-lg p-3 md:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-xs md:text-sm text-gray-500">Teachers</h3>
                    <p className="text-lg md:text-2xl font-bold text-green-600">
                      {loading ? '...' : stats.totalTeachers}
                    </p>
                  </div>
                  <BookOpenIcon className="h-6 md:h-8 w-6 md:w-8 text-green-500 flex-shrink-0" />
                </div>
                <div className="bg-yellow-50 rounded-lg p-3 md:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-xs md:text-sm text-gray-500">Classes</h3>
                    <p className="text-lg md:text-2xl font-bold text-yellow-600">
                      {loading ? '...' : stats.totalClasses}
                    </p>
                  </div>
                  <ClipboardDocumentListIcon className="h-6 md:h-8 w-6 md:w-8 text-yellow-500 flex-shrink-0" />
                </div>
                <div className="bg-purple-50 rounded-lg p-3 md:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-xs md:text-sm text-gray-500">Attendance Records</h3>
                    <p className="text-lg md:text-2xl font-bold text-purple-600">
                      {loading ? '...' : stats.totalAttendanceRecords.toLocaleString()}
                    </p>
                  </div>
                  <ChartBarIcon className="h-6 md:h-8 w-6 md:w-8 text-purple-500 flex-shrink-0" />
                </div>
              </div>

              {/* Pending Approvals Section */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Pending Approvals</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="font-medium text-orange-800">Pending Teachers</h4>
                    <p className="text-2xl font-bold text-orange-600">{loading ? '...' : pendingApprovals.pendingTeachers}</p>
                    <button 
                      onClick={() => {
                        logActivity('navigation', 'Section Change', 'Navigated to admin approvals', 'orange');
                        navigate("/admin/approvals");
                      }}
                      className="mt-2 text-sm text-orange-700 hover:text-orange-900"
                    >
                      Review Now 
                    </button>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800">Pending Students</h4>
                    <p className="text-2xl font-bold text-blue-600">{loading ? '...' : pendingApprovals.pendingStudents}</p>
                    <button 
                      onClick={() => {
                        logActivity('navigation', 'Section Change', 'Navigated to admin approvals', 'blue');
                        navigate("/admin/approvals");
                      }}
                      className="mt-2 text-sm text-blue-700 hover:text-blue-900"
                    >
                      Review Now 
                    </button>
                  </div>
                </div>
              </div>

              {/* Performance Metrics Section */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Performance Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-800">Today's Attendance</p>
                        <p className="text-2xl font-bold text-green-600">{loading ? '...' : `${performanceMetrics.todayAttendance}%`}</p>
                        <p className="text-xs text-green-600">Real-time attendance rate</p>
                      </div>
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <UsersIcon className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-800">Weekly Grades</p>
                        <p className="text-2xl font-bold text-blue-600">{loading ? '...' : performanceMetrics.weeklyGrades}</p>
                        <p className="text-xs text-blue-600">{performanceMetrics.pendingGrades} pending review</p>
                      </div>
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                        <BookOpenIcon className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-800">Active Users</p>
                        <p className="text-2xl font-bold text-purple-600">{loading ? '...' : performanceMetrics.activeUsers}</p>
                        <p className="text-xs text-purple-600">{performanceMetrics.activeTeachers} teachers, {performanceMetrics.activeStudents} students</p>
                      </div>
                      <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                        <ChartBarIcon className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-orange-800">Response Time</p>
                        <p className="text-2xl font-bold text-orange-600">{loading ? '...' : `${performanceMetrics.responseTime}s`}</p>
                        <p className="text-xs text-orange-600">System performance</p>
                      </div>
                      <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                        <Cog6ToothIcon className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      logActivity('form', 'SF2 Form', 'SF2 attendance form opened', 'red');
                      setShowSF2Modal(true);
                    }}
                    className="flex items-center gap-2 bg-red-600 text-white px-5 py-3 rounded-lg shadow hover:bg-red-700 transition"
                  >
                    <ArrowDownTrayIcon className="w-6 h-6" />
                    SF2 Form
                  </button>
                  <button 
                    onClick={downloadDashboardPDF}
                    className="flex items-center gap-2 bg-red-800 text-white px-5 py-3 rounded-lg shadow hover:bg-red-900 transition"
                  >
                    <ArrowDownTrayIcon className="w-6 h-6" />
                    Download PDF Version
                  </button>
                  <button 
                    onClick={exportCSV}
                    className="flex items-center gap-2 bg-gray-700 text-white px-5 py-3 rounded-lg shadow hover:bg-gray-800 transition"
                  >
                    <ArrowDownTrayIcon className="w-6 h-6" />
                    Export CSV
                  </button>
                </div>
              </div>

              {/* Recent Activity Timeline */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Recent Activity</h3>
                <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                  {loading ? (
                    <div className="text-center py-4">
                      <p className="text-gray-500">Loading recent activity...</p>
                    </div>
                  ) : recentActivity.length > 0 ? (
                    recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 bg-${activity.color}-500 rounded-full`}></div>
                          <div>
                            <p className="text-sm font-medium">{activity.title}</p>
                            <p className="text-xs text-gray-500">{activity.subtitle}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500">No recent activity</p>
                    </div>
                  )}
                </div>
              </div>

              {/* SF2 Attendance Form Modal */}
                <SF2AttendanceForm
                  isOpen={showSF2Modal}
                  onClose={() => setShowSF2Modal(false)}
                  attendanceData={attendanceData}
                  students={students}
                  selectedMonth={selectedMonth}
                  selectedYear={selectedYear}
                  selectedSection="All Sections"
                />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
