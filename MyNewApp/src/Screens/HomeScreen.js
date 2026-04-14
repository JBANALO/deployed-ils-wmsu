import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, StatusBar, Modal, ActivityIndicator, Linking, TextInput, RefreshControl } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAttendance } from '../context/AttendanceContext';
import { useAuth } from '../context/AuthProvider';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { authAPI } from '../services/api';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedSection, setSelectedSection] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [pendingEmailData, setPendingEmailData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [teacherSchedules, setTeacherSchedules] = useState([]);
  const [activeSchoolYearLabel, setActiveSchoolYearLabel] = useState('');
  const [activeSchoolYearId, setActiveSchoolYearId] = useState(null);
  const [noClassDates, setNoClassDates] = useState([]);
  const lastDateRef = useRef(new Date().toISOString().split('T')[0]);
  const { attendanceLog, addManualAbsence, recordAttendance, loadAttendanceLogs } = useAttendance();
  const { user, userData, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      navigation.replace('Login');
    }
  }, [authLoading, user, navigation]);
  
  const getTeacherName = () => {
    if (!user) return 'Teacher';
    
    if (userData?.firstName && userData.firstName.trim()) {
      return userData.firstName;
    }
    
    if (user.firstName && user.firstName.trim()) {
      return user.firstName;
    }
    
    if (user.email) {
      const emailName = user.email.split('@')[0];
      return emailName.charAt(0).toUpperCase() + emailName.slice(1).replace(/[._]/g, ' ');
    }
    
    return 'Teacher';
  };

  const teacher = {
    name: getTeacherName(),
    department: user?.department || 'Elementary Department'
  };

  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadStudents();
        loadAttendanceLogs();
        loadTeacherSchedules();
        loadActiveSchoolYear();
        setRefreshKey(prev => prev + 1);
      }
    }, [user])
  );

  const getLocalDateString = (value = new Date()) => {
    const d = new Date(value);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const loadStudents = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Load students assigned to this teacher (as adviser or subject teacher)
      const response = await fetch(`https://deployed-ils-wmsu-production.up.railway.app/api/students?teacherId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('API Response:', result);
      
      // Handle both wrapped response (with success/data) and direct array
      let rawStudents = [];
      if (result.success || result.status === 'success') {
        rawStudents = result.data || result.students || [];
      } else if (Array.isArray(result)) {
        rawStudents = result;
      } else {
        throw new Error(result.message || result.error || 'Failed to load students');
      }
      
      // Process students to ensure consistent naming
      const studentsList = rawStudents.map(student => ({
        ...student,
        name: student.name || student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Unknown Student',
        studentId: student.studentId || student.lrn || student.id,
        gradeLevel: student.gradeLevel || student.grade_level || student.grade || '',
        section: student.section || student.section_name || '',
        qrCode: student.qrCode || student.qr_code // Handle both field names
      }));
      
      console.log('Loaded students:', studentsList.length);
      setStudents(studentsList);
    } catch (error) {
      console.error('Error loading students:', error);
      Alert.alert('Error', `Failed to load students: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const normalizeDayText = (value = '') => String(value).trim().toLowerCase();

  const doesScheduleMatchToday = (dayValue, nowDate) => {
    const dayText = normalizeDayText(dayValue);
    const todayName = nowDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const todayShort = todayName.slice(0, 3);

    if (!dayText) return false;
    if (dayText === 'all' || dayText.includes('monday - friday') || dayText.includes('monday-friday') || dayText.includes('mon-fri') || dayText.includes('weekdays') || dayText.includes('weekday')) {
      const day = nowDate.getDay();
      return day >= 1 && day <= 5;
    }
    if (dayText.includes('daily') || dayText.includes('everyday') || dayText.includes('every day')) {
      return true;
    }
    return dayText.includes(todayName) || dayText.includes(todayShort);
  };

  const toMinutes = (timeText) => {
    const raw = String(timeText || '').trim();
    if (!raw) return null;

    const meridiemMatch = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
    if (meridiemMatch) {
      let hh = Number(meridiemMatch[1]);
      const mm = Number(meridiemMatch[2]);
      const ap = String(meridiemMatch[3]).toUpperCase();
      if (ap === 'PM' && hh < 12) hh += 12;
      if (ap === 'AM' && hh === 12) hh = 0;
      if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
      return (hh * 60) + mm;
    }

    const basicMatch = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!basicMatch) return null;
    const hh = Number(basicMatch[1]);
    const mm = Number(basicMatch[2]);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    return (hh * 60) + mm;
  };

  const parseScheduleWindow = (schedule = {}) => {
    let startRaw = String(schedule.start_time || schedule.startTime || '').trim();
    let endRaw = String(schedule.end_time || schedule.endTime || '').trim();

    // Some payloads may place the full range in one field, e.g. "08:00 - 09:00".
    if ((!endRaw || !startRaw) && startRaw.includes('-')) {
      const parts = startRaw.split('-').map(p => p.trim());
      if (parts.length >= 2) {
        startRaw = parts[0];
        endRaw = parts[1];
      }
    }

    if ((!endRaw || !startRaw) && endRaw.includes('-')) {
      const parts = endRaw.split('-').map(p => p.trim());
      if (parts.length >= 2) {
        startRaw = startRaw || parts[0];
        endRaw = parts[1];
      }
    }

    return {
      startMinutes: toMinutes(startRaw),
      endMinutes: toMinutes(endRaw),
    };
  };

  const normalizeDate = (value) => {
    let logDate = value;
    if (logDate && String(logDate).includes('/')) {
      const parts = String(logDate).split('/');
      if (parts.length === 3) {
        logDate = `${parts[2]}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}`;
      }
    }
    return logDate;
  };

  const loadTeacherSchedules = async () => {
    if (!user?.id) return;
    try {
      const classes = await authAPI.getSubjectTeacherClasses(user.id);
      const classList = Array.isArray(classes?.data)
        ? classes.data
        : Array.isArray(classes)
        ? classes
        : [];

      const allClasses = await authAPI.getAllClasses(user?.token);
      const allClassList = Array.isArray(allClasses?.data)
        ? allClasses.data
        : Array.isArray(allClasses)
        ? allClasses
        : [];

      const scheduleRows = [];
      const firstName = String(userData?.firstName || user?.firstName || '').trim().toLowerCase();
      const lastName = String(userData?.lastName || user?.lastName || '').trim().toLowerCase();

      const collectRows = (sourceClasses) => {
        sourceClasses.forEach(cls => {
        const sts = Array.isArray(cls.subject_teachers) ? cls.subject_teachers : [];
        if (sts.length > 0) {
          sts.forEach(st => {
            const teacherIdMatch = String(st.teacher_id || st.teacherId || '') === String(user.id);
            const teacherNameText = String(st.teacher_name || st.teacherName || '').trim().toLowerCase();
            const teacherNameMatch = firstName && lastName
              ? (teacherNameText.includes(firstName) && teacherNameText.includes(lastName))
              : false;
            if (!teacherIdMatch && !teacherNameMatch) return;
            scheduleRows.push({
              classId: st.class_id || cls.id,
              grade: cls.grade || st.grade || '',
              section: cls.section || st.section || '',
              subject: st.subject || 'Subject',
              day: st.day || 'Monday - Friday',
              start_time: st.start_time || st.startTime || null,
              end_time: st.end_time || st.endTime || null,
              teacher_id: st.teacher_id || user.id,
            });
          });
        }

        // Fallback for production payload shape: subjects_teaching = "Math,Science,..."
        if (sts.length === 0 && cls.subjects_teaching) {
          const subjectList = String(cls.subjects_teaching)
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
          subjectList.forEach(subjectName => {
            scheduleRows.push({
              classId: cls.id,
              grade: cls.grade || '',
              section: cls.section || '',
              subject: subjectName,
              day: 'Daily',
              start_time: null,
              end_time: null,
              teacher_id: user.id,
            });
          });
        }
        });
      };

      collectRows(classList);
      collectRows(allClassList);

      const seen = new Set();
      const deduped = scheduleRows.filter(row => {
        const key = [row.classId, row.subject, row.day, row.start_time, row.end_time].join('|').toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // If a timed row exists for same class+subject+day, drop the no-time duplicate.
      const hasTimedForScope = new Set(
        deduped
          .filter(r => r.start_time && r.end_time)
          .map(r => [r.classId, r.subject, r.day].join('|').toLowerCase())
      );

      const cleaned = deduped.filter(r => {
        const scopeKey = [r.classId, r.subject, r.day].join('|').toLowerCase();
        if (r.start_time && r.end_time) return true;
        return !hasTimedForScope.has(scopeKey);
      });

      setTeacherSchedules(cleaned);
    } catch (error) {
      console.error('Error loading teacher schedules:', error);
      setTeacherSchedules([]);
    }
  };

  const loadActiveSchoolYear = async () => {
    try {
      const response = await authAPI.getActiveSchoolYear(user?.token);
      const sy = response?.data || response?.schoolYear || response || null;
      const label = sy?.label || sy?.name || '';
      setActiveSchoolYearLabel(label);
      setActiveSchoolYearId(sy?.id ? Number(sy.id) : null);
      await loadNoClassDays(sy?.id || null);
    } catch (error) {
      console.error('Error loading active school year:', error);
      setActiveSchoolYearLabel('');
      setActiveSchoolYearId(null);
      setNoClassDates([]);
    }
  };

  const loadNoClassDays = async (schoolYearId = null) => {
    try {
      const response = await authAPI.getNoClassDays(user?.token, schoolYearId || activeSchoolYearId || undefined);
      const rows = Array.isArray(response?.data) ? response.data : [];
      const normalized = rows
        .map((row) => String(row.no_class_date || '').split('T')[0])
        .filter(Boolean);
      setNoClassDates(normalized);
    } catch (error) {
      console.error('Error loading no-class calendar:', error);
      setNoClassDates([]);
    }
  };

  const getTodaySubjectSummaries = () => {
    const now = currentTime || new Date();
    const today = getLocalDateString(now);
    const nowMinutes = (now.getHours() * 60) + now.getMinutes();

    const todayLogs = attendanceLog.filter(log => normalizeDate(log.date) === today);
    const isScheduleActiveNow = (schedule) => {
      const { startMinutes, endMinutes } = parseScheduleWindow(schedule);
      if (startMinutes === null || endMinutes === null) return false;

      // Small grace window to avoid missing the class at exact transition minutes.
      return nowMinutes >= (startMinutes - 5) && nowMinutes <= endMinutes;
    };

    const todaysSchedules = teacherSchedules.filter(
      s => doesScheduleMatchToday(s.day, now) && isScheduleActiveNow(s)
    );

    return todaysSchedules.map(schedule => {
      const sectionStudents = students.filter(student => {
        const normalizeGrade = (value = '') => String(value).trim().toLowerCase().replace(/^grade\s+/i, '');
        const gradeNorm = normalizeGrade(student.gradeLevel || '');
        const schedGradeNorm = normalizeGrade(schedule.grade || '');
        const sectionNorm = String(student.section || '').trim().toLowerCase();
        const schedSectionNorm = String(schedule.section || '').trim().toLowerCase();
        return gradeNorm === schedGradeNorm && sectionNorm === schedSectionNorm;
      });

      let present = 0;
      let late = 0;
      let absent = 0;

      sectionStudents.forEach(student => {
        const studentIds = [String(student.id || ''), String(student.studentId || ''), String(student.lrn || '')].filter(Boolean);
        const record = todayLogs.find(log => {
          const logStudentId = String(log.studentId || log.student_id || '');
          const logClassId = String(log.classId || log.class_id || '');
          const logSubject = String(log.subject || '').trim().toLowerCase();
          const matchesStudent = studentIds.includes(logStudentId);
          const matchesClass = schedule.classId ? logClassId === String(schedule.classId) : true;
          const matchesSubject = logSubject && logSubject === String(schedule.subject || '').trim().toLowerCase();
          return matchesStudent && matchesClass && matchesSubject;
        });

        const status = String(record?.status || '').toLowerCase();
        if (status === 'present') present += 1;
        else if (status === 'late') late += 1;
        else if (status === 'absent') absent += 1;
      });

      return {
        key: `${schedule.classId}_${schedule.subject}_${schedule.start_time}_${schedule.end_time}`,
        subject: schedule.subject,
        classLabel: `${schedule.grade} - ${schedule.section}`,
        sectionName: String(schedule.section || '').trim(),
        startTime: schedule.start_time,
        endTime: schedule.end_time,
        present,
        late,
        absent,
        total: sectionStudents.length,
      };
    });
  };

  const getSectionSubjectOverview = () => {
    const summaries = getTodaySubjectSummaries();
    const bySection = {};
    summaries.forEach(item => {
      const key = String(item.sectionName || '').trim();
      if (!key) return;
      if (!bySection[key]) bySection[key] = [];
      bySection[key].push(item);
    });
    return bySection;
  };

  const formatScheduleRange = (startTime, endTime) => {
    if (!startTime || !endTime) return 'No schedule time';
    return `${startTime} - ${endTime}`;
  };

  const isSchoolDay = () => {
    const day = currentTime.getDay();
    const dateString = getLocalDateString(currentTime);
    
    if (day === 0 || day === 6) return false;
    if (noClassDates.includes(dateString)) return false;
    
    return true;
  };

  const getStudentsBySection = () => {
    const sections = {};
    students.forEach(student => {
      const section = student.section || 'No Section';
      if (!sections[section]) {
        sections[section] = [];
      }
      sections[section].push(student);
    });
    return sections;
  };

  const getSectionAttendance = (sectionName, studentsList) => {
    // Use ISO date format to match server response
    const today = new Date().toISOString().split('T')[0];

    const todayLogs = attendanceLog.filter(log => {
      let logDate = log.date;
      if (logDate && logDate.includes('/')) {
        const parts = logDate.split('/');
        if (parts.length === 3) {
          logDate = `${parts[2]}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}`;
        }
      }
      return logDate === today;
    });
    
    const studentsWithAttendance = studentsList.map(student => {
      // Normalize studentId comparison (convert to string)
      const studentIdStr = String(student.studentId || student.lrn || student.id || '');
      
      const morningLog = todayLogs.find(log => 
        String(log.studentId) === studentIdStr && (log.period || '').toLowerCase() === 'morning'
      );
      const afternoonLog = todayLogs.find(log => 
        String(log.studentId) === studentIdStr && (log.period || '').toLowerCase() === 'afternoon'
      );
      
      return {
        ...student,
        morningLog,
        afternoonLog,
      };
    });

    const morningPresent = studentsWithAttendance.filter(s => s.morningLog?.status === 'present' || s.morningLog?.status === 'Present').length;
    const morningLate = studentsWithAttendance.filter(s => s.morningLog?.status === 'late' || s.morningLog?.status === 'Late').length;
    const morningAbsent = studentsWithAttendance.filter(s => s.morningLog?.status === 'absent' || s.morningLog?.status === 'Absent').length;
    
    const afternoonPresent = studentsWithAttendance.filter(s => s.afternoonLog?.status === 'present' || s.afternoonLog?.status === 'Present').length;
    const afternoonLate = studentsWithAttendance.filter(s => s.afternoonLog?.status === 'late' || s.afternoonLog?.status === 'Late').length;
    const afternoonAbsent = studentsWithAttendance.filter(s => s.afternoonLog?.status === 'absent' || s.afternoonLog?.status === 'Absent').length;

    return {
      students: studentsWithAttendance,
      stats: {
        total: studentsList.length,
        morning: { present: morningPresent, late: morningLate, absent: morningAbsent },
        afternoon: { present: afternoonPresent, late: afternoonLate, absent: afternoonAbsent },
      }
    };
  };

  // Helper function to open email with Gmail or default mail app
  const openEmailApp = async (recipientEmail, subject, body) => {
    // Gmail URL scheme (works on both iOS and Android)
    const gmailUrl = `googlegmail://co?to=${recipientEmail}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    // Default mailto URL
    const mailtoUrl = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    try {
      // Try Gmail first
      const canOpenGmail = await Linking.canOpenURL(gmailUrl);
      if (canOpenGmail) {
        await Linking.openURL(gmailUrl);
        console.log('📧 Opened Gmail app');
        return true;
      }
    } catch (err) {
      console.log('Gmail not available:', err);
    }

    // Fallback to default mail app
    try {
      await Linking.openURL(mailtoUrl);
      console.log('📧 Opened default mail app');
      return true;
    } catch (err) {
      console.log('📧 Could not open email app:', err);
      return false;
    }
  };

  // Auto-send email notification to parent
  const sendAutoEmailNotification = (student, status, period) => {
    const recipientEmail = student.parentEmail || student.contactEmail || '';
    
    if (!recipientEmail) {
      console.log('📧 No parent email for auto-notification:', student.name);
      return;
    }

    const periodText = period === 'morning' ? 'Morning' : 'Afternoon';
    const statusText = status.toUpperCase();
    const today = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
    const timeNow = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    let statusMessage = '';
    if (status === 'present') {
      statusMessage = `We are pleased to inform you that ${student.name} has been marked PRESENT for today's ${periodText.toLowerCase()} session.`;
    } else if (status === 'late') {
      statusMessage = `We would like to inform you that ${student.name} was marked LATE for today's ${periodText.toLowerCase()} session.`;
    } else {
      statusMessage = `We regret to inform you that ${student.name} was marked ABSENT for today's ${periodText.toLowerCase()} session.`;
    }

    const subject = `Attendance Update: ${student.name} - ${statusText} (${periodText})`;
    const body = `Dear Parent/Guardian,

${statusMessage}

ATTENDANCE DETAILS:
-------------------
Student Name: ${student.name}
LRN: ${student.studentId || student.lrn || 'N/A'}
Grade & Section: ${student.gradeLevel || 'N/A'} - ${student.section || 'N/A'}
Date: ${today}
Session: ${periodText}
Time Recorded: ${timeNow}
Status: ${statusText}
-------------------

${status === 'absent' ? 'Please ensure your child attends school regularly. If there is a valid reason for the absence, kindly inform the school administration.\n\n' : ''}Thank you for your continued support in your child's education.

Best regards,
${teacher.name}
${teacher.department}
WMSU ILS - Elementary Department
Attendance Monitoring System`;

    // Open Gmail or default mail app
    openEmailApp(recipientEmail, subject, body);
    
    console.log('📧 Auto-email notification sent to:', recipientEmail);
  };

  const toggleAttendance = async (student, period) => {
    const log = period === 'morning' ? student.morningLog : student.afternoonLog;
    const currentStatus = log?.status;
    let newStatus = '';

    if (currentStatus === 'present' || currentStatus === 'late') {
      await addManualAbsence(student.studentId, period);
      newStatus = 'absent';
      Alert.alert('Updated', `${student.name} marked as absent for ${period}`);
    } else {
      await recordAttendance(student.studentId, 'present', period);
      newStatus = 'present';
      Alert.alert('Updated', `${student.name} marked as present for ${period}`);
    }

    // Auto-send email notification to parent
    sendAutoEmailNotification(student, newStatus, period);

    const sections = getStudentsBySection();
    const studentsList = sections[selectedSection.name];
    const attendance = getSectionAttendance(selectedSection.name, studentsList);
    setSelectedSection({ name: selectedSection.name, ...attendance });
  };

  const sendEmailToParent = (student, period) => {
    const log = period === 'morning' ? student.morningLog : student.afternoonLog;
    const status = log?.status || 'absent';
    
    // Use parentEmail, contact email, or student email as fallback
    const recipientEmail = student.parentEmail || student.contactEmail || '';

    const subject = `Attendance Notice - ${student.name}`;
    const body = `Dear Parent/Guardian,

This is to inform you that ${student.name} (LRN: ${student.studentId || student.lrn}) was marked as ${status.toUpperCase()} for the ${period} session today.

Section: ${student.section}
Grade Level: ${student.gradeLevel || 'N/A'}
Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
Time: ${log?.scanTime || 'N/A'}
Status: ${status.toUpperCase()}

If you have any questions or concerns, please don't hesitate to contact the school.

Best regards,
${teacher.name}
${teacher.department}
WMSU ILS - Elementary Department`;

    if (!recipientEmail) {
      // Show custom modal to enter email (works on both iOS and Android)
      setPendingEmailData({ subject, body, studentName: student.name });
      setEmailInput('');
      setEmailModalVisible(true);
      return;
    }

    // Open Gmail or default mail app
    openEmailApp(recipientEmail, subject, body);
  };

  const handleSendEmailWithInput = () => {
    if (!emailInput || !emailInput.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    if (pendingEmailData) {
      // Open Gmail or default mail app
      openEmailApp(emailInput, pendingEmailData.subject, pendingEmailData.body);
    }

    setEmailModalVisible(false);
    setEmailInput('');
    setPendingEmailData(null);
  };

  const sections = getStudentsBySection();
  const subjectSummaries = isSchoolDay() ? getTodaySubjectSummaries() : [];
  const sectionSubjectOverview = isSchoolDay() ? getSectionSubjectOverview() : {};

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      // Check if date changed (new day) - auto refresh data
      const currentDate = now.toISOString().split('T')[0];
      if (currentDate !== lastDateRef.current) {
        console.log('New day detected, refreshing attendance data...');
        lastDateRef.current = currentDate;
        loadAttendanceLogs();
        loadStudents();
        loadTeacherSchedules();
        loadActiveSchoolYear();
        setRefreshKey(prev => prev + 1);
      }
    }, 1000); // Keep mobile clock in sync every second
    return () => clearInterval(timer);
  }, [students, attendanceLog]);

  // Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadStudents(), loadAttendanceLogs(), loadTeacherSchedules(), loadActiveSchoolYear()]);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSectionPress = (sectionName, studentsList) => {
    const attendance = getSectionAttendance(sectionName, studentsList);
    setSelectedSection({ name: sectionName, ...attendance });
    setModalVisible(true);
  };

  const handleNotificationPress = () => {
    navigation.navigate('Notifications');
  };

  if (authLoading || !user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#8B0000" />
        <Text style={{ marginTop: 16, color: '#666' }}>
          {authLoading ? 'Loading...' : 'Redirecting to login...'}
        </Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar backgroundColor="#8B0000" barStyle="light-content" />
      <ScrollView 
        style={styles.container} 
        key={refreshKey}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#8B0000']}
            tintColor="#8B0000"
          />
        }
      >
        <View style={styles.welcomeCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeText}>Welcome, {teacher.name}!</Text>
            <Text style={styles.departmentText}>{teacher.department}</Text>
            <Text style={styles.schoolYearText}>
              School Year: {activeSchoolYearLabel || 'Loading...'}
            </Text>
            <Text style={styles.dateText}>
              {currentTime.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
            {!isSchoolDay() && (
              <View style={styles.holidayBadge}>
                <Icon name="calendar-remove" size={14} color="#fff" />
                <Text style={styles.holidayText}>No School Today</Text>
              </View>
            )}
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notificationIcon} onPress={handleNotificationPress}>
              <Icon name="bell" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.timeText}>
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <View style={styles.periodBadge}>
              <Icon name="book-education" size={14} color="#fff" />
              <Text style={styles.periodText}>Per Subject</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Today's Subject Attendance</Text>

          {subjectSummaries.length === 0 ? (
            <View style={styles.periodCard}>
              <View style={styles.periodHeader}>
                <Text style={styles.periodTitle}>No Active Class Right Now</Text>
                <Icon name="clock-outline" size={24} color="#8B0000" />
              </View>
              <Text style={{ color: '#666', marginTop: 8 }}>This panel only shows subjects during their scheduled teaching time.</Text>
            </View>
          ) : (
            <View style={styles.compactSubjectListCard}>
              {subjectSummaries.map((item, index) => (
                <View key={item.key}>
                  <View style={styles.compactSubjectRow}>
                    <View style={styles.compactSubjectLeft}>
                      <Text style={styles.compactSubjectName} numberOfLines={1}>{item.subject}</Text>
                      <Text style={styles.compactSubjectMeta} numberOfLines={1}>
                        {item.classLabel} • {formatScheduleRange(item.startTime, item.endTime)}
                      </Text>
                    </View>
                    <View style={styles.compactCountersWrap}>
                      <View style={[styles.compactCounter, styles.presentCounter]}>
                        <Text style={styles.compactCounterValue}>{item.present}</Text>
                        <Text style={styles.compactCounterLabel}>P</Text>
                      </View>
                      <View style={[styles.compactCounter, styles.lateCounter]}>
                        <Text style={styles.compactCounterValue}>{item.late}</Text>
                        <Text style={styles.compactCounterLabel}>L</Text>
                      </View>
                      <View style={[styles.compactCounter, styles.absentCounter]}>
                        <Text style={styles.compactCounterValue}>{item.absent}</Text>
                        <Text style={styles.compactCounterLabel}>A</Text>
                      </View>
                    </View>
                  </View>
                  {index !== subjectSummaries.length - 1 && <View style={styles.compactDivider} />}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Sections Overview</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B0000" />
            </View>
          ) : Object.keys(sections).length === 0 ? (
            <View style={styles.emptyCard}>
              <Icon name="account-off" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No students added yet</Text>
              <Text style={styles.emptySubText}>Add students in the Generate screen</Text>
            </View>
          ) : (
            Object.keys(sections).sort().map((sectionName) => {
              const studentsList = sections[sectionName];
              const rawAttendance = getSectionAttendance(sectionName, studentsList);
              // On no-school days, show zeros instead of counting unscanned as absent
              const attendance = isSchoolDay() ? rawAttendance : {
                ...rawAttendance,
                stats: {
                  ...rawAttendance.stats,
                  morning: { present: 0, late: 0, absent: 0 },
                  afternoon: { present: 0, late: 0, absent: 0 }
                }
              };
              
              return (
                <TouchableOpacity 
                  key={sectionName} 
                  style={styles.sectionCard}
                  onPress={() => handleSectionPress(sectionName, studentsList)}
                >
                  <View style={styles.sectionCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sectionName}>{sectionName}</Text>
                      <Text style={styles.sectionCount}>
                        {attendance.stats.total} students
                      </Text>
                    </View>
                    <Icon name="chevron-right" size={24} color="#8B0000" />
                  </View>
                  
                  {isSchoolDay() ? (
                    <View style={styles.sectionStats}>
                      {(sectionSubjectOverview[sectionName] || []).length === 0 ? (
                        <View style={styles.periodStat}>
                          <Text style={styles.periodStatLabel}>No subject schedule for this section today</Text>
                        </View>
                      ) : (
                        (sectionSubjectOverview[sectionName] || []).slice(0, 3).map(subjectItem => (
                          <View style={styles.periodStat} key={subjectItem.key}>
                            <Text style={styles.periodStatLabel}>{subjectItem.subject}</Text>
                            <View style={styles.periodStatRight}>
                              <View style={styles.miniSectionStats}>
                                <Text style={[styles.miniSectionStatText, { color: '#2e7d32' }]}>P {subjectItem.present}</Text>
                                <Text style={[styles.miniSectionStatText, { color: '#e65100' }]}>L {subjectItem.late}</Text>
                                <Text style={[styles.miniSectionStatText, { color: '#c62828' }]}>A {subjectItem.absent}</Text>
                              </View>
                            </View>
                          </View>
                        ))
                      )}
                      {(sectionSubjectOverview[sectionName] || []).length > 3 && (
                        <Text style={styles.moreSubjectsText}>
                          +{(sectionSubjectOverview[sectionName] || []).length - 3} more subjects
                        </Text>
                      )}
                    </View>
                  ) : (
                    <View style={styles.sectionStats}>
                      <View style={[styles.periodStat, { justifyContent: 'center' }]}>
                        <Icon name="calendar-remove" size={16} color="#8B0000" />
                        <Text style={[styles.periodStatLabel, { color: '#8B0000', marginLeft: 8 }]}>No Class Today</Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedSection && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderLeft}>
                    <View style={styles.modalTitleRow}>
                      <Icon name="account-group" size={22} color="#8B0000" />
                      <Text style={styles.modalTitle}>{selectedSection.name}</Text>
                    </View>
                    <Text style={styles.modalSubtitle}>
                      {selectedSection.stats.total} students enrolled
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Icon name="close" size={28} color="#333" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalPeriodStats}>
                  <View style={styles.modalPeriodCard}>
                    <View style={styles.modalPeriodHeader}>
                      <Text style={styles.modalPeriodLabel}>Morning</Text>
                      <Icon name="white-balance-sunny" size={20} color="#FFA500" />
                    </View>
                    <Text style={styles.modalPeriodValue}>
                      P:{selectedSection.stats.morning.present} L:{selectedSection.stats.morning.late} A:{selectedSection.stats.morning.absent}
                    </Text>
                  </View>
                  <View style={styles.modalPeriodCard}>
                    <View style={styles.modalPeriodHeader}>
                      <Text style={styles.modalPeriodLabel}>Afternoon</Text>
                      <Icon name="weather-sunset" size={20} color="#FF6B35" />
                    </View>
                    <Text style={styles.modalPeriodValue}>
                      P:{selectedSection.stats.afternoon.present} L:{selectedSection.stats.afternoon.late} A:{selectedSection.stats.afternoon.absent}
                    </Text>
                  </View>
                </View>

                <ScrollView style={styles.modalScroll}>
                  {selectedSection.students.map((student, index) => {
                    const nowHour = new Date().getHours();
                    // Only auto-mark absent after cutoff; before cutoff show neutral
                    const getEffectiveStatus = (log, period) => {
                      if (log?.status) return log.status.toLowerCase();
                      if (period === 'morning') return nowHour >= 10 ? 'absent' : 'unknown';
                      if (period === 'afternoon') return nowHour >= 14 ? 'absent' : 'unknown';
                      return 'unknown';
                    };
                    const morningStatus = getEffectiveStatus(student.morningLog, 'morning');
                    const afternoonStatus = getEffectiveStatus(student.afternoonLog, 'afternoon');
                    
                    const getStatusColor = (status) => {
                      switch(status) {
                        case 'present': return '#2e7d32';
                        case 'late': return '#e65100';
                        case 'absent': return '#c62828';
                        default: return '#9e9e9e';  // unknown = neutral gray
                      }
                    };

                    const getStatusBg = (status) => {
                      switch(status) {
                        case 'present': return '#e8f5e9';
                        case 'late': return '#fff3e0';
                        case 'absent': return '#ffebee';
                        default: return '#f5f5f5';  // unknown = neutral
                      }
                    };

                    const getStatusIcon = (status) => {
                      switch(status) {
                        case 'present': return 'check-circle';
                        case 'late': return 'clock-alert';
                        case 'absent': return 'close-circle';
                        default: return 'minus-circle';  // unknown = dash
                      }
                    };

                    const getStatusText = (status) => {
                      switch(status) {
                        case 'present': return 'Present';
                        case 'late': return 'Late';
                        case 'absent': return 'Absent';
                        default: return '—';  // unknown = dash
                      }
                    };

                    return (
                      <View key={index} style={styles.studentRow}>
                        {/* Row number */}
                        <View style={styles.studentIndex}>
                          <Text style={styles.studentIndexText}>{index + 1}</Text>
                        </View>

                        {/* Student info */}
                        <View style={styles.studentInfo}>
                          <Text style={styles.studentName} numberOfLines={1}>{student.name}</Text>
                          <Text style={styles.studentId}>LRN: {student.studentId}</Text>
                        </View>
                        
                        {/* AM / PM chips */}
                        <View style={styles.attendanceDisplay}>
                          <TouchableOpacity 
                            style={[styles.statusChip, { backgroundColor: getStatusBg(morningStatus) }]}
                            onPress={() => toggleAttendance(student, 'morning')}
                            onLongPress={() => sendEmailToParent(student, 'morning')}
                          >
                            <Icon name={getStatusIcon(morningStatus)} size={13} color={getStatusColor(morningStatus)} />
                            <Text style={[styles.chipLabel, { color: '#555' }]}>AM</Text>
                            <Text style={[styles.chipStatus, { color: getStatusColor(morningStatus) }]}>
                              {getStatusText(morningStatus)}
                            </Text>
                            {student.morningLog?.scanTime && (
                              <Text style={styles.chipTime}>{student.morningLog.scanTime}</Text>
                            )}
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                            style={[styles.statusChip, { backgroundColor: getStatusBg(afternoonStatus) }]}
                            onPress={() => toggleAttendance(student, 'afternoon')}
                            onLongPress={() => sendEmailToParent(student, 'afternoon')}
                          >
                            <Icon name={getStatusIcon(afternoonStatus)} size={13} color={getStatusColor(afternoonStatus)} />
                            <Text style={[styles.chipLabel, { color: '#555' }]}>PM</Text>
                            <Text style={[styles.chipStatus, { color: getStatusColor(afternoonStatus) }]}>
                              {getStatusText(afternoonStatus)}
                            </Text>
                            {student.afternoonLog?.scanTime && (
                              <Text style={styles.chipTime}>{student.afternoonLog.scanTime}</Text>
                            )}
                          </TouchableOpacity>
                        </View>

                        {/* Email button */}
                        <TouchableOpacity 
                          style={styles.emailButton}
                          onPress={() => {
                            Alert.alert(
                              'Send Email',
                              `Send attendance report for ${student.name}?`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Morning', onPress: () => sendEmailToParent(student, 'morning') },
                                { text: 'Afternoon', onPress: () => sendEmailToParent(student, 'afternoon') },
                              ]
                            );
                          }}
                        >
                          <Icon name="email-outline" size={18} color="#8B0000" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </ScrollView>

                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Email Input Modal - Cross-platform support */}
      <Modal
        visible={emailModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEmailModalVisible(false)}
      >
        <View style={styles.emailModalOverlay}>
          <View style={styles.emailModalContent}>
            <Text style={styles.emailModalTitle}>Enter Parent Email</Text>
            <Text style={styles.emailModalSubtitle}>
              No email found for {pendingEmailData?.studentName}. Please enter the parent/guardian email:
            </Text>
            <TextInput
              style={styles.emailTextInput}
              placeholder="parent@email.com"
              placeholderTextColor="#999"
              value={emailInput}
              onChangeText={setEmailInput}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.emailModalButtons}>
              <TouchableOpacity 
                style={styles.emailCancelButton}
                onPress={() => {
                  setEmailModalVisible(false);
                  setEmailInput('');
                  setPendingEmailData(null);
                }}
              >
                <Text style={styles.emailCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.emailSendButton}
                onPress={handleSendEmailWithInput}
              >
                <Text style={styles.emailSendText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  welcomeCard: { 
    backgroundColor: '#8B0000', 
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeText: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  departmentText: { fontSize: 14, color: '#fff', opacity: 0.9, marginTop: 4 },
  schoolYearText: { fontSize: 12, color: '#fff', opacity: 0.85, marginTop: 4 },
  dateText: { fontSize: 12, color: '#fff', opacity: 0.8, marginTop: 8 },
  holidayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
    gap: 4,
  },
  holidayText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  headerRight: { alignItems: 'flex-end', gap: 8 },
  notificationIcon: { position: 'relative', padding: 4 },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ff3b30',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  timeText: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  periodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  periodText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  
  statsSection: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  periodCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  periodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  periodTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: 4 },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: '#8B0000' },
  statLabel: { fontSize: 12, color: '#666', fontWeight: '600' },
  compactSubjectListCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    elevation: 2,
  },
  compactSubjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 10,
  },
  compactSubjectLeft: {
    flex: 1,
    marginRight: 10,
  },
  compactSubjectName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f1f1f',
  },
  compactSubjectMeta: {
    marginTop: 2,
    fontSize: 12,
    color: '#666',
  },
  compactCountersWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactCounter: {
    minWidth: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    paddingVertical: 6,
    paddingHorizontal: 7,
  },
  presentCounter: { backgroundColor: '#e8f5e9' },
  lateCounter: { backgroundColor: '#fff3e0' },
  absentCounter: { backgroundColor: '#ffebee' },
  compactCounterValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#222',
    lineHeight: 18,
  },
  compactCounterLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: '700',
    marginTop: 1,
  },
  compactDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  
  sectionContainer: { paddingHorizontal: 16, marginBottom: 16 },
  loadingContainer: { padding: 40, alignItems: 'center' },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  emptyText: { fontSize: 16, color: '#999', marginTop: 12, fontWeight: '600' },
  emptySubText: { fontSize: 14, color: '#ccc', marginTop: 4 },
  
  sectionCard: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 12,
    elevation: 2,
  },
  sectionCardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  sectionCount: { fontSize: 13, color: '#666', marginTop: 4 },
  sectionStats: { gap: 8 },
  periodStat: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  periodStatLabel: { fontSize: 13, fontWeight: '600', color: '#666' },
  periodStatRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  periodStatValue: { fontSize: 12, color: '#666' },
  miniSectionStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fafafa',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  miniSectionStatText: {
    fontSize: 11,
    fontWeight: '700',
  },
  moreSubjectsText: {
    marginTop: 4,
    fontSize: 11,
    color: '#8B0000',
    fontWeight: '600',
  },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
    maxHeight: '85%',
    marginBottom: 100,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  modalHeaderLeft: { flex: 1 },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#8B0000' },
  modalSubtitle: { fontSize: 13, color: '#777', marginLeft: 30 },
  modalPeriodStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  modalPeriodCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  modalPeriodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalPeriodLabel: { fontSize: 13, fontWeight: 'bold', color: '#666' },
  modalPeriodValue: { fontSize: 12, color: '#666' },
  modalScroll: { maxHeight: 400 },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#efefef',
    elevation: 1,
  },
  studentIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#8B0000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    flexShrink: 0,
  },
  studentIndexText: { fontSize: 11, fontWeight: 'bold', color: '#fff' },
  studentInfo: { flex: 1, marginRight: 8 },
  studentName: { fontSize: 14, fontWeight: '700', color: '#222' },
  studentId: { fontSize: 11, color: '#8B0000', marginTop: 1 },
  attendanceDisplay: { flexDirection: 'row', gap: 6 },
  statusChip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: 8,
    minWidth: 58,
    gap: 1,
  },
  chipLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  chipStatus: { fontSize: 11, fontWeight: '700', marginTop: 1 },
  chipTime: { fontSize: 9, color: '#888', marginTop: 1 },
  periodAttendance: { alignItems: 'center', minWidth: 70 },
  periodLabel: { fontSize: 11, fontWeight: 'bold', color: '#666', marginBottom: 4 },
  statusText: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  timeTextSmall: { fontSize: 10, color: '#666', marginTop: 2 },
  emailButton: {
    padding: 7,
    backgroundColor: '#fce4ec',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  closeButton: {
    backgroundColor: '#8B0000',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  closeButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  
  // Email Input Modal Styles
  emailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emailModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  emailModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emailModalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  emailTextInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  emailModalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  emailCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  emailCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  emailSendButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#8B0000',
  },
  emailSendText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
