import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, StatusBar, Modal, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAttendance } from '../context/AttendanceContext';
import { useAuth } from '../context/AuthProvider';
import { authAPI } from '../services/api';

const API_BASE_URL = 'https://deployed-ils-wmsu-production.up.railway.app/api';

export default function ScanQRScreen() {
  const [scannedStudent, setScannedStudent] = useState(null);
  const [scanning, setScanning] = useState(true);
  const [permission, requestPermission] = useCameraPermissions();
  const [hasScanned, setHasScanned] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState('present');
  const [attendancePeriod, setAttendancePeriod] = useState('subject');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [teacherSchedules, setTeacherSchedules] = useState([]);
  const [activeSchedule, setActiveSchedule] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const { addAttendance, loadAttendanceLogs } = useAttendance();
  const { user, userData } = useAuth();

  // Get teacher name
  const getTeacherName = () => {
    if (!user) return 'Teacher';
    if (userData?.firstName) return `${userData.firstName} ${userData.lastName || ''}`.trim();
    if (user.firstName) return `${user.firstName} ${user.lastName || ''}`.trim();
    return 'Teacher';
  };
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

 
  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, []);

  const normalizeDayText = (value = '') => String(value).trim().toLowerCase();
  const normalizeGradeText = (value = '') => String(value).toLowerCase().replace('grade ', '').trim();

  const toMinutes = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return null;

    // Supports both 24-hour (14:00, 14:00:00) and 12-hour (2:00 PM) inputs.
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

  const doesScheduleMatchToday = (dayValue, nowDate) => {
    const dayText = normalizeDayText(dayValue);
    const todayName = nowDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const todayShort = todayName.slice(0, 3);

    if (!dayText) return false;
    if (dayText.includes('monday - friday') || dayText.includes('mon-fri') || dayText.includes('weekdays')) {
      const day = nowDate.getDay();
      return day >= 1 && day <= 5;
    }
    if (dayText.includes('daily') || dayText.includes('everyday') || dayText.includes('every day')) {
      return true;
    }
    return dayText.includes(todayName) || dayText.includes(todayShort);
  };

  const getSubjectScheduleStatus = (schedule, nowDate) => {
    const nowMinutes = (nowDate.getHours() * 60) + nowDate.getMinutes();
    const startMinutes = toMinutes(schedule.start_time);
    const endMinutes = toMinutes(schedule.end_time);

    if (startMinutes === null || endMinutes === null) {
      return { status: 'present', period: 'subject' };
    }

    const lateThreshold = startMinutes + 30;
    if (nowMinutes <= lateThreshold) return { status: 'present', period: 'subject' };
    if (nowMinutes <= endMinutes) return { status: 'late', period: 'subject' };
    return { status: 'absent', period: 'subject' };
  };

  const getActiveScheduleForStudent = (student, nowDate = new Date()) => {
    const nowMinutes = (nowDate.getHours() * 60) + nowDate.getMinutes();
    const gradeNorm = normalizeGradeText(student.gradeLevel || '');
    const sectionNorm = String(student.section || '').trim().toLowerCase();

    const candidates = teacherSchedules.filter(s => {
      const scheduleGradeNorm = normalizeGradeText(s.grade || '');
      const scheduleSectionNorm = String(s.section || '').trim().toLowerCase();
      const gradeMatch = scheduleGradeNorm ? scheduleGradeNorm === gradeNorm : true;
      const sectionMatch = scheduleSectionNorm ? scheduleSectionNorm === sectionNorm : true;
      return (
        gradeMatch &&
        sectionMatch &&
        doesScheduleMatchToday(s.day, nowDate)
      );
    });

    return candidates.find(s => {
      const start = toMinutes(s.start_time);
      const end = toMinutes(s.end_time);
      if (start === null || end === null) return false;
      return nowMinutes >= start && nowMinutes <= end;
    }) || null;
  };

  const loadTeacherSchedules = async () => {
    if (!user?.id) return;
    try {
      setScheduleLoading(true);
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

      const rows = [];
      const firstName = String(userData?.firstName || user?.firstName || '').trim().toLowerCase();
      const lastName = String(userData?.lastName || user?.lastName || '').trim().toLowerCase();

      const collectRows = (sourceClasses) => {
        sourceClasses.forEach(cls => {
          const sts = Array.isArray(cls.subject_teachers) ? cls.subject_teachers : [];
          sts.forEach(st => {
            const teacherIdMatch = String(st.teacher_id || st.teacherId || '') === String(user.id);
            const teacherNameText = String(st.teacher_name || st.teacherName || '').trim().toLowerCase();
            const teacherNameMatch = firstName && lastName
              ? (teacherNameText.includes(firstName) && teacherNameText.includes(lastName))
              : false;
            if (!teacherIdMatch && !teacherNameMatch) return;

            rows.push({
              classId: st.class_id || cls.id,
              grade: cls.grade || st.grade || '',
              section: cls.section || st.section || '',
              subject: st.subject || 'Subject',
              day: st.day || 'Monday - Friday',
              start_time: st.start_time || st.startTime || null,
              end_time: st.end_time || st.endTime || null,
            });
          });
        });
      };

      collectRows(classList);
      collectRows(allClassList);

      const seen = new Set();
      const deduped = rows.filter(row => {
        const key = [row.classId, row.subject, row.day, row.start_time, row.end_time].join('|').toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setTeacherSchedules(deduped);
    } catch (error) {
      console.error('Error loading teacher schedules for scanner:', error);
      setTeacherSchedules([]);
    } finally {
      setScheduleLoading(false);
    }
  };

  useEffect(() => {
    loadTeacherSchedules();
  }, [user?.id]);


  const getPeriodMessage = () => {
    if (!scannedStudent || !activeSchedule) {
      return {
        text: 'Per-subject mode: scan QR to match the active class schedule',
        color: '#1976d2',
        icon: 'information'
      };
    }

    const start = activeSchedule.start_time || '--:--';
    const end = activeSchedule.end_time || '--:--';
    if (attendanceStatus === 'late') {
      return { text: `${activeSchedule.subject} ${start}-${end} • LATE`, color: '#ff9800', icon: 'clock-alert' };
    }
    if (attendanceStatus === 'absent') {
      return { text: `${activeSchedule.subject} ${start}-${end} • ABSENT`, color: '#f44336', icon: 'close-circle' };
    }
    return { text: `${activeSchedule.subject} ${start}-${end} • PRESENT`, color: '#4caf50', icon: 'check-circle' };
  };

  const periodMsg = getPeriodMessage();

  
  const handleBarCodeScanned = async ({ data }) => {
    if (hasScanned || !user) return;

    if (scheduleLoading || teacherSchedules.length === 0) {
      Alert.alert(
        'Schedule Not Ready',
        'Still loading your class schedules. Please wait a few seconds then scan again.'
      );
      return;
    }
    
    setHasScanned(true);
    setScanning(false);

    try {
      console.log('📱 QR Scan - Raw data:', data);

      // --- Parse QR data: support JSON, pipe-delimited, and multi-line text formats ---
      let qrData = {};
      let studentIdFromQR = null;

      try {
        // Format 1: JSON  {"studentId":"...","lrn":"...","name":"..."}
        qrData = JSON.parse(data);
        studentIdFromQR = qrData.studentId || qrData.lrn || qrData.id;
        console.log('📱 QR Scan - Parsed as JSON');
      } catch (_) {
        if (data.includes('|')) {
          // Format 2: Pipe-delimited  LRN|Full Name|Grade Level|Section
          const parts = data.split('|');
          studentIdFromQR = parts[0]?.trim();
          qrData = {
            studentId: studentIdFromQR,
            lrn: studentIdFromQR,
            name: parts[1]?.trim() || '',
            gradeLevel: parts[2]?.trim() || '',
            section: parts[3]?.trim() || '',
          };
          console.log('📱 QR Scan - Parsed as pipe-delimited');
        } else if (data.includes('LRN:')) {
          // Format 3: Multi-line text  "LRN: xxx\nFull Name: ..."
          const lines = data.split('\n');
          const lrnLine = lines.find(l => l.startsWith('LRN:'));
          const nameLine = lines.find(l => l.startsWith('Full Name:'));
          const classLine = lines.find(l => l.startsWith('Class:'));
          studentIdFromQR = lrnLine ? lrnLine.replace('LRN:', '').trim() : null;
          const classStr = classLine ? classLine.replace('Class:', '').trim() : '';
          const classParts = classStr.split(' - ');
          qrData = {
            studentId: studentIdFromQR,
            lrn: studentIdFromQR,
            name: nameLine ? nameLine.replace('Full Name:', '').trim() : '',
            gradeLevel: classParts[0]?.trim() || '',
            section: classParts[1]?.trim() || '',
          };
          console.log('📱 QR Scan - Parsed as multi-line text');
        }
      }

      console.log('📱 QR Scan - Parsed data:', qrData);
      // -----------------------------------------------------------------------

      if (studentIdFromQR) {
        try {
          // Get all students and check if the scanned student exists
          const response = await fetch(`https://deployed-ils-wmsu-production.up.railway.app/api/students`, {
            headers: {
              'Authorization': `Bearer ${user.token}`,
              'Content-Type': 'application/json',
            },
          });

          const result = await response.json();
          
          if (result.success || result.status === 'success') {
            const students = result.data || result.students || [];
            
            // Find the student in the database
            const student = students.find(s => 
              s.id === studentIdFromQR || 
              s.studentId === studentIdFromQR ||
              s.lrn === studentIdFromQR
            );
            
            console.log('📱 QR Scan - Student found:', student ? 'YES' : 'NO');
            console.log('📱 QR Scan - Searching for ID:', studentIdFromQR);
            
            if (!student) {
              Alert.alert(
                'Student Not Found',
                'This student is not registered in the system.',
                [{ text: 'OK', onPress: () => resetScanner() }]
              );
              return;
            }
            
            console.log('Found student:', student);

            const formattedStudent = {
              ...qrData,
              name: student.name || student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim(),
              studentId: student.lrn || student.studentId || student.id, // Use LRN as primary ID
              lrn: student.lrn || student.studentId,
              section: student.section || 'Unknown Section',
              gradeLevel: student.gradeLevel || student.grade_level || student.grade || 'Unknown Grade',
              parentEmail: student.parentEmail || '', // For auto email notification
              parentContact: student.parentContact || '',
              contactEmail: student.contactEmail || student.email || ''
            };

            const matchedSchedule = getActiveScheduleForStudent(formattedStudent, currentTime);
            if (!matchedSchedule) {
              const nowMinutes = (currentTime.getHours() * 60) + currentTime.getMinutes();
              const hasAnyTodayScheduleForClass = teacherSchedules.some(s => {
                const gradeMatch = normalizeGradeText(s.grade || '') === normalizeGradeText(formattedStudent.gradeLevel || '');
                const sectionMatch = String(s.section || '').trim().toLowerCase() === String(formattedStudent.section || '').trim().toLowerCase();
                return gradeMatch && sectionMatch && doesScheduleMatchToday(s.day, currentTime);
              });

              const outsideTimeHint = hasAnyTodayScheduleForClass
                ? 'Class schedule exists today, but current time is outside the assigned time window.'
                : 'No class schedule found for this student section today.';

              Alert.alert(
                'No Active Subject Schedule',
                `${formattedStudent.name} has no active subject schedule right now. ${outsideTimeHint}`,
                [{ text: 'OK', onPress: () => resetScanner() }]
              );
              return;
            }

            const { status, period } = getSubjectScheduleStatus(matchedSchedule, currentTime);
            setActiveSchedule(matchedSchedule);
            setAttendanceStatus(status);
            setAttendancePeriod(period);

            setScannedStudent({
              ...formattedStudent,
              status,
              period,
              classId: matchedSchedule.classId,
              subject: matchedSchedule.subject,
              scheduleDay: matchedSchedule.day,
              scheduleStartTime: matchedSchedule.start_time,
              scheduleEndTime: matchedSchedule.end_time,
              scanTime: currentTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
              })
            });
          } else {
            Alert.alert(
              'Error',
              'Failed to verify student. Please try again.',
              [{ text: 'OK', onPress: () => resetScanner() }]
            );
            return;
          }

        } catch (error) {
          console.error('Error verifying student:', error);
        }
      } else {
        console.log('📱 QR Scan - No valid student ID found in QR data');
        Alert.alert(
          'Invalid QR Code',
          'This QR code does not contain valid student information.',
          [{ text: 'OK', onPress: () => resetScanner() }]
        );
        return;
      }

    } catch (e) {
      console.error('📱 QR Scan - Unexpected error:', e);
      Alert.alert(
        'Scan Error',
        'An unexpected error occurred while scanning. Please try again.',
        [{ text: 'OK', onPress: () => resetScanner() }]
      );
    }
  };

  const handleMarkPresent = () => {
    setAttendanceStatus('present');
  };

  const handleMarkLate = () => {
    setAttendanceStatus('late');
  };

  const handleMarkAbsent = () => {
    setAttendanceStatus('absent');
  };

  // Auto-send email to parent via server API (truly automatic - no user interaction needed)
  const sendAutoEmailToParent = async (student, status, period, scanTime) => {
    const recipientEmail = student.parentEmail || student.contactEmail || '';
    
    if (!recipientEmail) {
      console.log('📧 No parent email found for:', student.name);
      return { success: false, reason: 'No email' };
    }

    try {
      console.log('📧 Sending automatic email to:', recipientEmail);
      
      const response = await fetch(`${API_BASE_URL}/attendance/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parentEmail: recipientEmail,
          studentName: student.name,
          studentLRN: student.studentId || student.lrn || 'N/A',
          gradeLevel: student.gradeLevel || 'N/A',
          section: student.section || 'N/A',
          status: status,
          period: period,
          subject: student.subject || null,
          scheduleStartTime: student.scheduleStartTime || null,
          scheduleEndTime: student.scheduleEndTime || null,
          time: scanTime,
          teacherName: getTeacherName()
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Email sent successfully to:', recipientEmail);
        return { success: true };
      } else {
        console.log('❌ Email sending failed:', result.message);
        return { success: false, reason: result.message };
      }
    } catch (error) {
      console.log('❌ Email API error:', error.message);
      return { success: false, reason: error.message };
    }
  };

  const handleConfirmAttendance = async () => {
    try {
      // Add null checking
      if (!scannedStudent) {
        Alert.alert('Error', 'No student data found. Please scan again.');
        return;
      }

      if (!scannedStudent.studentId) {
        Alert.alert('Error', 'Invalid student ID. Please scan again.');
        return;
      }

      setSendingEmail(true);
     
      const attendanceResult = await addAttendance(
        scannedStudent.studentId,
        'subject',
        attendanceStatus,
        {
          studentName: scannedStudent.name,
          gradeLevel: scannedStudent.gradeLevel,
          section: scannedStudent.section,
          subject: scannedStudent.subject,
          classId: scannedStudent.classId,
          scheduleDay: scannedStudent.scheduleDay,
          scheduleStartTime: scannedStudent.scheduleStartTime,
          scheduleEndTime: scannedStudent.scheduleEndTime,
          autoMarked: false
        }
      );
      
      const periodText = scannedStudent.subject || 'Subject';
      const periodForEmail = scannedStudent.subject
        ? `${scannedStudent.subject} (${scannedStudent.scheduleStartTime || '--:--'}-${scannedStudent.scheduleEndTime || '--:--'})`
        : 'Subject Schedule';
      
      // Auto-send email to parent (server-side - truly automatic)
      const emailResult = await sendAutoEmailToParent(scannedStudent, attendanceStatus, periodForEmail, scannedStudent.scanTime);
      
      setSendingEmail(false);

      if (!attendanceResult?.success) {
        Alert.alert('Save Failed', attendanceResult?.error || 'Attendance was not saved. Please try again.');
        return;
      }

      // Only refresh from server if the save succeeded (so we don't wipe optimistic update)
      loadAttendanceLogs();

      // Show custom success modal with real icons
      setSuccessData({
        studentName: scannedStudent.name,
        status: attendanceStatus,
        period: periodText,
        time: scannedStudent.scanTime,
        emailSent: emailResult.success,
        emailReason: emailResult.reason || '',
        parentEmail: scannedStudent.parentEmail || scannedStudent.contactEmail || ''
      });
      setSuccessModalVisible(true);
      
    } catch (error) {
      setSendingEmail(false);
      console.error('Error recording attendance:', error);
      Alert.alert('Error', 'Failed to record attendance. Please try again.');
    }
  };

  const handleSuccessModalClose = () => {
    setSuccessModalVisible(false);
    setSuccessData(null);
    resetScanner();
  };

  const resetScanner = () => {
    setScannedStudent(null);
    setScanning(true);
    setHasScanned(false);
    setAttendanceStatus('present');
    setAttendancePeriod('subject');
    setActiveSchedule(null);
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Icon name="camera-off" size={64} color="#8B0000" />
          <Text style={styles.permissionText}>Camera permission is required</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <>
      <StatusBar backgroundColor="#8B0000" barStyle="light-content" />
      <View style={styles.container}>
        <View style={styles.headerCard}>
          <View>
            <Text style={styles.headerTitle}>Scan QR Code</Text>
            <Text style={styles.headerSubtitle}>
              Per-Subject Attendance
            </Text>
          </View>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>
              {currentTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
            <Text style={styles.dateText}>
              {currentTime.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}
            </Text>
          </View>
        </View>

        <View style={[styles.warningBanner, { backgroundColor: periodMsg.color }]}>
          <Icon name={periodMsg.icon} size={20} color="#fff" />
          <Text style={styles.warningText}>{periodMsg.text}</Text>
        </View>

        {scheduleLoading && (
          <View style={[styles.warningBanner, { backgroundColor: '#455a64', marginTop: 10 }]}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.warningText}>Loading teacher schedules...</Text>
          </View>
        )}

        {scanning ? (
          <View style={styles.scannerCard}>
            <View style={styles.cameraContainer}>
              <CameraView
                style={styles.camera}
                facing="back"
                onBarcodeScanned={handleBarCodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
              />
              <View style={styles.scannerOverlay}>
                <View style={styles.scannerFrame} />
              </View>
            </View>

            <View style={styles.instructions}>
              <Text style={styles.instructionText}>
                Position QR code within the frame
              </Text>
              <Text style={[styles.instructionText, styles.boldText]}>
                Attendance is matched to the active subject schedule only
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.resultCard}>
            <View style={[
              styles.successIcon,
              attendanceStatus === 'absent' ? styles.absentIcon :
              attendanceStatus === 'late' ? styles.lateIcon : styles.presentIcon
            ]}>
              <Icon 
                name={
                  attendanceStatus === 'absent' ? "close" :
                  attendanceStatus === 'late' ? "clock-alert" : "check"
                } 
                size={48} 
                color="#fff" 
              />
            </View>

            <View style={styles.studentCard}>
              <View style={styles.studentHeader}>
                <Icon name="account-circle" size={40} color="#fff" />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.studentName}>{scannedStudent?.name}</Text>
                  <View style={styles.badgeContainer}>
                    <View style={styles.statusBadge}>
                      <Text style={styles.studentStatus}>
                        {attendanceStatus.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.periodBadge}>
                      <Text style={styles.periodText}>
                        {` ${scannedStudent?.subject || 'SUBJECT'}`}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.studentId}>{scannedStudent?.studentId}</Text>
                  <Text style={styles.studentSection}>Section: {scannedStudent?.section}</Text>
                  <Text style={styles.studentSection}>
                    Schedule: {scannedStudent?.scheduleStartTime || '--:--'} - {scannedStudent?.scheduleEndTime || '--:--'}
                  </Text>
                </View>
              </View>
              <View style={styles.timeInfo}>
                <Icon name="clock-outline" size={16} color="#fff" />
                <Text style={styles.scanTimeText}>
                  Scanned: {scannedStudent?.scanTime}
                </Text>
              </View>
            </View>

            <View style={[
              styles.autoStatusMessage,
              attendanceStatus === 'absent' ? styles.absentMessage :
              attendanceStatus === 'late' ? styles.lateMessage : styles.presentMessage
            ]}>
              <Text style={styles.autoStatusText}>
                {attendanceStatus === 'absent' 
                  ? ` Auto-marked ABSENT (After ${scannedStudent?.scheduleEndTime || '--:--'})`
                  : attendanceStatus === 'late'
                  ? ` Auto-marked LATE (30+ mins from ${scannedStudent?.scheduleStartTime || '--:--'})`
                  : ` Auto-marked PRESENT (Within first 30 mins from ${scannedStudent?.scheduleStartTime || '--:--'})`}
              </Text>
            </View>

        
            <Text style={styles.overrideLabel}>Override if needed:</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[
                  styles.actionButton, 
                  styles.presentButton,
                  attendanceStatus === 'present' && styles.activeButton
                ]} 
                onPress={handleMarkPresent}
              >
                <Icon name="check" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Present</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.actionButton, 
                  styles.lateButton,
                  attendanceStatus === 'late' && styles.activeButton
                ]} 
                onPress={handleMarkLate}
              >
                <Icon name="clock-alert" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Late</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.actionButton, 
                  styles.absentButton,
                  attendanceStatus === 'absent' && styles.activeButton
                ]} 
                onPress={handleMarkAbsent}
              >
                <Icon name="close" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Absent</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.confirmButton, sendingEmail && styles.disabledButton]} 
              onPress={handleConfirmAttendance}
              disabled={sendingEmail}
            >
              {sendingEmail ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={[styles.confirmButtonText, { marginLeft: 8 }]}>Sending...</Text>
                </View>
              ) : (
                <Text style={styles.confirmButtonText}>Confirm Attendance</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={resetScanner}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Success Modal with Real Icons */}
        <Modal
          visible={successModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={handleSuccessModalClose}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.successModal}>
              {/* Status Icon */}
              <View style={[
                styles.successModalIcon,
                successData?.status === 'present' && { backgroundColor: '#4caf50' },
                successData?.status === 'late' && { backgroundColor: '#ff9800' },
                successData?.status === 'absent' && { backgroundColor: '#f44336' }
              ]}>
                <Icon 
                  name={
                    successData?.status === 'present' ? 'check-circle' :
                    successData?.status === 'late' ? 'clock-alert' : 'close-circle'
                  } 
                  size={60} 
                  color="#fff" 
                />
              </View>

              {/* Title */}
              <Text style={styles.successModalTitle}>
                {successData?.period} Attendance Recorded!
              </Text>

              {/* Details */}
              <View style={styles.successModalDetails}>
                <View style={styles.successModalRow}>
                  <Icon name="account" size={20} color="#666" />
                  <Text style={styles.successModalLabel}>Student:</Text>
                  <Text style={styles.successModalValue}>{successData?.studentName}</Text>
                </View>
                <View style={styles.successModalRow}>
                  <Icon 
                    name={
                      successData?.status === 'present' ? 'check-circle' :
                      successData?.status === 'late' ? 'clock-alert' : 'close-circle'
                    } 
                    size={20} 
                    color={
                      successData?.status === 'present' ? '#4caf50' :
                      successData?.status === 'late' ? '#ff9800' : '#f44336'
                    } 
                  />
                  <Text style={styles.successModalLabel}>Status:</Text>
                  <Text style={[
                    styles.successModalValue,
                    { 
                      fontWeight: 'bold',
                      color: successData?.status === 'present' ? '#4caf50' :
                             successData?.status === 'late' ? '#ff9800' : '#f44336'
                    }
                  ]}>
                    {successData?.status?.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.successModalRow}>
                  <Icon name="clock-outline" size={20} color="#666" />
                  <Text style={styles.successModalLabel}>Time:</Text>
                  <Text style={styles.successModalValue}>{successData?.time}</Text>
                </View>
              </View>

              {/* Email Status */}
              <View style={[
                styles.emailStatusBanner,
                successData?.emailSent ? { backgroundColor: '#e8f5e9' } : 
                successData?.parentEmail ? { backgroundColor: '#fff3e0' } : { backgroundColor: '#f5f5f5' }
              ]}>
                <Icon 
                  name={
                    successData?.emailSent ? 'email-check' : 
                    successData?.parentEmail ? 'email-alert' : 'email-off'
                  } 
                  size={24} 
                  color={
                    successData?.emailSent ? '#4caf50' : 
                    successData?.parentEmail ? '#ff9800' : '#999'
                  } 
                />
                <Text style={[
                  styles.emailStatusText,
                  successData?.emailSent ? { color: '#2e7d32' } :
                  successData?.parentEmail ? { color: '#f57c00' } : { color: '#666' }
                ]}>
                  {successData?.emailSent 
                    ? 'Email sent to parent automatically!' 
                    : successData?.parentEmail 
                      ? `Failed to send email: ${successData?.emailReason || 'Unknown error'}`
                      : 'No parent email registered'}
                </Text>
              </View>

              {/* OK Button */}
              <TouchableOpacity 
                style={styles.successModalButton}
                onPress={handleSuccessModalClose}
              >
                <Text style={styles.successModalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  headerCard: { 
    backgroundColor: '#8B0000', 
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: '#fff', opacity: 0.9, marginTop: 4 },
  timeContainer: { alignItems: 'flex-end' },
  timeText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  dateText: { fontSize: 12, color: '#fff', opacity: 0.9, marginTop: 2 },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    gap: 8,
  },
  warningText: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600' },
  scannerCard: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 24, 
    alignItems: 'center', 
    margin: 16,
    flex: 1
  },
  cameraContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  camera: { flex: 1 },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#8B0000',
    borderRadius: 12,
  },
  instructions: { marginTop: 24, alignItems: 'center' },
  instructionText: { fontSize: 13, color: '#666', marginBottom: 4, textAlign: 'center' },
  boldText: { fontWeight: '600', marginTop: 8 },
  resultCard: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 24, 
    alignItems: 'center', 
    margin: 16 
  },
  successIcon: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 16 
  },
  presentIcon: { backgroundColor: '#4caf50' },
  lateIcon: { backgroundColor: '#ff9800' },
  absentIcon: { backgroundColor: '#f44336' },
  studentCard: { 
    backgroundColor: '#8B0000', 
    borderRadius: 12, 
    padding: 16, 
    width: '100%', 
    marginBottom: 16 
  },
  studentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  studentName: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  badgeContainer: { flexDirection: 'row', gap: 6, marginTop: 4 },
  statusBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  periodBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  studentStatus: { fontSize: 11, fontWeight: 'bold', color: '#fff' },
  periodText: { fontSize: 11, fontWeight: 'bold', color: '#fff' },
  studentId: { fontSize: 10, color: '#fff', opacity: 0.8, marginTop: 2 },
  studentSection: { fontSize: 11, color: '#fff', opacity: 0.9, marginTop: 2 },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  scanTimeText: { fontSize: 12, color: '#fff', opacity: 0.9 },
  autoStatusMessage: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  presentMessage: { backgroundColor: '#e8f5e9' },
  lateMessage: { backgroundColor: '#fff3e0' },
  absentMessage: { backgroundColor: '#ffebee' },
  autoStatusText: { 
    fontSize: 13, 
    fontWeight: '600',
    textAlign: 'center',
  },
  overrideLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
  },
  actionButtons: { flexDirection: 'row', gap: 8, width: '100%', marginBottom: 12 },
  actionButton: { 
    flex: 1, 
    padding: 10, 
    borderRadius: 8, 
    alignItems: 'center',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 4,
    opacity: 0.5,
  },
  activeButton: { opacity: 1, borderWidth: 2, borderColor: '#333' },
  presentButton: { backgroundColor: '#4caf50' },
  lateButton: { backgroundColor: '#ff9800' },
  absentButton: { backgroundColor: '#f44336' },
  actionButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  confirmButton: {
    width: '100%',
    backgroundColor: '#8B0000',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  confirmButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelButton: { 
    width: '100%', 
    backgroundColor: '#e0e0e0', 
    padding: 12, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  cancelButtonText: { color: '#333', fontSize: 16, fontWeight: '600' },
  disabledButton: { opacity: 0.7 },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#8B0000',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Success Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  successModalIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  successModalDetails: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  successModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  successModalLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    width: 70,
  },
  successModalValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  emailStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 10,
  },
  emailStatusText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  successModalButton: {
    backgroundColor: '#8B0000',
    paddingVertical: 14,
    paddingHorizontal: 50,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  successModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
