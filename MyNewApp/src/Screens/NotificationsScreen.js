import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAttendance } from '../context/AttendanceContext';
import { useAuth } from '../context/AuthProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

export default function NotificationsScreen({ navigation }) {
  const { attendanceLog, loadAttendanceLogs } = useAttendance();
  const { user } = useAuth();
  const [readNotifications, setReadNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  // Reload data when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadAllData();
      }
    }, [user])
  );

  // Load read notifications from storage
  useEffect(() => {
    loadReadNotifications();
  }, []);

  // Load all data
  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([loadStudents(), loadAttendanceLogs()]);
    setLoading(false);
  };

  // Load students from API (only assigned to this teacher)
  const loadStudents = async () => {
    if (!user) return;
    try {
      const response = await fetch(`https://deployed-ils-wmsu-production.up.railway.app/api/students?teacherId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();
      let rawStudents = [];
      if (result.success || result.status === 'success') {
        rawStudents = result.data || result.students || [];
      } else if (Array.isArray(result)) {
        rawStudents = result;
      }
      const studentsList = rawStudents.map(student => ({
        ...student,
        name: student.name || student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Unknown Student',
        studentId: student.studentId || student.lrn || student.id,
      }));
      setStudents(studentsList);
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  const loadReadNotifications = async () => {
    try {
      const today = getTodayDate();
      const stored = await AsyncStorage.getItem(`readNotifications_${today}`);
      if (stored) {
        setReadNotifications(JSON.parse(stored));
      } else {
        setReadNotifications([]);
      }
    } catch (error) {
      console.error('Error loading read notifications:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const today = getTodayDate();
      const updated = [...readNotifications, notificationId];
      setReadNotifications(updated);
      await AsyncStorage.setItem(`readNotifications_${today}`, JSON.stringify(updated));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const today = getTodayDate();
      const allIds = getTodayNotifications().map(n => n.id);
      setReadNotifications(allIds);
      await AsyncStorage.setItem(`readNotifications_${today}`, JSON.stringify(allIds));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    await loadReadNotifications();
    setRefreshing(false);
  };

  // Check if it's a school day (not weekend or holiday)
  const isSchoolDay = () => {
    const now = new Date();
    const day = now.getDay();
    // Saturday = 6, Sunday = 0
    if (day === 0 || day === 6) return false;
    return true;
  };

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // Get current period based on hour
  const getCurrentPeriod = () => {
    const now = new Date();
    const hour = now.getHours();
    if (hour < 12) return 'morning';
    return 'afternoon';
  };

  // Get notifications for today (absent and late students)
  const getTodayNotifications = () => {
    const today = getTodayDate();
    const notifications = [];
    const nowHour = new Date().getHours();
    const morningCutoffPassed = nowHour >= 10;   // 10:00 AM
    const afternoonCutoffPassed = nowHour >= 14;  // 2:00 PM

    // Filter today's attendance records
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

    // Add late students from attendance log
    todayLogs.forEach(log => {
      if (log.status === 'late' || log.status === 'Late') {
        const notificationId = `${log.studentId || log.student_id}_${log.period}_${today}`;
        notifications.push({
          id: notificationId,
          studentName: log.studentName || log.student_name || 'Unknown Student',
          studentLRN: log.studentLRN || log.student_lrn || log.lrn || '',
          status: 'late',
          period: log.period || 'N/A',
          time: log.time || log.timestamp || '',
          gradeLevel: log.gradeLevel || log.grade_level || '',
          section: log.section || '',
          isRead: readNotifications.includes(notificationId)
        });
      }
    });

    // Calculate absent students - students who have NO attendance record for the period
    students.forEach(student => {
      const studentId = student.studentId || student.lrn || student.id;
      
      // Check morning period
      if (morningCutoffPassed) {
        const hasMorningRecord = todayLogs.some(log => 
          (log.studentId === studentId || log.student_id === studentId) && 
          log.period === 'morning'
        );
        if (!hasMorningRecord) {
          const notificationId = `${studentId}_morning_${today}_absent`;
          notifications.push({
            id: notificationId,
            studentName: student.name || student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Unknown',
            studentLRN: student.lrn || student.studentId || '',
            status: 'absent',
            period: 'morning',
            time: '',
            gradeLevel: student.gradeLevel || student.grade_level || '',
            section: student.section || '',
            isRead: readNotifications.includes(notificationId)
          });
        }
      }

      // Check afternoon period
      if (afternoonCutoffPassed) {
        const hasAfternoonRecord = todayLogs.some(log => 
          (log.studentId === studentId || log.student_id === studentId) && 
          log.period === 'afternoon'
        );
        if (!hasAfternoonRecord) {
          const notificationId = `${studentId}_afternoon_${today}_absent`;
          notifications.push({
            id: notificationId,
            studentName: student.name || student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Unknown',
            studentLRN: student.lrn || student.studentId || '',
            status: 'absent',
            period: 'afternoon',
            time: '',
            gradeLevel: student.gradeLevel || student.grade_level || '',
            section: student.section || '',
            isRead: readNotifications.includes(notificationId)
          });
        }
      }
    });

    // Sort: unread first, then by status (absent before late), then by name
    return notifications.sort((a, b) => {
      if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
      if (a.status !== b.status) return a.status === 'absent' ? -1 : 1;
      return a.studentName.localeCompare(b.studentName);
    });
  };

  const notifications = getTodayNotifications();
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeStr;
    }
  };

  return (
    <>
      <StatusBar backgroundColor="#8B0000" barStyle="light-content" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.headerRight}>
            {isSchoolDay() && unreadCount > 0 && (
              <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
                <Icon name="check-all" size={20} color="#fff" />
                <Text style={styles.markAllText}>Mark All Read</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Date indicator */}
        <View style={styles.dateBar}>
          <Icon name={isSchoolDay() ? "calendar-today" : "calendar-remove"} size={16} color={isSchoolDay() ? "#666" : "#8B0000"} />
          <Text style={[styles.dateText, !isSchoolDay() && { color: '#8B0000' }]}>
            {isSchoolDay() ? 'Today' : 'No Class'} - {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric',
              year: 'numeric'
            })}
          </Text>
        </View>

        {/* Notifications List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B0000" />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#8B0000']}
              tintColor="#8B0000"
            />
          }
        >
          {!isSchoolDay() ? (
            <View style={styles.emptyState}>
              <Icon name="calendar-remove-outline" size={64} color="#8B0000" />
              <Text style={styles.emptyTitle}>No Class Today</Text>
              <Text style={styles.emptySubtitle}>
                It's {new Date().toLocaleDateString('en-US', { weekday: 'long' })}. Enjoy your weekend!
              </Text>
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="bell-check-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No Notifications Yet</Text>
              <Text style={styles.emptySubtitle}>
                {new Date().getHours() < 10 
                  ? 'Absent notifications will appear after 10:00 AM (morning cutoff)'
                  : new Date().getHours() < 14
                    ? 'Morning attendance complete! Afternoon absents will appear after 2:00 PM'
                    : 'All students are present! Great job!'}
              </Text>
            </View>
          ) : (
            <>
              {/* Summary Card */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Icon name="account-remove" size={24} color="#DC2626" />
                    <Text style={styles.summaryNumber}>
                      {notifications.filter(n => n.status === 'absent').length}
                    </Text>
                    <Text style={styles.summaryLabel}>Absent</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Icon name="clock-alert" size={24} color="#F59E0B" />
                    <Text style={styles.summaryNumber}>
                      {notifications.filter(n => n.status === 'late').length}
                    </Text>
                    <Text style={styles.summaryLabel}>Late</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Icon name="bell-badge" size={24} color="#8B0000" />
                    <Text style={styles.summaryNumber}>{unreadCount}</Text>
                    <Text style={styles.summaryLabel}>Unread</Text>
                  </View>
                </View>
              </View>

              {/* Notification Items */}
              {notifications.map((notification, index) => (
                <TouchableOpacity 
                  key={notification.id}
                  style={[
                    styles.notificationCard,
                    notification.isRead && styles.notificationCardRead
                  ]}
                  onPress={() => markAsRead(notification.id)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.statusIndicator,
                    notification.status === 'absent' ? styles.absentIndicator : styles.lateIndicator
                  ]} />
                  
                  <View style={styles.notificationContent}>
                    <View style={styles.notificationHeader}>
                      <Text style={[
                        styles.studentName,
                        notification.isRead && styles.textRead
                      ]}>
                        {notification.studentName}
                      </Text>
                      {!notification.isRead && (
                        <View style={styles.unreadDot} />
                      )}
                    </View>
                    
                    <View style={styles.notificationDetails}>
                      <View style={styles.detailRow}>
                        <Icon name="card-account-details" size={14} color="#666" />
                        <Text style={styles.detailText}>LRN: {notification.studentLRN || 'N/A'}</Text>
                      </View>
                      {(notification.gradeLevel || notification.section) && (
                        <View style={styles.detailRow}>
                          <Icon name="school" size={14} color="#666" />
                          <Text style={styles.detailText}>
                            {notification.gradeLevel} - {notification.section}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.notificationFooter}>
                      <View style={[
                        styles.statusBadge,
                        notification.status === 'absent' ? styles.absentBadge : styles.lateBadge
                      ]}>
                        <Icon 
                          name={notification.status === 'absent' ? 'account-remove' : 'clock-alert'} 
                          size={12} 
                          color="#fff" 
                        />
                        <Text style={styles.statusText}>
                          {notification.status.toUpperCase()}
                        </Text>
                      </View>
                      
                      <View style={styles.periodBadge}>
                        <Icon 
                          name={notification.period === 'morning' ? 'white-balance-sunny' : 'weather-sunset'} 
                          size={12} 
                          color="#666" 
                        />
                        <Text style={styles.periodText}>
                          {notification.period === 'morning' ? 'Morning' : 'Afternoon'}
                        </Text>
                      </View>

                      {notification.time && (
                        <Text style={styles.timeText}>
                          {formatTime(notification.time)}
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#8B0000',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  markAllText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
  },
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dateText: {
    color: '#666',
    fontSize: 14,
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#eee',
  },
  notificationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  notificationCardRead: {
    backgroundColor: '#f9f9f9',
    opacity: 0.8,
  },
  statusIndicator: {
    width: 4,
  },
  absentIndicator: {
    backgroundColor: '#DC2626',
  },
  lateIndicator: {
    backgroundColor: '#F59E0B',
  },
  notificationContent: {
    flex: 1,
    padding: 12,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  textRead: {
    color: '#888',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8B0000',
    marginLeft: 8,
  },
  notificationDetails: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  notificationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  absentBadge: {
    backgroundColor: '#DC2626',
  },
  lateBadge: {
    backgroundColor: '#F59E0B',
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  periodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  periodText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
  },
  timeText: {
    fontSize: 11,
    color: '#999',
    marginLeft: 'auto',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
});
