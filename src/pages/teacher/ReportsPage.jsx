import { useState, useEffect, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  CalendarIcon,
  AcademicCapIcon,
  TrophyIcon,
  ChevronDownIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
  TableCellsIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/solid";
import axios from "../../api/axiosConfig";
import SF2AttendanceForm from "../../components/SF2AttendanceForm";
import {
  appendSchoolYearId,
  dedupeTeacherClasses,
  getTeacherViewingSchoolYearId,
  setTeacherActiveSchoolYearId,
  setTeacherViewingSchoolYearId,
} from "../../utils/teacherSchoolYear";

export default function ReportsPage() {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSF2Modal, setShowSF2Modal] = useState(false);
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState("overview"); // overview, monthly
  const [selectedAttendanceSubject, setSelectedAttendanceSubject] = useState("");
  const [monthlySubjects, setMonthlySubjects] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [monthlyAttendance, setMonthlyAttendance] = useState([]);
  const [rawMonthAttendance, setRawMonthAttendance] = useState([]); // Raw attendance records for SF2
  const [subjectsData, setSubjectsData] = useState([]);
  const [topStudents, setTopStudents] = useState([]);
  const [lowestStudents, setLowestStudents] = useState([]);
  const [students, setStudents] = useState([]);
  const [sections, setSections] = useState([]);
  const [stats, setStats] = useState({
    attendanceRate: 0,
    classAverage: 0,
    lateStudents: 0,
    honorStudents: 0
  });
  const [monthlyStats, setMonthlyStats] = useState({
    totalPresent: 0,
    totalAbsent: 0,
    totalLate: 0,
    totalDays: 0
  });
  const [loading, setLoading] = useState(true);
  const [topLimit, setTopLimit] = useState(5);
  const [lowestLimit, setLowestLimit] = useState(5);
  const [gradesSubTab, setGradesSubTab] = useState('overall');
  const [selectedSubjectForRanking, setSelectedSubjectForRanking] = useState('');
  const [selectedQuarterForView, setSelectedQuarterForView] = useState('q1');
  const [isAdviser, setIsAdviser] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [sendingEmailFor, setSendingEmailFor] = useState(null);
  const [emailResults, setEmailResults] = useState({});
  const [allSubjects, setAllSubjects] = useState([]);
  const [selectedSchoolYearId, setSelectedSchoolYearId] = useState(() => getTeacherViewingSchoolYearId());
  const [publishingRanking, setPublishingRanking] = useState(false);
  const [publishStatus, setPublishStatus] = useState(null);
  const lastKnownActiveSchoolYearIdRef = useRef(null);

  const isPassingGradeValue = (value) => {
    const num = parseFloat(value);
    return !isNaN(num) && num > 0;
  };

  const isStudentReportCardComplete = (student) => {
    const grades = student?.grades || {};
    const subjects = Object.keys(grades);
    if (subjects.length === 0) return false;

    return subjects.every((subject) => {
      const quarterGrades = grades[subject] || {};
      return ['q1', 'q2', 'q3', 'q4'].every((q) => isPassingGradeValue(quarterGrades[q]));
    });
  };

  const isStudentQuarterComplete = (student, quarter, subjectsForScope = []) => {
    const grades = student?.grades || {};
    const subjects = subjectsForScope.length > 0 ? subjectsForScope : Object.keys(grades);
    if (subjects.length === 0) return false;

    return subjects.every((subject) => {
      const subjectGrades = grades[subject] || {};
      return isPassingGradeValue(subjectGrades[quarter]);
    });
  };

  const isInactiveStudent = (student) => {
    const status = String(student?.status || '').trim().toLowerCase();
    return status === 'inactive';
  };

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  useEffect(() => {
    loadReportsData();
  }, [selectedSection, selectedMonth, selectedYear, selectedSchoolYearId, selectedAttendanceSubject]);

  const fetchActiveSchoolYear = async () => {
    try {
      const res = await axios.get('/school-years/active');
      const activeSy = res.data?.data || res.data;
      if (!activeSy?.id) return;

      const nextActiveId = String(activeSy.id);
      const previousActiveId = lastKnownActiveSchoolYearIdRef.current;
      setTeacherActiveSchoolYearId(nextActiveId);

      const shouldAutoFollow =
        !selectedSchoolYearId ||
        !previousActiveId ||
        String(selectedSchoolYearId) === String(previousActiveId);

      if (shouldAutoFollow && String(selectedSchoolYearId || '') !== nextActiveId) {
        setSelectedSchoolYearId(nextActiveId);
        setTeacherViewingSchoolYearId(nextActiveId);
      }

      lastKnownActiveSchoolYearIdRef.current = nextActiveId;
    } catch (error) {
      console.warn('Could not load active school year:', error.message);
    }
  };

  useEffect(() => {
    fetchActiveSchoolYear();

    const interval = setInterval(() => {
      fetchActiveSchoolYear();
    }, 15000);

    return () => clearInterval(interval);
  }, [selectedSchoolYearId]);

  useEffect(() => {
    if (selectedSchoolYearId) {
      setTeacherViewingSchoolYearId(selectedSchoolYearId);
    }
  }, [selectedSchoolYearId]);

  const loadReportsData = async () => {
    try {
      setLoading(true);

      // Get user ID from localStorage
      const userStr = localStorage.getItem("user");
      let userId = null;
      if (userStr) {
        const user = JSON.parse(userStr);
        userId = user.id;
        const fn = user.firstName || user.first_name || '';
        const ln = user.lastName || user.last_name || '';
        setTeacherName(`${fn} ${ln}`.trim());
      }

      if (!userId) {
        console.error('No user ID found');
        setLoading(false);
        return;
      }

      // Fetch adviser classes for this teacher
      let adviserClasses = [];
      try {
        const adviserResponse = await axios.get(appendSchoolYearId(`/classes/adviser/${userId}`, selectedSchoolYearId));
        adviserClasses = Array.isArray(adviserResponse.data.data) ? adviserResponse.data.data : [];
      } catch (e) {
        console.error('Error fetching adviser classes:', e);
      }
      if (adviserClasses.length === 0 && userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.firstName && user.lastName) {
            const allRes = await axios.get(appendSchoolYearId('/classes', selectedSchoolYearId));
            const allClasses = Array.isArray(allRes.data)
              ? allRes.data
              : (Array.isArray(allRes.data?.data) ? allRes.data.data : []);
            adviserClasses = allClasses.filter(c =>
              c.adviser_name &&
              c.adviser_name.includes(user.firstName) &&
              c.adviser_name.includes(user.lastName)
            );
          }
        } catch (fbErr) {
          console.warn('Reports adviser-name fallback failed:', fbErr.message);
        }
      }
      setIsAdviser(adviserClasses.length > 0);

      // Fetch subject teacher classes
      let subjectTeacherClasses = [];
      try {
        const stResponse = await axios.get(appendSchoolYearId(`/classes/subject-teacher/${userId}`, selectedSchoolYearId));
        subjectTeacherClasses = Array.isArray(stResponse.data.data) ? stResponse.data.data : [];
      } catch (e) {
        console.error('Error fetching subject teacher classes:', e);
      }

      // Combine and deduplicate assigned classes
      const combinedClasses = [...adviserClasses, ...subjectTeacherClasses];
      const uniqueClasses = dedupeTeacherClasses(combinedClasses);
      
      // Extract sections from assigned classes only
      const assignedSections = uniqueClasses.map(c => `${c.grade} - ${c.section}`).filter(Boolean);
      setSections([...new Set(assignedSections)].sort());
      console.log('Assigned sections for reports:', assignedSections);

      // Fetch all students
      const studentsResponse = await axios.get('/students', {
        params: selectedSchoolYearId ? { schoolYearId: selectedSchoolYearId } : {}
      });
      let studentsData = Array.isArray(studentsResponse.data.data) 
        ? studentsResponse.data.data 
        : Array.isArray(studentsResponse.data) 
        ? studentsResponse.data 
        : [];

      // Filter students to only those in assigned classes
      const normalize = str => (str || '').toString().trim().toLowerCase();
      studentsData = studentsData.filter(student => {
        return uniqueClasses.some(c => 
          normalize(c.grade) === normalize(student.gradeLevel) && 
          normalize(c.section) === normalize(student.section)
        );
      });

      // Further filter by selected section if one is chosen
      if (selectedSection) {
        studentsData = studentsData.filter(s => `${s.gradeLevel} - ${s.section}` === selectedSection);
      }

      // Fetch grades for each student and calculate averages
      const studentsWithGrades = await Promise.all(
        studentsData.map(async (student) => {
          try {
            const gradesResponse = await axios.get(`/students/${student.id}/grades`, {
              params: selectedSchoolYearId ? { schoolYearId: selectedSchoolYearId } : {}
            });
            const grades = gradesResponse.data || {};
            
            // Calculate overall average from all subjects and quarters
            let totalGrade = 0;
            let gradeCount = 0;
            
            Object.values(grades).forEach(subjectGrades => {
              ['q1', 'q2', 'q3', 'q4'].forEach(q => {
                const gradeVal = parseFloat(subjectGrades[q]);
                if (!isNaN(gradeVal) && gradeVal > 0) {
                  totalGrade += gradeVal;
                  gradeCount++;
                }
              });
            });
            
            const calculatedAverage = gradeCount > 0 ? Math.round((totalGrade / gradeCount) * 100) / 100 : 0;
            return { ...student, average: calculatedAverage, grades };
          } catch (error) {
            console.error(`Error fetching grades for student ${student.id}:`, error);
            return { ...student, average: student.average || 0, grades: {} };
          }
        })
      );

      setStudents(studentsWithGrades);

      // Fetch attendance data
      const attendanceResponse = await axios.get('/attendance', {
        params: selectedSchoolYearId ? { schoolYearId: selectedSchoolYearId } : {}
      });
      let allAttendance = Array.isArray(attendanceResponse.data.data) 
        ? attendanceResponse.data.data 
        : Array.isArray(attendanceResponse.data) 
        ? attendanceResponse.data 
        : [];

      // Filter attendance to only students in assigned classes
      allAttendance = allAttendance.filter(record => {
        return uniqueClasses.some(c => 
          normalize(c.grade) === normalize(record.gradeLevel) && 
          normalize(c.section) === normalize(record.section)
        );
      });
      
      console.log('Filtered attendance records:', allAttendance.length);

      // Calculate weekly attendance (last 7 days)
      const today = new Date();
      const weekData = {};
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = days[date.getDay()];
        
        const dayRecords = allAttendance.filter(r => r.date === dateStr);
        const present = dayRecords.filter(r => r.status?.toLowerCase() === 'present').length;
        const absent = dayRecords.filter(r => r.status?.toLowerCase() === 'absent').length;
        
        weekData[dayName] = { day: dayName, present: present || 0, absent: absent || 0 };
      }

      setAttendanceData(Object.values(weekData));

      // Calculate MONTHLY attendance for selected month
      const monthStr = selectedMonth.toString().padStart(2, '0');
      const monthPrefix = `${selectedYear}-${monthStr}`;
      
      const monthAttendance = allAttendance.filter(r => r.date && r.date.startsWith(monthPrefix));
      
      // Filter by section if selected
      let filteredMonthAttendance = monthAttendance;
      if (selectedSection) {
        const [gradeLevel, section] = selectedSection.split(' - ');
        filteredMonthAttendance = monthAttendance.filter(r => 
          r.gradeLevel === gradeLevel && r.section === section
        );
      }

      const subjectOptions = [...new Set(
        filteredMonthAttendance
          .map(r => String(r.subject || '').trim())
          .filter(Boolean)
      )].sort();
      setMonthlySubjects(subjectOptions);
      if (selectedAttendanceSubject && !subjectOptions.includes(selectedAttendanceSubject)) {
        setSelectedAttendanceSubject("");
      }

      let subjectScopedAttendance = filteredMonthAttendance;
      if (selectedAttendanceSubject) {
        const selectedSubjNorm = selectedAttendanceSubject.trim().toLowerCase();
        subjectScopedAttendance = filteredMonthAttendance.filter(r =>
          String(r.subject || '').trim().toLowerCase() === selectedSubjNorm
        );
      }

      // Store raw attendance data for SF2 form
      setRawMonthAttendance(subjectScopedAttendance);

      // Group by student for monthly summary
      const studentMonthlyData = {};
      studentsData.forEach(student => {
        const candidateIds = new Set(
          [student.id, student.lrn, student.studentId]
            .filter(Boolean)
            .map(v => String(v))
        );
        const studentRecords = subjectScopedAttendance.filter(r => 
          candidateIds.has(String(r.studentId))
        );
        
        const presentDays = studentRecords.filter(r => r.status?.toLowerCase() === 'present').length;
        const absentDays = studentRecords.filter(r => r.status?.toLowerCase() === 'absent').length;
        const lateDays = studentRecords.filter(r => r.status?.toLowerCase() === 'late').length;
        
        studentMonthlyData[student.id] = {
          id: student.id,
          lrn: student.lrn,
          name: student.fullName || `${student.firstName} ${student.lastName}`,
          section: student.section,
          gradeLevel: student.gradeLevel,
          presentDays,
          absentDays,
          lateDays,
          totalDays: presentDays + absentDays + lateDays,
          attendanceRate: (presentDays + absentDays + lateDays) > 0 
            ? Math.round((presentDays / (presentDays + absentDays + lateDays)) * 100) 
            : 0
        };
      });

      setMonthlyAttendance(Object.values(studentMonthlyData));

      // Calculate monthly stats
      const totalPresent = subjectScopedAttendance.filter(r => r.status?.toLowerCase() === 'present').length;
      const totalAbsent = subjectScopedAttendance.filter(r => r.status?.toLowerCase() === 'absent').length;
      const totalLate = subjectScopedAttendance.filter(r => r.status?.toLowerCase() === 'late').length;
      const uniqueDays = [...new Set(subjectScopedAttendance.map(r => r.date))].length;

      setMonthlyStats({
        totalPresent,
        totalAbsent,
        totalLate,
        totalDays: uniqueDays
      });

      // Calculate subject averages from fetched grades
      const subjectAvgs = {};
      studentsWithGrades.forEach(student => {
        if (student.grades) {
          Object.entries(student.grades).forEach(([subject, grades]) => {
            if (!subjectAvgs[subject]) {
              subjectAvgs[subject] = { subject, total: 0, count: 0 };
            }
            // Include all quarters
            ['q1', 'q2', 'q3', 'q4'].forEach(q => {
              const gradeVal = parseFloat(grades[q]);
              if (!isNaN(gradeVal) && gradeVal > 0) {
                subjectAvgs[subject].total += gradeVal;
                subjectAvgs[subject].count += 1;
              }
            });
          });
        }
      });

      const finalSubjectData = Object.values(subjectAvgs).map(s => ({
        subject: s.subject,
        average: s.count > 0 ? Math.round(s.total / s.count) : 0
      }));

      setSubjectsData(finalSubjectData.slice(0, 5));

      // Compute all unique subjects for the Grades tab
      const subjectSet = new Set();
      studentsWithGrades.forEach(s => { if (s.grades) Object.keys(s.grades).forEach(sub => subjectSet.add(sub)); });
      setAllSubjects([...subjectSet].sort());
      setSelectedSubjectForRanking(prev => prev || ([...subjectSet][0] || ''));

      // Get top performing students — only those with avg >= 85 (honor level and above)
      const rankingEligibleStudents = studentsWithGrades.filter((s) => !isInactiveStudent(s));

      const topPerformers = rankingEligibleStudents
        .filter(s => s.average && s.average >= 85)
        .sort((a, b) => (b.average || 0) - (a.average || 0))
        .map((s, idx) => ({
          rank: idx + 1,
          id: s.id,
          name: `${s.lastName}, ${s.firstName}`,
          avg: s.average || 0,
          section: `${s.gradeLevel} - ${s.section}`,
          parentEmail: s.parentEmail,
        }));

      setTopStudents(topPerformers);

      // Get lowest performing students (only those with avg <= 80 — actual underperformers)
      const lowestPerformers = rankingEligibleStudents
        .filter(s => s.average && s.average > 0 && s.average <= 80)
        .sort((a, b) => (a.average || 0) - (b.average || 0))
        .map((s, idx) => ({
          rank: idx + 1,
          id: s.id,
          name: `${s.lastName}, ${s.firstName}`,
          avg: s.average || 0,
          section: `${s.gradeLevel} - ${s.section}`,
          parentEmail: s.parentEmail,
        }));

      setLowestStudents(lowestPerformers);

      // Calculate statistics using studentsWithGrades
      const totalStudents = studentsWithGrades.length;
      const presentToday = allAttendance.filter(r => r.date === new Date().toISOString().split('T')[0] && r.status === 'Present').length;
      const lateToday = allAttendance.filter(r => r.date === new Date().toISOString().split('T')[0] && r.status === 'Late').length;
      
      // Class average from students who have grades
      const studentsWithAvg = rankingEligibleStudents.filter(s => s.average > 0);
      const classAverage = studentsWithAvg.length > 0 
        ? Math.round(studentsWithAvg.reduce((sum, s) => sum + s.average, 0) / studentsWithAvg.length * 10) / 10
        : 0;
      const honorStudents = studentsWithGrades.filter(s => s.average >= 90).length;

      setStats({
        attendanceRate: totalStudents > 0 ? Math.round((presentToday / totalStudents) * 100 * 10) / 10 : 0,
        classAverage: classAverage,
        lateStudents: lateToday,
        honorStudents: honorStudents
      });

      setLoading(false);
    } catch (error) {
      console.error('Error loading reports data:', error);
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Student Name', 'LRN', 'Grade Level', 'Section', 'Present Days', 'Absent Days', 'Late Days', 'Total Days', 'Attendance Rate'];
    const rows = monthlyAttendance.map(s => [
      s.name,
      s.lrn,
      s.gradeLevel,
      s.section,
      s.presentDays,
      s.absentDays,
      s.lateDays,
      s.totalDays,
      `${s.attendanceRate}%`
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${months.find(m => m.value === selectedMonth)?.label}_${selectedYear}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  const sendGradeEmail = async (student) => {
    setSendingEmailFor(student.id);
    try {
      const response = await axios.post(`/students/${student.id}/send-grade-report`, { teacherName });
      const ok = response.data?.success;
      setEmailResults(prev => ({ ...prev, [student.id]: { success: ok, msg: ok ? '\u2705 Email sent!' : (response.data?.error || 'Failed') } }));
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setEmailResults(prev => ({ ...prev, [student.id]: { success: false, msg: '\u274C ' + msg } }));
    }
    setSendingEmailFor(null);
  };

  const buildRankingPublicationPayload = () => {
    if (!selectedSection) {
      return { error: 'Select a Grade & Section first before posting ranking.' };
    }

    const sectionParts = String(selectedSection).split(' - ');
    const gradeLevel = (sectionParts[0] || '').trim();
    const section = sectionParts.slice(1).join(' - ').trim();
    if (!gradeLevel || !section) {
      return { error: 'Invalid section format. Please reselect the class section.' };
    }

    const activeStudents = students.filter((s) => !isInactiveStudent(s));
    if (activeStudents.length === 0) {
      return { error: 'No students found in this section to rank.' };
    }

    const completeStudents = activeStudents.filter(isStudentReportCardComplete);
    if (completeStudents.length !== activeStudents.length) {
      return {
        error: `Ranking is inactive until all report card grades are complete. Pending students: ${activeStudents.length - completeStudents.length}`
      };
    }

    if (gradesSubTab === 'overall') {
      const sorted = [...activeStudents]
        .filter((student) => Number(student?.average) > 0)
        .sort((a, b) => (Number(b?.average) || 0) - (Number(a?.average) || 0));

      if (sorted.length === 0) {
        return { error: 'No overall averages available to publish.' };
      }

      const rankings = sorted.map((student, idx) => ({
        studentId: student.id,
        studentName: `${student.lastName}, ${student.firstName}`,
        rank: idx + 1,
        score: Number((Number(student.average) || 0).toFixed(2)),
        totalStudents: sorted.length
      }));

      return {
        payload: {
          schoolYearId: selectedSchoolYearId,
          gradeLevel,
          section,
          rankingType: 'overall',
          quarter: '',
          subject: '',
          rankings
        }
      };
    }

    if (gradesSubTab === 'per-subject') {
      if (!selectedSubjectForRanking) {
        return { error: 'Select a subject first before posting ranking.' };
      }

      const getSubjectScore = (student) => {
        const subjectGrades = student?.grades?.[selectedSubjectForRanking];
        if (!subjectGrades) return 0;

        if (selectedQuarterForView === 'all') {
          const vals = [subjectGrades.q1, subjectGrades.q2, subjectGrades.q3, subjectGrades.q4]
            .map((val) => Number(val))
            .filter((val) => Number.isFinite(val) && val > 0);
          return vals.length > 0 ? vals.reduce((acc, val) => acc + val, 0) / vals.length : 0;
        }

        const selectedValue = Number(subjectGrades[selectedQuarterForView]);
        return Number.isFinite(selectedValue) && selectedValue > 0 ? selectedValue : 0;
      };

      const sorted = [...activeStudents]
        .filter((student) => getSubjectScore(student) > 0)
        .sort((a, b) => getSubjectScore(b) - getSubjectScore(a));

      if (sorted.length === 0) {
        return { error: `No grades found for ${selectedSubjectForRanking}.` };
      }

      const rankings = sorted.map((student, idx) => ({
        studentId: student.id,
        studentName: `${student.lastName}, ${student.firstName}`,
        rank: idx + 1,
        score: Number(getSubjectScore(student).toFixed(2)),
        totalStudents: sorted.length
      }));

      return {
        payload: {
          schoolYearId: selectedSchoolYearId,
          gradeLevel,
          section,
          rankingType: 'subject',
          quarter: selectedQuarterForView === 'all' ? '' : selectedQuarterForView,
          subject: selectedSubjectForRanking,
          rankings
        }
      };
    }

    if (gradesSubTab === 'by-quarter') {
      const quarter = String(selectedQuarterForView || '').toLowerCase();
      if (!['q1', 'q2', 'q3', 'q4'].includes(quarter)) {
        return { error: 'Select a valid quarter before posting ranking.' };
      }

      const getQuarterAverage = (student) => {
        const quarterGrades = allSubjects
          .map((subjectName) => Number(student?.grades?.[subjectName]?.[quarter]))
          .filter((val) => Number.isFinite(val) && val > 0);

        return quarterGrades.length > 0
          ? quarterGrades.reduce((acc, val) => acc + val, 0) / quarterGrades.length
          : 0;
      };

      const sorted = [...activeStudents]
        .map((student) => ({ student, score: getQuarterAverage(student) }))
        .filter((row) => row.score > 0)
        .sort((a, b) => b.score - a.score);

      if (sorted.length === 0) {
        return { error: `No quarter averages found for ${quarter.toUpperCase()}.` };
      }

      const rankings = sorted.map((row, idx) => ({
        studentId: row.student.id,
        studentName: `${row.student.lastName}, ${row.student.firstName}`,
        rank: idx + 1,
        score: Number(row.score.toFixed(2)),
        totalStudents: sorted.length
      }));

      return {
        payload: {
          schoolYearId: selectedSchoolYearId,
          gradeLevel,
          section,
          rankingType: 'quarter',
          quarter,
          subject: '',
          rankings
        }
      };
    }

    return { error: 'Unsupported ranking tab selected.' };
  };

  const publishCurrentRanking = async () => {
    const { payload, error } = buildRankingPublicationPayload();
    if (error) {
      setPublishStatus({ type: 'error', message: error });
      return;
    }

    setPublishingRanking(true);
    setPublishStatus(null);

    try {
      const response = await axios.post('/students/ranking-publications', payload);
      setPublishStatus({
        type: 'success',
        message: response?.data?.message || 'Ranking posted to student dashboard.'
      });
    } catch (err) {
      setPublishStatus({
        type: 'error',
        message: err?.response?.data?.error || err?.response?.data?.message || 'Failed to post ranking.'
      });
    } finally {
      setPublishingRanking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6 border border-gray-300 border-b-red-800 border-b-4 flex items-center justify-between print:hidden">
        <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <AcademicCapIcon className="w-12 h-12 text-red-800" />
          Reports & Analytics
        </h2>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-200 print:hidden">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-6 py-3 rounded-xl font-semibold text-base transition-all ${
              activeTab === "overview"
                ? "bg-red-800 text-white shadow-lg"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab("monthly")}
            className={`px-6 py-3 rounded-xl font-semibold text-base transition-all ${
              activeTab === "monthly"
                ? "bg-red-800 text-white shadow-lg"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            📅 Monthly Attendance
          </button>
          <button
            onClick={() => setActiveTab("grades")}
            className={`px-6 py-3 rounded-xl font-semibold text-base transition-all ${
              activeTab === "grades"
                ? "bg-red-800 text-white shadow-lg"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            📋 Grades
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 print:hidden">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-7 h-7 text-red-700" />
            <span className="font-semibold text-gray-800">Section:</span>
          </div>

          <div className="relative">
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="px-5 py-3 pr-12 bg-red-50 border-2 border-red-300 rounded-xl font-bold text-red-800 text-base focus:outline-none focus:ring-3 focus:ring-red-100 appearance-none cursor-pointer transition-all"
            >
              <option value="">All Sections</option>
              {sections.map((section) => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
              <ChevronDownIcon className="w-5 h-5 text-red-800" />
            </div>
          </div>

          {activeTab === "monthly" && (
            <>
              <div className="flex items-center gap-3 ml-4">
                <span className="font-semibold text-gray-800">Month:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-5 py-3 pr-12 bg-blue-50 border-2 border-blue-300 rounded-xl font-bold text-blue-800 text-base focus:outline-none focus:ring-3 focus:ring-blue-100 appearance-none cursor-pointer"
                >
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-800">Year:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-5 py-3 pr-12 bg-green-50 border-2 border-green-300 rounded-xl font-bold text-green-800 text-base focus:outline-none focus:ring-3 focus:ring-green-100 appearance-none cursor-pointer"
                >
                  <option value={2024}>2024</option>
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                </select>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => setShowSF2Modal(true)}
                  className="px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition flex items-center gap-2"
                >
                  <DocumentArrowDownIcon className="w-5 h-5" />
                  SF2 Form
                </button>
                <select
                  value={selectedAttendanceSubject}
                  onChange={(e) => setSelectedAttendanceSubject(e.target.value)}
                  className="px-4 py-3 pr-10 bg-purple-50 border-2 border-purple-300 rounded-xl font-bold text-purple-800 text-base focus:outline-none focus:ring-3 focus:ring-purple-100 appearance-none cursor-pointer"
                >
                  <option value="">All Subjects</option>
                  {monthlySubjects.map((subjectName) => (
                    <option key={subjectName} value={subjectName}>{subjectName}</option>
                  ))}
                </select>

                <button
                  onClick={exportToCSV}
                  className="px-4 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition flex items-center gap-2"
                >
                  <DocumentArrowDownIcon className="w-5 h-5" />
                  Export CSV
                </button>
                <button
                  onClick={printReport}
                  className="px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition flex items-center gap-2"
                >
                  <PrinterIcon className="w-5 h-5" />
                  Print
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-6 shadow-xl">
              <p className="text-4xl font-bold">{stats.attendanceRate}%</p>
              <p className="text-lg mt-2 opacity-90">Attendance Rate</p>
              <p className="text-sm opacity-80">Today</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-xl">
              <p className="text-4xl font-bold">{stats.classAverage}</p>
              <p className="text-lg mt-2 opacity-90">Class Average</p>
              <p className="text-sm opacity-80">All subjects</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-2xl p-6 shadow-xl">
              <p className="text-4xl font-bold">{stats.lateStudents}</p>
              <p className="text-lg mt-2 opacity-90">Late Students</p>
              <p className="text-sm opacity-80">Today</p>
            </div>
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-2xl p-6 shadow-xl">
              <p className="text-4xl font-bold">{stats.honorStudents}</p>
              <p className="text-lg mt-2 opacity-90">Honor Students</p>
              <p className="text-sm opacity-80">With honors</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-3xl shadow-2xl p-5 border border-gray-200 h-[400px]">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Weekly Attendance Trend</h3>
              <ResponsiveContainer width={"100%"} height={300}>
                <LineChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#f3f4f6" />
                  <XAxis dataKey="day" stroke="#374151" fontSize={12} />
                  <YAxis domain={[0, 40]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#fff", border: "2px solid #dc2626", borderRadius: "12px" }}
                    labelStyle={{ color: "#dc2626", fontWeight: "bold" }}
                  />
                  <Line type="monotone" dataKey="present" stroke="#dc2626" strokeWidth={3} dot={{ fill: "#dc2626", r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-200 h-[400px]">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Subject Performance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={subjectsData}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#f3f4f6" />
                  <XAxis dataKey="subject" angle={-15} textAnchor="end" height={60} fontSize={13} />
                  <YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} />
                  <Tooltip />
                  <Bar dataKey="average" radius={[12, 12, 0, 0]} fill="#dc2626" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200 w-full">
            <div className="bg-gradient-to-r from-red-800 to-red-900 text-white px-6 py-5 flex items-center justify-between">
              <h3 className="text-2xl font-bold flex items-center gap-4">
                <TrophyIcon className="w-6 h-6" />
                Top Performing Students
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-200">Show:</span>
                <select value={topLimit} onChange={e => setTopLimit(e.target.value === 'all' ? 9999 : Number(e.target.value))}
                  className="px-2 py-1 rounded bg-red-700 text-white text-sm border border-red-500 focus:outline-none">
                  <option value={3}>Top 3</option>
                  <option value={5}>Top 5</option>
                  <option value={10}>Top 10</option>
                  <option value="all">All</option>
                </select>
              </div>
            </div>

            <div className="p-6 max-h-[400px] overflow-y-auto">
              <div className="space-y-4">
                {(() => {
                  const activeStudents = students.filter((s) => !isInactiveStudent(s));
                  const rankingReady = Boolean(selectedSection)
                    && activeStudents.length > 0
                    && activeStudents.every(isStudentReportCardComplete);

                  if (loading) {
                    return <p className="text-center text-gray-500">Loading top students...</p>;
                  }

                  if (!selectedSection) {
                    return <p className="text-center text-amber-700">Select a Grade &amp; Section first to view rankings.</p>;
                  }

                  if (!rankingReady) {
                    const pendingCount = activeStudents.filter((s) => !isStudentReportCardComplete(s)).length;
                    return (
                      <p className="text-center text-amber-700">
                        Ranking is inactive for {selectedSection}. Complete all report card grades (Q1-Q4 per subject) for all students first. Pending students: {pendingCount}
                      </p>
                    );
                  }

                  if (topStudents.length === 0) {
                    return <p className="text-center text-gray-500">No students with grades found</p>;
                  }

                  return topStudents.slice(0, topLimit).map((student) => (
                    <div
                      key={student.rank}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-2xl border border-red-200 hover:shadow-lg transition"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`text-xl font-bold ${
                            student.rank === 1
                              ? "text-yellow-500"
                              : student.rank === 2
                              ? "text-gray-400"
                              : "text-orange-600"
                          }`}
                        >
                          #{student.rank}
                        </div>
                        <div>
                          <p className="text-lg font-bold text-gray-900">{student.name}</p>
                          <p className="text-sm text-gray-600">{student.section}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xl font-bold text-red-700">{student.avg}</p>
                        <p className="text-base font-semibold text-red-800">
                          {student.avg >= 98 ? '🥇 With Highest Honors' :
                           student.avg >= 95 ? '🥈 With High Honors' :
                           student.avg >= 85 ? '🥉 With Honors' :
                           student.avg >= 75 ? '✅ No Award' :
                           '❌ Failed'}
                        </p>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200 w-full">
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-6 py-5 flex items-center justify-between">
              <h3 className="text-2xl font-bold flex items-center gap-4">
                <TrophyIcon className="w-6 h-6" />
                Lowest Performing Students
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-orange-200">Show:</span>
                <select value={lowestLimit} onChange={e => setLowestLimit(e.target.value === 'all' ? 9999 : Number(e.target.value))}
                  className="px-2 py-1 rounded bg-orange-700 text-white text-sm border border-orange-500 focus:outline-none">
                  <option value={3}>Bottom 3</option>
                  <option value={5}>Bottom 5</option>
                  <option value={10}>Bottom 10</option>
                  <option value="all">All</option>
                </select>
              </div>
            </div>
            <div className="p-6 max-h-[400px] overflow-y-auto">
              <div className="space-y-4">
                {(() => {
                  const activeStudents = students.filter((s) => !isInactiveStudent(s));
                  const rankingReady = Boolean(selectedSection)
                    && activeStudents.length > 0
                    && activeStudents.every(isStudentReportCardComplete);

                  if (loading) {
                    return <p className="text-center text-gray-500">Loading students...</p>;
                  }

                  if (!selectedSection) {
                    return <p className="text-center text-amber-700">Select a Grade &amp; Section first to view rankings.</p>;
                  }

                  if (!rankingReady) {
                    const pendingCount = activeStudents.filter((s) => !isStudentReportCardComplete(s)).length;
                    return (
                      <p className="text-center text-amber-700">
                        Ranking is inactive for {selectedSection}. Complete all report card grades (Q1-Q4 per subject) for all students first. Pending students: {pendingCount}
                      </p>
                    );
                  }

                  if (lowestStudents.length === 0) {
                    return <p className="text-center text-gray-500">No students with grades found</p>;
                  }

                  return lowestStudents.slice(0, lowestLimit).map((student) => (
                    <div key={student.rank} className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl border border-orange-200 hover:shadow-lg transition">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-xl font-bold text-orange-600">#{student.rank}</div>
                          <div>
                            <p className="text-lg font-bold text-gray-900">{student.name}</p>
                            <p className="text-sm text-gray-600">{student.section}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-xl font-bold text-orange-700">{student.avg}</p>
                            <p className="text-sm font-semibold text-orange-800">
                              {student.avg >= 98 ? '🥇 With Highest Honors' :
                               student.avg >= 95 ? '🥈 With High Honors' :
                               student.avg >= 85 ? '🥉 With Honors' :
                               student.avg >= 75 ? '✅ No Award' :
                               '❌ Failed'}
                            </p>
                          </div>
                          {isAdviser && (
                            <button
                              onClick={() => sendGradeEmail(student)}
                              disabled={sendingEmailFor === student.id}
                              className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                              title={student.parentEmail ? `Send grade report to ${student.parentEmail}` : 'No parent email on file'}
                            >
                              <EnvelopeIcon className="w-4 h-4" />
                              {sendingEmailFor === student.id ? 'Sending...' : 'Email Parent'}
                            </button>
                          )}
                        </div>
                      </div>
                      {emailResults[student.id] && (
                        <p className={`mt-2 text-xs font-medium ${emailResults[student.id].success ? 'text-green-700' : 'text-red-600'}`}>
                          {emailResults[student.id].msg}
                        </p>
                      )}
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </>
      )}

      {/* MONTHLY ATTENDANCE TAB */}
      {activeTab === "monthly" && (
        <>
          {/* Monthly Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 print:grid-cols-4">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-6 shadow-xl">
              <p className="text-4xl font-bold">{monthlyStats.totalPresent}</p>
              <p className="text-lg mt-2 opacity-90">Total Present</p>
              <p className="text-sm opacity-80">{months.find(m => m.value === selectedMonth)?.label} {selectedYear}</p>
            </div>
            <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-2xl p-6 shadow-xl">
              <p className="text-4xl font-bold">{monthlyStats.totalAbsent}</p>
              <p className="text-lg mt-2 opacity-90">Total Absent</p>
              <p className="text-sm opacity-80">{months.find(m => m.value === selectedMonth)?.label} {selectedYear}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-yellow-500 text-white rounded-2xl p-6 shadow-xl">
              <p className="text-4xl font-bold">{monthlyStats.totalLate}</p>
              <p className="text-lg mt-2 opacity-90">Total Late</p>
              <p className="text-sm opacity-80">{months.find(m => m.value === selectedMonth)?.label} {selectedYear}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl p-6 shadow-xl">
              <p className="text-4xl font-bold">{monthlyStats.totalDays}</p>
              <p className="text-lg mt-2 opacity-90">School Days</p>
              <p className="text-sm opacity-80">With recorded attendance</p>
            </div>
          </div>

          {/* Monthly Attendance Table */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
            <div className="bg-gradient-to-r from-red-800 to-red-900 text-white px-6 py-5">
              <h3 className="text-2xl font-bold flex items-center gap-4">
                <TableCellsIcon className="w-7 h-7" />
                Monthly Attendance Summary - {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
              </h3>
              {selectedSection && <p className="text-red-200 mt-1">Section: {selectedSection}</p>}
              {selectedAttendanceSubject && <p className="text-red-200 mt-1">Subject: {selectedAttendanceSubject}</p>}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">#</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Student Name</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">LRN</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Grade & Section</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-green-700 uppercase tracking-wider">Present</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-red-700 uppercase tracking-wider">Absent</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-orange-700 uppercase tracking-wider">Late</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-blue-700 uppercase tracking-wider">Total Days</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-purple-700 uppercase tracking-wider">Rate</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                        Loading attendance data...
                      </td>
                    </tr>
                  ) : monthlyAttendance.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                        No students found for the selected filters
                      </td>
                    </tr>
                  ) : (
                    monthlyAttendance.map((student, index) => (
                      <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{index + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{student.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{student.lrn}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{student.gradeLevel} - {student.section}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full font-bold">{student.presentDays}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full font-bold">{student.absentDays}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full font-bold">{student.lateDays}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-bold">{student.totalDays}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-3 py-1 rounded-full font-bold ${
                            student.attendanceRate >= 90 ? 'bg-green-100 text-green-800' :
                            student.attendanceRate >= 75 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {student.attendanceRate}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary Footer */}
            <div className="bg-gray-100 px-6 py-4 border-t border-gray-200">
              <p className="text-gray-700">
                <strong>Total Students:</strong> {monthlyAttendance.length} | 
                <strong className="ml-2">Average Attendance Rate:</strong>{' '}
                {monthlyAttendance.length > 0 
                  ? Math.round(monthlyAttendance.reduce((sum, s) => sum + s.attendanceRate, 0) / monthlyAttendance.length)
                  : 0}%
              </p>
            </div>
          </div>
        </>
      )}

      {/* GRADES TAB */}
      {activeTab === "grades" && (
        <>
          {/* Sub-tabs */}
          <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-200">
            <div className="flex gap-2 flex-wrap items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: 'overall', label: '🏆 Overall Average Ranking' },
                  { key: 'per-subject', label: '📚 Per Subject Ranking' },
                  { key: 'by-quarter', label: '📅 By Quarter' },
                ].map(tab => (
                  <button key={tab.key} onClick={() => setGradesSubTab(tab.key)}
                    className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                      gradesSubTab === tab.key ? 'bg-red-800 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              <button
                onClick={publishCurrentRanking}
                disabled={publishingRanking}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {publishingRanking ? 'Posting...' : 'Post Current Ranking'}
              </button>
            </div>

            {publishStatus && (
              <p className={`mt-3 text-sm font-medium ${publishStatus.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
                {publishStatus.message}
              </p>
            )}
          </div>

          {/* Overall Average Ranking */}
          {gradesSubTab === 'overall' && (
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
              {(() => {
                const sortedStudents = [...students].filter((s) => !isInactiveStudent(s)).sort((a, b) => (b.average || 0) - (a.average || 0));
                const completeStudents = sortedStudents.filter(isStudentReportCardComplete);
                const isRankingActive = Boolean(selectedSection) && sortedStudents.length > 0 && completeStudents.length === sortedStudents.length;
                const pendingCount = sortedStudents.length - completeStudents.length;
                const rowsToRank = isRankingActive ? sortedStudents : [];

                return (
                  <>
              <div className="bg-gradient-to-r from-red-800 to-red-900 text-white px-6 py-5">
                <h3 className="text-xl font-bold">🏆 Overall Average Ranking</h3>
                <p className="text-red-200 text-sm mt-1">
                  {selectedSection || 'All Sections'} — {isRankingActive ? 'ranking active' : 'ranking inactive'}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <th className="px-4 py-4 text-left">Rank</th>
                      <th className="px-4 py-4 text-left">Student Name</th>
                      <th className="px-4 py-4 text-left">Grade &amp; Section</th>
                      {allSubjects.map(s => <th key={s} className="px-3 py-4 text-center whitespace-nowrap">{s}</th>)}
                      <th className="px-4 py-4 text-center bg-gray-100">Overall Avg</th>
                      <th className="px-4 py-4 text-center bg-gray-100">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan={4 + allSubjects.length} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                    ) : !selectedSection ? (
                      <tr>
                        <td colSpan={6 + allSubjects.length} className="px-6 py-8 text-center text-amber-700 bg-amber-50">
                          Select a Grade &amp; Section first to activate ranking.
                        </td>
                      </tr>
                    ) : !isRankingActive ? (
                      <tr>
                        <td colSpan={6 + allSubjects.length} className="px-6 py-8 text-center text-amber-700 bg-amber-50">
                          Ranking is inactive. Please complete all report card grades (Q1-Q4 per subject) for all students first. Pending students: {pendingCount}
                        </td>
                      </tr>
                    ) : rowsToRank.map((student, idx) => (
                      <tr key={student.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 font-bold text-gray-700">#{idx + 1}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{student.lastName}, {student.firstName}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{student.gradeLevel} - {student.section}</td>
                        {allSubjects.map(subj => {
                          const g = student.grades?.[subj];
                          const vals = g ? [g.q1, g.q2, g.q3, g.q4].filter(v => v > 0) : [];
                          const avg = vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—';
                          return <td key={subj} className="px-3 py-3 text-center text-gray-700">{avg}</td>;
                        })}
                        <td className="px-4 py-3 text-center font-bold text-gray-900">{student.average?.toFixed(2) || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            (student.average || 0) >= 98 ? 'bg-yellow-100 text-yellow-800' :
                            (student.average || 0) >= 95 ? 'bg-green-100 text-green-800' :
                            (student.average || 0) >= 85 ? 'bg-emerald-100 text-emerald-800' :
                            (student.average || 0) >= 75 ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {(student.average || 0) >= 98 ? '🥇 With Highest Honors' :
                             (student.average || 0) >= 95 ? '🥈 With High Honors' :
                             (student.average || 0) >= 85 ? '🥉 With Honors' :
                             (student.average || 0) >= 75 ? '✅ No Award' :
                             '❌ Failed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Per Subject Ranking */}
          {gradesSubTab === 'per-subject' && (
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
              {(() => {
                const activeStudents = students.filter((s) => !isInactiveStudent(s));
                const completeStudents = activeStudents.filter(isStudentReportCardComplete);
                const isRankingActive = Boolean(selectedSection)
                  && activeStudents.length > 0
                  && completeStudents.length === activeStudents.length;
                const pendingCount = activeStudents.length - completeStudents.length;

                return (
                  <>
              <div className="bg-gradient-to-r from-blue-700 to-blue-800 text-white px-6 py-5 flex flex-wrap items-center gap-4">
                <h3 className="text-xl font-bold">📚 Per Subject Ranking</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-blue-200">Subject:</span>
                  <select value={selectedSubjectForRanking} onChange={e => setSelectedSubjectForRanking(e.target.value)}
                    className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm border border-blue-400 focus:outline-none">
                    {allSubjects.length === 0 && <option value="">No grades yet</option>}
                    {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-blue-200">Quarter:</span>
                  <select value={selectedQuarterForView} onChange={e => setSelectedQuarterForView(e.target.value)}
                    className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm border border-blue-400 focus:outline-none">
                    <option value="q1">Quarter 1</option>
                    <option value="q2">Quarter 2</option>
                    <option value="q3">Quarter 3</option>
                    <option value="q4">Quarter 4</option>
                    <option value="all">All Quarters (Avg)</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <th className="px-4 py-4 text-left">Rank</th>
                      <th className="px-4 py-4 text-left">Student Name</th>
                      <th className="px-4 py-4 text-left">Grade &amp; Section</th>
                      <th className="px-4 py-4 text-center">Q1</th>
                      <th className="px-4 py-4 text-center">Q2</th>
                      <th className="px-4 py-4 text-center">Q3</th>
                      <th className="px-4 py-4 text-center">Q4</th>
                      <th className="px-4 py-4 text-center bg-blue-50">{selectedQuarterForView === 'all' ? 'Subject Avg' : selectedQuarterForView.toUpperCase()}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(() => {
                      if (!selectedSubjectForRanking) return <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">Select a subject above</td></tr>;
                      if (!selectedSection) {
                        return (
                          <tr>
                            <td colSpan={8} className="px-6 py-8 text-center text-amber-700 bg-amber-50">
                              Select a Grade &amp; Section first to activate ranking.
                            </td>
                          </tr>
                        );
                      }
                      if (!isRankingActive) {
                        return (
                          <tr>
                            <td colSpan={8} className="px-6 py-8 text-center text-amber-700 bg-amber-50">
                              Ranking is inactive. Please complete all report card grades (Q1-Q4 per subject) for all students first. Pending students: {pendingCount}
                            </td>
                          </tr>
                        );
                      }
                      const getGrade = (s) => {
                        const g = s.grades?.[selectedSubjectForRanking];
                        if (!g) return 0;
                        if (selectedQuarterForView === 'all') {
                          const vals = [g.q1, g.q2, g.q3, g.q4].filter(v => v > 0);
                          return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
                        }
                        return g[selectedQuarterForView] || 0;
                      };
                      const sorted = [...students].filter(s => !isInactiveStudent(s) && getGrade(s) > 0).sort((a, b) => getGrade(b) - getGrade(a));
                      if (sorted.length === 0) return <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">No grades for {selectedSubjectForRanking}</td></tr>;
                      return sorted.map((student, idx) => {
                        const g = student.grades?.[selectedSubjectForRanking] || {};
                        return (
                          <tr key={student.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3 font-bold text-gray-700">#{idx + 1}</td>
                            <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{student.lastName}, {student.firstName}</td>
                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{student.gradeLevel} - {student.section}</td>
                            <td className="px-4 py-3 text-center">{g.q1 || '—'}</td>
                            <td className="px-4 py-3 text-center">{g.q2 || '—'}</td>
                            <td className="px-4 py-3 text-center">{g.q3 || '—'}</td>
                            <td className="px-4 py-3 text-center">{g.q4 || '—'}</td>
                            <td className="px-4 py-3 text-center font-bold text-blue-700">{getGrade(student).toFixed(2)}</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* By Quarter — full class grade grid */}
          {gradesSubTab === 'by-quarter' && (
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
              {(() => {
                const activeStudents = students.filter((s) => !isInactiveStudent(s));
                const completeStudents = activeStudents.filter(isStudentReportCardComplete);
                const isQuarterRankingActive = Boolean(selectedSection)
                  && activeStudents.length > 0
                  && completeStudents.length === activeStudents.length;
                const pendingCount = activeStudents.length - completeStudents.length;

                return (
                  <>
              <div className="bg-gradient-to-r from-purple-700 to-purple-800 text-white px-6 py-5 flex items-center gap-4">
                <h3 className="text-xl font-bold">📅 Class Grades by Quarter</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-purple-200">Quarter:</span>
                  <select value={selectedQuarterForView} onChange={e => setSelectedQuarterForView(e.target.value)}
                    className="px-3 py-1.5 rounded bg-purple-600 text-white text-sm border border-purple-400 focus:outline-none">
                    <option value="q1">Quarter 1</option>
                    <option value="q2">Quarter 2</option>
                    <option value="q3">Quarter 3</option>
                    <option value="q4">Quarter 4</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <th className="px-4 py-4 text-left">Student</th>
                      <th className="px-4 py-4 text-left">Grade &amp; Section</th>
                      {allSubjects.map(s => <th key={s} className="px-3 py-4 text-center whitespace-nowrap">{s}</th>)}
                      <th className="px-4 py-4 text-center bg-purple-50">Quarter Avg</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {!selectedSection ? (
                      <tr>
                        <td colSpan={3 + allSubjects.length} className="px-6 py-8 text-center text-amber-700 bg-amber-50">
                          Select a Grade &amp; Section first to activate quarter ranking.
                        </td>
                      </tr>
                    ) : !isQuarterRankingActive ? (
                      <tr>
                        <td colSpan={3 + allSubjects.length} className="px-6 py-8 text-center text-amber-700 bg-amber-50">
                          Ranking is inactive. Please complete all report card grades (Q1-Q4 per subject) for all students first. Pending students: {pendingCount}
                        </td>
                      </tr>
                    ) : [...students].sort((a, b) => (b.average || 0) - (a.average || 0)).map((student, idx) => {
                      const gradeVals = allSubjects.map(s => student.grades?.[s]?.[selectedQuarterForView] || 0).filter(v => v > 0);
                      const qAvg = gradeVals.length > 0 ? (gradeVals.reduce((a, b) => a + b, 0) / gradeVals.length).toFixed(2) : '—';
                      return (
                        <tr key={student.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{student.lastName}, {student.firstName}</td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{student.gradeLevel} - {student.section}</td>
                          {allSubjects.map(subj => {
                            const grade = student.grades?.[subj]?.[selectedQuarterForView];
                            return (
                              <td key={subj} className={`px-3 py-3 text-center font-medium ${
                                !grade ? 'text-gray-400' : grade >= 90 ? 'text-green-700' : grade >= 75 ? 'text-blue-700' : 'text-red-700'
                              }`}>{grade || '—'}</td>
                            );
                          })}
                          <td className="px-4 py-3 text-center font-bold text-purple-700">{qAvg}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
                  </>
                );
              })()}
            </div>
          )}
        </>
      )}

      {/* SF2 Attendance Form Modal */}
      <SF2AttendanceForm
        isOpen={showSF2Modal}
        onClose={() => setShowSF2Modal(false)}
        attendanceData={rawMonthAttendance}
        students={students}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        selectedSection={selectedSection}
      />
    </div>
  );
}