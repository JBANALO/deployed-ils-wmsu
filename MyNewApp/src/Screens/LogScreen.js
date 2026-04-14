import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAttendance } from '../context/AttendanceContext';
import { useAuth } from '../context/AuthProvider'; 
import { useFocusEffect } from '@react-navigation/native';
import { authAPI } from '../services/api';

export default function LogScreen() {
  const [students, setStudents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSubject, setSelectedSubject] = useState('all'); 
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [noClassDates, setNoClassDates] = useState([]);
  const { attendanceLog, loadAttendanceLogs } = useAttendance();
  const { user } = useAuth();

  const toIsoDate = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const normalizeDateString = (value) => {
    if (!value) return '';
    const raw = String(value);
    if (raw.includes('/')) {
      const parts = raw.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      }
    }
    if (raw.includes('T')) return raw.split('T')[0];
    return raw;
  };

  // Check if selected date is a school day (not weekend)
  const isSchoolDay = (date) => {
    const day = date.getDay();
    if (day === 0 || day === 6) return false;
    const isoDate = toIsoDate(date);
    if (noClassDates.includes(isoDate)) return false;
    return true;
  };

  const loadNoClassDays = async () => {
    if (!user) return;
    try {
      const activeSyRes = await authAPI.getActiveSchoolYear(user?.token);
      const activeSy = activeSyRes?.data || activeSyRes?.schoolYear || activeSyRes || null;
      const calendarRes = await authAPI.getNoClassDays(user?.token, activeSy?.id || undefined);
      const rows = Array.isArray(calendarRes?.data) ? calendarRes.data : [];
      setNoClassDates(rows.map((row) => String(row.no_class_date || '').split('T')[0]).filter(Boolean));
    } catch (error) {
      console.error('Error loading no-class dates in logs:', error);
      setNoClassDates([]);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        // Reset to today's date when screen is focused
        setSelectedDate(new Date());
        loadStudents();
        loadAttendanceLogs();
        loadNoClassDays();
        setRefreshKey(prev => prev + 1);
      }
    }, [user])
  );

  // Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    setSelectedDate(new Date()); // Reset to today
    await Promise.all([loadStudents(), loadAttendanceLogs(), loadNoClassDays()]);
    setRefreshKey(prev => prev + 1);
    setRefreshing(false);
  };

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
      
      // Handle both wrapped response and direct array
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
        qrCode: student.qrCode || student.qr_code
      }));
      setStudents(studentsList);
    } catch (error) {
      console.error('Error loading students:', error);
      Alert.alert('Error', `Failed to load students: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getTodayString = () => {
    // Return ISO format (YYYY-MM-DD) to match server response
    const d = selectedDate;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getFilteredLogs = () => {
    const dateString = getTodayString();
    let logs = attendanceLog.filter(log => {
      return normalizeDateString(log.date) === dateString;
    });

    if (selectedSubject !== 'all') {
      logs = logs.filter(log => String(log.subject || '').trim() === selectedSubject);
    }

    return logs;
  };

  const getAvailableSubjects = () => {
    const dateString = getTodayString();
    const set = new Set();
    attendanceLog.forEach(log => {
      const logDate = normalizeDateString(log.date);
      if (logDate !== dateString) return;
      const subject = String(log.subject || '').trim();
      if (subject) set.add(subject);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  };

  const getLogsBySection = () => {
    const logs = getFilteredLogs();
    const grouped = {};

    students.forEach(student => {
      const section = student.section || 'No Section';
      if (!grouped[section]) {
        grouped[section] = {
          students: [],
          stats: { present: 0, late: 0, absent: 0 },
        };
      }

      // Match by any known student identifier so records survive refreshes.
      const candidateIds = new Set(
        [student.studentId, student.lrn, student.id]
          .filter(Boolean)
          .map(v => String(v))
      );
      
      const studentLogs = logs
        .filter(log => candidateIds.has(String(log.studentId)))
        .sort((a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0));

      const subjectLog = studentLogs[0] || null;
      const status = String(subjectLog?.status || '').toLowerCase();
      if (status === 'present') grouped[section].stats.present++;
      else if (status === 'late') grouped[section].stats.late++;
      else if (status === 'absent') grouped[section].stats.absent++;

      grouped[section].students.push({
        ...student,
        subjectLog,
      });
    });

    return grouped;
  };

  const logsBySection = getLogsBySection();
  const allStats = Object.values(logsBySection).reduce(
    (acc, section) => {
      acc.present += section.stats.present;
      acc.late += section.stats.late;
      acc.absent += section.stats.absent;
      return acc;
    },
    { present: 0, late: 0, absent: 0 }
  );
  const availableSubjects = getAvailableSubjects();

  const getStatusDisplay = (log) => {
    if (!log) return { text: 'Absent', color: '#f44336' };
    
    const status = (log.status || '').toLowerCase();
    switch (status) {
      case 'present':
        return { text: 'Present', color: '#4caf50' };
      case 'late':
        return { text: 'Late', color: '#ff9800' };
      case 'absent':
        return { text: 'Absent', color: '#f44336' };
      default:
        return { text: 'Unknown', color: '#999' };
    }
  };

  if (!user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#8B0000" />
        <Text style={{ marginTop: 16, color: '#666' }}>Loading...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar backgroundColor="#8B0000" barStyle="light-content" />
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Attendance Log</Text>
            <Text style={styles.headerSubtitle}>
              {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric',
                year: 'numeric'
              })}
            </Text>
          </View>
        </View>

        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, selectedSubject === 'all' && styles.filterButtonActive]}
            onPress={() => setSelectedSubject('all')}
          >
            <Text style={[styles.filterText, selectedSubject === 'all' && styles.filterTextActive]}>
              All Subjects
            </Text>
          </TouchableOpacity>
          {availableSubjects.slice(0, 2).map(subject => (
            <TouchableOpacity
              key={subject}
              style={[styles.filterButton, selectedSubject === subject && styles.filterButtonActive]}
              onPress={() => setSelectedSubject(subject)}
            >
              <Text style={[styles.filterText, selectedSubject === subject && styles.filterTextActive]} numberOfLines={1}>
                {subject}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.singlePeriodStats}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{allStats.present}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{allStats.late}</Text>
            <Text style={styles.statLabel}>Late</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{allStats.absent}</Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
        </View>

        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={{ paddingBottom: 120 }} 
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
          {!isSchoolDay(selectedDate) ? (
            <View style={styles.emptyContainer}>
              <Icon name="calendar-remove-outline" size={64} color="#8B0000" />
              <Text style={[styles.emptyText, { color: '#8B0000' }]}>No Class Today</Text>
              <Text style={styles.emptySubText}>
                It's {selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}. Enjoy your weekend!
              </Text>
            </View>
          ) : loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B0000" />
              <Text style={styles.loadingText}>Loading logs...</Text>
            </View>
          ) : Object.keys(logsBySection).length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="clipboard-text-off" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No students found</Text>
              <Text style={styles.emptySubText}>Add students in the Generate screen</Text>
            </View>
          ) : (
            <>
              {Object.keys(logsBySection).sort().map((sectionName) => {
                const section = logsBySection[sectionName];
                return (
                  <View key={sectionName} style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>{sectionName}</Text>
                      <Text style={styles.sectionCount}>
                        {section.students.length} students
                      </Text>
                    </View>

                    <View style={styles.sectionStatsRow}>
                      <Text style={styles.sectionStatValue}>
                        Present: {section.stats.present} | Late: {section.stats.late} | Absent: {section.stats.absent}
                      </Text>
                    </View>

                    {section.students
                      .filter(student => Boolean(student.subjectLog))
                      .map((student, index) => (
                      <View key={student.id} style={styles.studentRow}>
                        <View style={styles.studentInfo}>
                          <Text style={styles.studentName}>{student.name}</Text>
                          <Text style={styles.studentId}>{student.studentId}</Text>
                        </View>

                        <View style={styles.singlePeriodDisplay}>
                          {(() => {
                            const log = student.subjectLog;
                            const status = getStatusDisplay(log);
                            return (
                              <View style={styles.statusMinimal}>
                                <Text style={[styles.statusText, { color: status.color, fontWeight: '600' }]}>
                                  {status.text}
                                </Text>
                                <Text style={styles.timeText}>{String(log?.subject || 'Subject')}</Text>
                                {log?.scanTime && (
                                  <Text style={styles.timeText}>{log.scanTime}</Text>
                                )}
                              </View>
                            );
                          })()}
                        </View>
                      </View>
                    ))}

                    {section.students.filter(student => Boolean(student.subjectLog)).length === 0 && (
                      <Text style={{ textAlign: 'center', color: '#999', padding: 16 }}>No attendance records yet</Text>
                    )}
                  </View>
                );
              })}
            </>
          )}

        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    backgroundColor: '#8B0000',
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: '#fff', opacity: 0.9, marginTop: 4 },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#8B0000',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  periodStats: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  periodLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  miniStats: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-around',
  },
  miniStatText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  singlePeriodStats: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B0000',
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#8B0000',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B0000',
  },
  sectionCount: {
    fontSize: 13,
    color: '#666',
  },
  sectionStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionStatItem: {
    flex: 1,
  },
  sectionStatLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  sectionStatValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  studentId: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  attendanceMinimal: {
    flexDirection: 'row',
    gap: 20,
  },
  periodColumn: {
    alignItems: 'center',
    minWidth: 70,
  },
  periodColumnLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  statusMinimal: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  singlePeriodDisplay: {
    minWidth: 80,
    alignItems: 'flex-end',
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubText: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
});
