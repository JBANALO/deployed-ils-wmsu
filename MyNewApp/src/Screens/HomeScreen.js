import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, StatusBar, Modal, ActivityIndicator, Linking, TextInput } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAttendance } from '../context/AttendanceContext';
import { useAuth } from '../context/AuthProvider';
import { useFocusEffect } from '@react-navigation/native';

export default function HomeScreen() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedSection, setSelectedSection] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [pendingEmailData, setPendingEmailData] = useState(null);
  const { attendanceLog, getTodayStats, addManualAbsence, removeAbsence, getAttendancePeriod, recordAttendance } = useAttendance();
  const { user, userData, loading: authLoading } = useAuth();
  
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

  const holidays = [
    '1/1/2025',   
    '4/9/2025',   
    '4/17/2025',  
    '4/18/2025',  
    '5/1/2025',   
    '6/12/2025', 
    '8/25/2025',  
    '11/1/2025',  
    '11/30/2025', 
    '12/25/2025', 
    '12/30/2025', 
  ];

  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadStudents();
        setRefreshKey(prev => prev + 1);
      }
    }, [user])
  );

  const loadStudents = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Load students from backend API
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

  const isSchoolDay = () => {
    const day = currentTime.getDay();
    const dateString = currentTime.toLocaleDateString('en-US');
    
    if (day === 0 || day === 6) return false;
    if (holidays.includes(dateString)) return false;
    
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
    const today = new Date().toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    });

    const todayLogs = attendanceLog.filter(log => log.date === today);
    
    const studentsWithAttendance = studentsList.map(student => {
      const morningLog = todayLogs.find(log => 
        log.studentId === student.studentId && log.period === 'morning'
      );
      const afternoonLog = todayLogs.find(log => 
        log.studentId === student.studentId && log.period === 'afternoon'
      );
      
      return {
        ...student,
        morningLog,
        afternoonLog,
      };
    });

    const morningPresent = studentsWithAttendance.filter(s => s.morningLog?.status === 'present').length;
    const morningLate = studentsWithAttendance.filter(s => s.morningLog?.status === 'late').length;
    const morningAbsent = studentsWithAttendance.filter(s => !s.morningLog || s.morningLog?.status === 'absent').length;
    
    const afternoonPresent = studentsWithAttendance.filter(s => s.afternoonLog?.status === 'present').length;
    const afternoonLate = studentsWithAttendance.filter(s => s.afternoonLog?.status === 'late').length;
    const afternoonAbsent = studentsWithAttendance.filter(s => !s.afternoonLog || s.afternoonLog?.status === 'absent').length;

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

  const stats = getTodayStats();
  const sections = getStudentsBySection();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleSectionPress = (sectionName, studentsList) => {
    const attendance = getSectionAttendance(sectionName, studentsList);
    setSelectedSection({ name: sectionName, ...attendance });
    setModalVisible(true);
  };

  const handleNotificationPress = () => {
    Alert.alert('Notifications', 'You have 3 new notifications');
  };

  const currentPeriod = getAttendancePeriod();

  if (authLoading || !user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#8B0000" />
        <Text style={{ marginTop: 16, color: '#666' }}>
          {authLoading ? 'Loading...' : 'Please log in'}
        </Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar backgroundColor="#8B0000" barStyle="light-content" />
      <ScrollView style={styles.container} key={refreshKey}>
        <View style={styles.welcomeCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeText}>Welcome, {teacher.name}!</Text>
            <Text style={styles.departmentText}>{teacher.department}</Text>
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
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>3</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.timeText}>
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <View style={styles.periodBadge}>
              <Icon 
                name={currentPeriod === 'morning' ? 'white-balance-sunny' : 'weather-sunset'} 
                size={14} 
                color="#fff" 
              />
              <Text style={styles.periodText}>
                {currentPeriod === 'morning' ? 'Morning' : 'Afternoon'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Today's Attendance</Text>

          <View style={styles.periodCard}>
            <View style={styles.periodHeader}>
              <Text style={styles.periodTitle}>Morning Session</Text>
              <Icon name="white-balance-sunny" size={24} color="#FFA500" />
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.morning.present}</Text>
                <Text style={styles.statLabel}>Present</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.morning.late}</Text>
                <Text style={styles.statLabel}>Late</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.morning.absent}</Text>
                <Text style={styles.statLabel}>Absent</Text>
              </View>
            </View>
          </View>

          <View style={styles.periodCard}>
            <View style={styles.periodHeader}>
              <Text style={styles.periodTitle}>Afternoon Session</Text>
              <Icon name="weather-sunset" size={24} color="#FF6B35" />
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.afternoon.present}</Text>
                <Text style={styles.statLabel}>Present</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.afternoon.late}</Text>
                <Text style={styles.statLabel}>Late</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.afternoon.absent}</Text>
                <Text style={styles.statLabel}>Absent</Text>
              </View>
            </View>
          </View>
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
              const attendance = getSectionAttendance(sectionName, studentsList);
              
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
                  
                  <View style={styles.sectionStats}>
                    <View style={styles.periodStat}>
                      <Text style={styles.periodStatLabel}>Morning</Text>
                      <View style={styles.periodStatRight}>
                        <Text style={styles.periodStatValue}>
                          P:{attendance.stats.morning.present} L:{attendance.stats.morning.late} A:{attendance.stats.morning.absent}
                        </Text>
                        <Icon name="white-balance-sunny" size={18} color="#FFA500" />
                      </View>
                    </View>
                    <View style={styles.periodStat}>
                      <Text style={styles.periodStatLabel}>Afternoon</Text>
                      <View style={styles.periodStatRight}>
                        <Text style={styles.periodStatValue}>
                          P:{attendance.stats.afternoon.present} L:{attendance.stats.afternoon.late} A:{attendance.stats.afternoon.absent}
                        </Text>
                        <Icon name="weather-sunset" size={18} color="#FF6B35" />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={{ height: 80 }} />
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
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>{selectedSection.name}</Text>
                    <Text style={styles.modalSubtitle}>
                      {selectedSection.stats.total} students
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
                    const morningStatus = student.morningLog?.status || 'absent';
                    const afternoonStatus = student.afternoonLog?.status || 'absent';
                    
                    const getStatusColor = (status) => {
                      switch(status) {
                        case 'present': return '#4caf50';
                        case 'late': return '#ff9800';
                        case 'absent': return '#f44336';
                        default: return '#999';
                      }
                    };

                    const getStatusText = (status) => {
                      switch(status) {
                        case 'present': return 'Present';
                        case 'late': return 'Late';
                        case 'absent': return 'Absent';
                        default: return 'N/A';
                      }
                    };

                    return (
                      <View key={index} style={styles.studentRow}>
                        <View style={styles.studentInfo}>
                          <Text style={styles.studentName}>{student.name}</Text>
                          <Text style={styles.studentId}>{student.studentId}</Text>
                        </View>
                        
                        <View style={styles.attendanceDisplay}>
                          <TouchableOpacity 
                            style={styles.periodAttendance}
                            onPress={() => toggleAttendance(student, 'morning')}
                            onLongPress={() => sendEmailToParent(student, 'morning')}
                          >
                            <Text style={styles.periodLabel}>AM</Text>
                            <Text style={[styles.statusText, { color: getStatusColor(morningStatus) }]}>
                              {getStatusText(morningStatus)}
                            </Text>
                            {student.morningLog?.scanTime && (
                              <Text style={styles.timeTextSmall}>{student.morningLog.scanTime}</Text>
                            )}
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                            style={styles.periodAttendance}
                            onPress={() => toggleAttendance(student, 'afternoon')}
                            onLongPress={() => sendEmailToParent(student, 'afternoon')}
                          >
                            <Text style={styles.periodLabel}>PM</Text>
                            <Text style={[styles.statusText, { color: getStatusColor(afternoonStatus) }]}>
                              {getStatusText(afternoonStatus)}
                            </Text>
                            {student.afternoonLog?.scanTime && (
                              <Text style={styles.timeTextSmall}>{student.afternoonLog.scanTime}</Text>
                            )}
                          </TouchableOpacity>
                        </View>

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
                          <Icon name="email-outline" size={20} color="#8B0000" />
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
    maxHeight: '80%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  modalSubtitle: { fontSize: 14, color: '#666', marginTop: 4 },
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
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '600', color: '#333' },
  studentId: { fontSize: 12, color: '#8B0000', marginTop: 2 },
  attendanceDisplay: { flexDirection: 'row', gap: 16 },
  periodAttendance: { alignItems: 'center', minWidth: 70 },
  periodLabel: { fontSize: 11, fontWeight: 'bold', color: '#666', marginBottom: 4 },
  statusText: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  timeTextSmall: { fontSize: 10, color: '#666', marginTop: 2 },
  emailButton: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
