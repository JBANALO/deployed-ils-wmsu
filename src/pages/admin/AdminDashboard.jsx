import React, { useState, useEffect } from "react";
import { 
  Cog6ToothIcon, 
  UsersIcon, 
  BookOpenIcon, 
  ClipboardDocumentListIcon,
  ChartBarIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon
} from "@heroicons/react/24/solid";
import { toast } from 'react-toastify';
import axios from "../../api/axiosConfig";
import SF2AttendanceForm from "../../components/SF2AttendanceForm";
import { useNavigate } from "react-router-dom";
import { useSchoolYear } from "../../context/SchoolYearContext";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export default function AdminDashboard() {
  const { viewingSchoolYear, setViewingSchoolYear, setActiveSchoolYear: setContextActiveSchoolYear } = useSchoolYear();
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
  const [performanceBands, setPerformanceBands] = useState({
    topPerformers: [],
    lowestPerformers: []
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSF2Modal, setShowSF2Modal] = useState(false);
  const [activeSchoolYear, setActiveSchoolYear] = useState(null);
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedSchoolYearId, setSelectedSchoolYearId] = useState('');
  
  // Student Performance State
  const [gradeLevels, setGradeLevels] = useState([]);
  const [sectionsForTop, setSectionsForTop] = useState([]);
  const [sectionsForBottom, setSectionsForBottom] = useState([]);
  const [selectedGradeLevelForTop, setSelectedGradeLevelForTop] = useState('');
  const [selectedSectionForTop, setSelectedSectionForTop] = useState('');
  const [selectedGradeLevelForBottom, setSelectedGradeLevelForBottom] = useState('');
  const [selectedSectionForBottom, setSelectedSectionForBottom] = useState('');
  const [topStudents, setTopStudents] = useState([]);
  const [bottomStudents, setBottomStudents] = useState([]);
  const [loadingTopStudents, setLoadingTopStudents] = useState(false);
  const [loadingBottomStudents, setLoadingBottomStudents] = useState(false);
  const navigate = useNavigate();

  const formatSchoolYearLabel = (label = '') => {
    const clean = String(label).trim();
    if (!clean) return clean;
    if (clean.includes('-')) return clean;
    const digits = clean.replace(/\D/g, '');
    if (digits.length === 8) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return clean;
  };

  useEffect(() => {
    loadDashboardStats();
    fetchSchoolYears();
    
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
    
    // Set up real-time updates every 15 seconds for better responsiveness
    const interval = setInterval(() => {
      loadDashboardStats();
    }, 15000);
    
    return () => clearInterval(interval);
  }, []);

  // Add visibility change listener to refresh when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadDashboardStats();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (viewingSchoolYear?.id) {
      setSelectedSchoolYearId(String(viewingSchoolYear.id));
    }
  }, [viewingSchoolYear?.id]);

  // Initialize grade levels and sections
  useEffect(() => {
    fetchGradeLevelsAndSections();
  }, [selectedSchoolYearId]);

  // Update sections when grade level changes for top students
  useEffect(() => {
    if (selectedGradeLevelForTop) {
      fetchGradeLevelsAndSections();
    } else {
      setSectionsForTop([]);
    }
    fetchTopStudents();
  }, [selectedGradeLevelForTop, selectedSectionForTop, selectedSchoolYearId]);

  // Update sections when grade level changes for bottom students
  useEffect(() => {
    if (selectedGradeLevelForBottom) {
      fetchGradeLevelsAndSections();
    } else {
      setSectionsForBottom([]);
    }
    fetchBottomStudents();
  }, [selectedGradeLevelForBottom, selectedSectionForBottom, selectedSchoolYearId]);

  useEffect(() => {
    const handleFocus = () => {
      loadDashboardStats();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [selectedSchoolYearId]);

  useEffect(() => {
    if (selectedSchoolYearId) {
      loadDashboardStats(selectedSchoolYearId);
    }
  }, [selectedSchoolYearId]);

  const fetchSchoolYears = async () => {
    try {
      const res = await axios.get('/school-years');
      const list = res.data?.data || [];
      const normalized = list.map((sy) => ({ ...sy, label: formatSchoolYearLabel(sy.label) }));
      setSchoolYears(normalized);

      const activeFromList = normalized.find((sy) => Number(sy.is_active) === 1) || null;
      if (activeFromList) {
        setActiveSchoolYear((prev) => prev || activeFromList);
        setContextActiveSchoolYear(activeFromList);
      }
    } catch (err) {
      console.error('Error fetching school years:', err);
    }
  };

  // Fetch grade levels and sections
  const fetchGradeLevelsAndSections = async () => {
    try {
      const response = await axios.get('/students', {
        params: selectedSchoolYearId ? { schoolYearId: selectedSchoolYearId } : {}
      });
      
      const students = response.data?.data || [];
      
      // Extract unique grade levels
      const uniqueGradeLevels = [...new Set(students.map(s => s.gradeLevel).filter(Boolean))];
      setGradeLevels(uniqueGradeLevels.sort());
      
      // Extract sections for each grade level
      if (selectedGradeLevelForTop) {
        const sectionsForSelectedGrade = [...new Set(
          students
            .filter(s => s.gradeLevel === selectedGradeLevelForTop)
            .map(s => s.section)
            .filter(Boolean)
        )].sort();
        setSectionsForTop(sectionsForSelectedGrade);
      }
      
      if (selectedGradeLevelForBottom) {
        const sectionsForSelectedGrade = [...new Set(
          students
            .filter(s => s.gradeLevel === selectedGradeLevelForBottom)
            .map(s => s.section)
            .filter(Boolean)
        )].sort();
        setSectionsForBottom(sectionsForSelectedGrade);
      }
    } catch (error) {
      console.error('Error fetching grade levels and sections:', error);
    }
  };

  // Fetch top performing students
  const fetchTopStudents = async () => {
    setLoadingTopStudents(true);
    try {
      const params = {
        limit: 5,
        sortBy: 'average',
        sortOrder: 'desc'
      };
      
      if (selectedSchoolYearId) {
        params.schoolYearId = selectedSchoolYearId;
      }
      
      if (selectedGradeLevelForTop) {
        params.gradeLevel = selectedGradeLevelForTop;
      }
      
      if (selectedSectionForTop) {
        params.section = selectedSectionForTop;
      }
      
      const response = await axios.get('/students/ranking', { params });
      
      const topStudentsData = response.data?.data || [];
      const formattedTopStudents = topStudentsData.map((student, index) => ({
        id: student.id,
        name: `${student.lastName}, ${student.firstName}`,
        avg: student.average || student.avg || 0,
        rank: index + 1
      }));
      
      setTopStudents(formattedTopStudents);
    } catch (error) {
      console.error('Error fetching top students:', error);
      setTopStudents([]);
    } finally {
      setLoadingTopStudents(false);
    }
  };

  // Fetch bottom performing students
  const fetchBottomStudents = async () => {
    setLoadingBottomStudents(true);
    try {
      const params = {
        limit: 5,
        sortBy: 'average',
        sortOrder: 'asc'
      };
      
      if (selectedSchoolYearId) {
        params.schoolYearId = selectedSchoolYearId;
      }
      
      if (selectedGradeLevelForBottom) {
        params.gradeLevel = selectedGradeLevelForBottom;
      }
      
      if (selectedSectionForBottom) {
        params.section = selectedSectionForBottom;
      }
      
      const response = await axios.get('/students/ranking', { params });
      
      const bottomStudentsData = response.data?.data || [];
      const formattedBottomStudents = bottomStudentsData.map((student, index) => ({
        id: student.id,
        name: `${student.lastName}, ${student.firstName}`,
        avg: student.average || student.avg || 0,
        rank: index + 1
      }));
      
      setBottomStudents(formattedBottomStudents);
    } catch (error) {
      console.error('Error fetching bottom students:', error);
      setBottomStudents([]);
    } finally {
      setLoadingBottomStudents(false);
    }
  };

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

  // Manual refresh function
  const handleManualRefresh = async () => {
    toast.info('Refreshing dashboard data...');
    await loadDashboardStats();
    toast.success('Dashboard data refreshed!');
  };

const loadDashboardStats = async (overrideSyId) => {
  try {
    setLoading(true);
    console.log('Loading dashboard stats...');

    // Ensure we have a target school year (prefer override -> selected -> active)
    let targetSyId = overrideSyId || selectedSchoolYearId || String(viewingSchoolYear?.id || '');

    if (!targetSyId) {
      try {
        const activeRes = await axios.get('/school-years/active');
        const activeSy = activeRes.data?.data || null;
        if (!activeSy) {
          toast.error('No active school year found. Please activate one in School Year.');
          setLoading(false);
          return;
        }
        targetSyId = String(activeSy.id);
        setActiveSchoolYear({ ...activeSy, label: formatSchoolYearLabel(activeSy.label) });
        setContextActiveSchoolYear({ ...activeSy, label: formatSchoolYearLabel(activeSy.label) });
        if (!viewingSchoolYear?.id) {
          setSelectedSchoolYearId(String(activeSy.id));
          setViewingSchoolYear({ ...activeSy, label: formatSchoolYearLabel(activeSy.label) });
        }
      } catch (syErr) {
        console.error('Error fetching active school year for dashboard:', syErr);
        toast.error('Failed to fetch active school year');
        setLoading(false);
        return;
      }
    }

    const querySuffix = targetSyId ? `?schoolYearId=${targetSyId}` : '';
    
    // =========================
    // FETCH STUDENTS
    // =========================
    console.log('Fetching students...');
    const studentsRes = await axios.get(`/students${querySuffix}`);
    console.log('Students response:', studentsRes.data);
    const studentsList = studentsRes.data?.data || [];
    setStudents(studentsList);

    // =========================
    // FETCH USERS (for pending/admin activity)
    // =========================
    let allUsers = [];
    try {
      console.log('Fetching users...');
      const usersRes = await axios.get(`/users${querySuffix}`);
      console.log('Users response:', usersRes.data);
      allUsers = usersRes.data?.users || usersRes.data?.data?.users || [];
    } catch (usersErr) {
      console.error('Error fetching users:', usersErr);
      allUsers = [];
    }

    // =========================
    // FETCH TEACHERS (live source)
    // =========================
    let teachersList = [];
    try {
      const teachersRes = await axios.get(`/teachers${querySuffix}`);
      const teacherRows =
        teachersRes.data?.data?.teachers ||
        teachersRes.data?.teachers ||
        teachersRes.data?.data ||
        [];
      teachersList = Array.isArray(teacherRows) ? teacherRows : [];
    } catch (teachersErr) {
      console.error('Error fetching teachers:', teachersErr);
      teachersList = allUsers.filter((u) =>
        ['teacher', 'subject_teacher', 'adviser'].includes(String(u.role || '').toLowerCase())
      );
    }

    const getStudentAverage = (student) => {
      const raw = Number(student?.average ?? student?.live_average ?? 0);
      return Number.isFinite(raw) ? raw : 0;
    };

    const getStudentDisplayName = (student) => {
      const fullName = [student?.firstName, student?.lastName].filter(Boolean).join(' ').trim();
      return fullName || student?.fullName || student?.name || student?.lrn || 'Unknown Student';
    };

    const getStudentClassLabel = (student) => {
      const grade = student?.gradeLevel || student?.grade || '';
      const section = student?.section || '';
      return [grade, section].filter(Boolean).join(' - ');
    };

    const performanceEligibleStudents = studentsList.filter((student) => {
      const status = String(student?.status || '').toLowerCase();
      const average = getStudentAverage(student);
      return average > 0 && status !== 'inactive' && status !== 'graduated' && status !== 'archived';
    });

    const topPerformers = [...performanceEligibleStudents]
      .filter((student) => getStudentAverage(student) >= 95)
      .sort((a, b) => getStudentAverage(b) - getStudentAverage(a))
      .slice(0, 5)
      .map((student) => ({
        id: student?.id,
        name: getStudentDisplayName(student),
        average: getStudentAverage(student),
        classLabel: getStudentClassLabel(student)
      }));

    const lowestPerformers = [...performanceEligibleStudents]
      .filter((student) => getStudentAverage(student) <= 75)
      .sort((a, b) => getStudentAverage(a) - getStudentAverage(b))
      .slice(0, 5)
      .map((student) => ({
        id: student?.id,
        name: getStudentDisplayName(student),
        average: getStudentAverage(student),
        classLabel: getStudentClassLabel(student)
      }));

    // =========================
    // CALCULATE UNIQUE CLASSES
    // =========================
    const uniqueClassesFromStudents = [
      ...new Set(
        studentsList.map(s => `${s.gradeLevel}-${s.section}`)
      )
    ].filter(c => c !== 'undefined-undefined');

    let classesList = [];
    try {
      const classesRes = await axios.get(`/classes${querySuffix}`);
      const classRows =
        classesRes.data?.data ||
        classesRes.data?.classes ||
        (Array.isArray(classesRes.data) ? classesRes.data : []);
      classesList = Array.isArray(classRows) ? classRows : [];
    } catch (classesErr) {
      console.error('Error fetching classes:', classesErr);
      classesList = [];
    }

    // =========================
    // FETCH ATTENDANCE (non-blocking)
    // =========================
    let attendanceList = [];
    try {
      const attendanceRes = await axios.get(`/attendance${querySuffix}`);
      attendanceList =
        Array.isArray(attendanceRes.data?.data)
          ? attendanceRes.data.data
          : Array.isArray(attendanceRes.data)
          ? attendanceRes.data
          : [];
    } catch (attendanceErr) {
      console.error('Error fetching attendance:', attendanceErr);
      attendanceList = [];
      toast.warn('Attendance data unavailable for this school year.');
    }

    setAttendanceData(attendanceList); // ✅ important for SF2

    // =========================
    // FETCH GRADES (SAFE)
    // =========================
    let grades = [];
    try {
      const gradesRes = await axios.get(`/grades${querySuffix}`);
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

    const weeklyGrades = grades.filter((g) => new Date(g.createdAt || g.updatedAt || g.date) > weekAgo);

    const pendingGrades = grades.filter((g) => g.status === 'pending' || !g.status);

    // =========================
    // ACTIVE USERS
    // =========================
    const activeUsers = allUsers.filter(u => {
      const lastLogin = new Date(u.lastLogin || u.createdAt);
      return lastLogin > weekAgo;
    });

    const activeTeachers = teachersList.filter((teacher) => {
      const activityDate = new Date(
        teacher.lastLogin ||
        teacher.updated_at ||
        teacher.updatedAt ||
        teacher.created_at ||
        teacher.createdAt
      );
      return activityDate > weekAgo;
    });

    const activeStudents = studentsList.filter(s => {
      const lastLogin = new Date(s.lastLogin || s.createdAt);
      return lastLogin > weekAgo;
    });

    const activeIdentitySet = new Set();
    activeUsers.forEach((u) => activeIdentitySet.add(`user:${u.id || u.email || u.username || ''}`));
    activeTeachers.forEach((t) => activeIdentitySet.add(`teacher:${t.id || t.email || t.fullName || ''}`));
    activeStudents.forEach((s) => activeIdentitySet.add(`student:${s.id || s.lrn || s.student_email || ''}`));

    // =========================
    // SET DASHBOARD STATS
    // =========================
    setStats({
      totalStudents: studentsList.length,
      totalTeachers: teachersList.length,
      totalClasses: classesList.length > 0 ? classesList.length : uniqueClassesFromStudents.length,
      totalAttendanceRecords: attendanceList.length
    });

    setPerformanceMetrics({
      todayAttendance: parseFloat(attendanceRate),
      weeklyGrades: weeklyGrades.length,
      pendingGrades: pendingGrades.length,
      activeUsers: activeIdentitySet.size,
      activeTeachers: activeTeachers.length,
      activeStudents: activeStudents.length,
      responseTime: 1.2
    });

    setPerformanceBands({
      topPerformers,
      lowestPerformers
    });

    // Log real-time activities based on actual data
    if (topPerformers.length > 0) {
      logActivity(
        'performance',
        'Top performer updated',
        `${topPerformers[0]?.name} now has ${Number(topPerformers[0]?.average || 0).toFixed(2)} average`,
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

    // =========================
    // FETCH ACTIVE SCHOOL YEAR
    // =========================
    try {
      const schoolYearRes = await axios.get('/school-years/active');
      if (schoolYearRes.data?.data) {
        const schoolYear = schoolYearRes.data.data;
        setActiveSchoolYear({ ...schoolYear, label: formatSchoolYearLabel(schoolYear.label) });
        setContextActiveSchoolYear({ ...schoolYear, label: formatSchoolYearLabel(schoolYear.label) });
        if (!selectedSchoolYearId && !viewingSchoolYear?.id) {
          setSelectedSchoolYearId(String(schoolYear.id));
          setViewingSchoolYear({ ...schoolYear, label: formatSchoolYearLabel(schoolYear.label) });
        }
      }
    } catch (err) {
      console.error('Error fetching active school year:', err);
    }

    setLoading(false);

  } catch (error) {
    try {
      const activeRes = await axios.get('/school-years/active');
      const activeSy = activeRes.data?.data || null;
      if (activeSy) {
        const normalized = { ...activeSy, label: formatSchoolYearLabel(activeSy.label) };
        setActiveSchoolYear(normalized);
        setContextActiveSchoolYear(normalized);
      }
    } catch (syFallbackErr) {
      console.error('Fallback school year hydrate failed:', syFallbackErr);
    }

    toast.error('Error loading dashboard stats: ' + error.message);
    setLoading(false);
  }
};

  const selectedSchoolYear = schoolYears.find((sy) => String(sy.id) === String(selectedSchoolYearId)) || null;
  const displayedSchoolYear = viewingSchoolYear || selectedSchoolYear || activeSchoolYear || null;
  const isViewingPastSchoolYear = Boolean(
    selectedSchoolYearId && activeSchoolYear?.id && Number(selectedSchoolYearId) !== Number(activeSchoolYear.id)
  );

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

      // Performance Bands Section
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Performance Bands', margin, yPosition);
      yPosition += 12;

      const approvalData = [
        { label: 'Top 5 Performers (>=95)', value: performanceBands.topPerformers.length.toString() },
        { label: 'Lowest Performers (<=75)', value: performanceBands.lowestPerformers.length.toString() }
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
    toast.info('Current performance bands: ' + JSON.stringify(performanceBands));
    
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
        ['Top 5 Performers (>=95)', performanceBands.topPerformers.length],
        ['Lowest Performers (<=75)', performanceBands.lowestPerformers.length]
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
      {/* Active School Year Banner */}
      {displayedSchoolYear && (
        <div className="bg-gradient-to-r from-red-800 to-red-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-full">
              <CalendarDaysIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-red-100">{isViewingPastSchoolYear ? 'Viewing School Year' : 'Active School Year'}</p>
              <p className="text-xl font-bold">{displayedSchoolYear.label}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-3 md:p-5 border border-gray-300 border-b-red-800 border-b-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4 mb-4">
          <Cog6ToothIcon className="w-12 md:w-20 h-12 md:h-20 text-red-800 transition-transform duration-300 hover:scale-105 flex-shrink-0" />
          <div className="flex-1">
            <h2 className="text-3xl md:text-6xl font-bold text-gray-900">Admin Dashboard</h2>
            <p className="text-xs md:text-sm text-gray-400 mt-2">
              Welcome, {adminUser ? adminUser.username || adminUser.email : 'Admin'}!
            </p>
          </div>
          <div className="w-full sm:w-64">
            <label className="text-xs text-gray-500">View School Year</label>
            <select
              value={selectedSchoolYearId}
              onChange={(e) => {
                const nextId = e.target.value;
                setSelectedSchoolYearId(nextId);
                const matched = schoolYears.find((sy) => String(sy.id) === String(nextId));
                if (matched) setViewingSchoolYear(matched);
              }}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">Select school year</option>
              {schoolYears.map((sy) => (
                <option key={sy.id} value={sy.id}>{sy.label}</option>
              ))}
            </select>
            {selectedSchoolYearId && activeSchoolYear?.id && Number(selectedSchoolYearId) !== Number(activeSchoolYear.id) && (
              <p className="text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded mt-1">View-only: past school year</p>
            )}
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

              {/* Student Performance Section */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Student Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Top Performing Students */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-green-800">Top Performing Students</h4>
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedGradeLevelForTop}
                          onChange={(e) => {
                            setSelectedGradeLevelForTop(e.target.value);
                            setSelectedSectionForTop('');
                          }}
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="">All Grade Levels</option>
                          {gradeLevels.map(grade => (
                            <option key={grade} value={grade}>{grade}</option>
                          ))}
                        </select>
                        <select
                          value={selectedSectionForTop}
                          onChange={(e) => setSelectedSectionForTop(e.target.value)}
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                          disabled={!selectedGradeLevelForTop}
                        >
                          <option value="">All Sections</option>
                          {sectionsForTop.map(section => (
                            <option key={section} value={section}>{section}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {loadingTopStudents ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                      </div>
                    ) : topStudents.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">No students found</p>
                    ) : (
                      <div className="space-y-2">
                        {topStudents.slice(0, 5).map((student, index) => (
                          <div key={student.id} className="flex items-center justify-between p-2 bg-white rounded border border-green-100">
                            <div className="flex items-center gap-2">
                              <span className="text-green-600 font-bold text-sm">#{index + 1}</span>
                              <span className="text-sm font-medium">{student.name}</span>
                            </div>
                            <span className="text-sm font-bold text-green-700">{student.avg}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom Performing Students */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-red-800">Bottom Performing Students</h4>
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedGradeLevelForBottom}
                          onChange={(e) => {
                            setSelectedGradeLevelForBottom(e.target.value);
                            setSelectedSectionForBottom('');
                          }}
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="">All Grade Levels</option>
                          {gradeLevels.map(grade => (
                            <option key={grade} value={grade}>{grade}</option>
                          ))}
                        </select>
                        <select
                          value={selectedSectionForBottom}
                          onChange={(e) => setSelectedSectionForBottom(e.target.value)}
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                          disabled={!selectedGradeLevelForBottom}
                        >
                          <option value="">All Sections</option>
                          {sectionsForBottom.map(section => (
                            <option key={section} value={section}>{section}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {loadingBottomStudents ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
                      </div>
                    ) : bottomStudents.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">No students found</p>
                    ) : (
                      <div className="space-y-2">
                        {bottomStudents.slice(0, 5).map((student, index) => (
                          <div key={student.id} className="flex items-center justify-between p-2 bg-white rounded border border-red-100">
                            <div className="flex items-center gap-2">
                              <span className="text-red-600 font-bold text-sm">#{index + 1}</span>
                              <span className="text-sm font-medium">{student.name}</span>
                            </div>
                            <span className="text-sm font-bold text-red-700">{student.avg}%</span>
                          </div>
                        ))}
                      </div>
                    )}
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
