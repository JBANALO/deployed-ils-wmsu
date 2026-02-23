import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAttendance } from '../context/AttendanceContext';
import { useAuth } from '../context/AuthProvider'; 
import { useFocusEffect } from '@react-navigation/native';

export default function LogScreen() {
  const [students, setStudents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState('all'); 
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { attendanceLog, getTodayStats } = useAttendance();
  const { user } = useAuth();

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
    return selectedDate.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getFilteredLogs = () => {
    const dateString = getTodayString();
    let logs = attendanceLog.filter(log => log.date === dateString);
    
    if (selectedPeriod !== 'all') {
      logs = logs.filter(log => log.period === selectedPeriod);
    }
    
    return logs;
  };

  const getLogsBySection = () => {
    const logs = getFilteredLogs();
    const grouped = {};

    students.forEach(student => {
      const section = student.section || 'No Section';
      if (!grouped[section]) {
        grouped[section] = {
          students: [],
          morning: { present: 0, late: 0, absent: 0 },
          afternoon: { present: 0, late: 0, absent: 0 },
        };
      }

      const morningLog = logs.find(log => 
        log.studentId === student.studentId && log.period === 'morning'
      );
      const afternoonLog = logs.find(log => 
        log.studentId === student.studentId && log.period === 'afternoon'
      );

      if (selectedPeriod === 'all' || selectedPeriod === 'morning') {
        if (morningLog) {
          if (morningLog.status === 'present') grouped[section].morning.present++;
          else if (morningLog.status === 'late') grouped[section].morning.late++;
          else grouped[section].morning.absent++;
        } else {
          grouped[section].morning.absent++;
        }
      }

      if (selectedPeriod === 'all' || selectedPeriod === 'afternoon') {
        if (afternoonLog) {
          if (afternoonLog.status === 'present') grouped[section].afternoon.present++;
          else if (afternoonLog.status === 'late') grouped[section].afternoon.late++;
          else grouped[section].afternoon.absent++;
        } else {
          grouped[section].afternoon.absent++;
        }
      }

      grouped[section].students.push({
        ...student,
        morningLog,
        afternoonLog,
      });
    });

    return grouped;
  };

  const logsBySection = getLogsBySection();
  const stats = getTodayStats();

  const getStatusDisplay = (log) => {
    if (!log) return { text: 'Absent', color: '#f44336' };
    
    switch (log.status) {
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
            style={[styles.filterButton, selectedPeriod === 'all' && styles.filterButtonActive]}
            onPress={() => setSelectedPeriod('all')}
          >
            <Text style={[styles.filterText, selectedPeriod === 'all' && styles.filterTextActive]}>
              All Day
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, selectedPeriod === 'morning' && styles.filterButtonActive]}
            onPress={() => setSelectedPeriod('morning')}
          >
            <Text style={[styles.filterText, selectedPeriod === 'morning' && styles.filterTextActive]}>
              Morning
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, selectedPeriod === 'afternoon' && styles.filterButtonActive]}
            onPress={() => setSelectedPeriod('afternoon')}
          >
            <Text style={[styles.filterText, selectedPeriod === 'afternoon' && styles.filterTextActive]}>
              Afternoon
            </Text>
          </TouchableOpacity>
        </View>

        {selectedPeriod === 'all' ? (
          <View style={styles.statsRow}>
            <View style={styles.periodStats}>
              <Text style={styles.periodLabel}>Morning</Text>
              <View style={styles.miniStats}>
                <Text style={styles.miniStatText}>P: {stats.morning.present}</Text>
                <Text style={styles.miniStatText}>L: {stats.morning.late}</Text>
                <Text style={styles.miniStatText}>A: {stats.morning.absent}</Text>
              </View>
            </View>
            <View style={styles.periodStats}>
              <Text style={styles.periodLabel}>Afternoon</Text>
              <View style={styles.miniStats}>
                <Text style={styles.miniStatText}>P: {stats.afternoon.present}</Text>
                <Text style={styles.miniStatText}>L: {stats.afternoon.late}</Text>
                <Text style={styles.miniStatText}>A: {stats.afternoon.absent}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.singlePeriodStats}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {selectedPeriod === 'morning' ? stats.morning.present : stats.afternoon.present}
              </Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {selectedPeriod === 'morning' ? stats.morning.late : stats.afternoon.late}
              </Text>
              <Text style={styles.statLabel}>Late</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {selectedPeriod === 'morning' ? stats.morning.absent : stats.afternoon.absent}
              </Text>
              <Text style={styles.statLabel}>Absent</Text>
            </View>
          </View>
        )}

        <ScrollView style={styles.scrollView} key={refreshKey}>
          {loading ? (
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

                    {selectedPeriod === 'all' ? (
                      <View style={styles.sectionStatsRow}>
                        <View style={styles.sectionStatItem}>
                          <Text style={styles.sectionStatLabel}>Morning:</Text>
                          <Text style={styles.sectionStatValue}>
                            P:{section.morning.present} L:{section.morning.late} A:{section.morning.absent}
                          </Text>
                        </View>
                        <View style={styles.sectionStatItem}>
                          <Text style={styles.sectionStatLabel}>Afternoon:</Text>
                          <Text style={styles.sectionStatValue}>
                            P:{section.afternoon.present} L:{section.afternoon.late} A:{section.afternoon.absent}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.sectionStatsRow}>
                        <Text style={styles.sectionStatValue}>
                          Present: {selectedPeriod === 'morning' ? section.morning.present : section.afternoon.present} | 
                          Late: {selectedPeriod === 'morning' ? section.morning.late : section.afternoon.late} | 
                          Absent: {selectedPeriod === 'morning' ? section.morning.absent : section.afternoon.absent}
                        </Text>
                      </View>
                    )}

                    {section.students.map((student, index) => (
                      <View key={student.id} style={styles.studentRow}>
                        <View style={styles.studentInfo}>
                          <Text style={styles.studentName}>{student.name}</Text>
                          <Text style={styles.studentId}>{student.studentId}</Text>
                        </View>

                        {selectedPeriod === 'all' ? (
                          <View style={styles.attendanceMinimal}>
                            <View style={styles.periodColumn}>
                              <Text style={styles.periodColumnLabel}>AM</Text>
                              {(() => {
                                const status = getStatusDisplay(student.morningLog);
                                return (
                                  <View style={styles.statusMinimal}>
                                    <Text style={[styles.statusText, { color: status.color }]}>
                                      {status.text}
                                    </Text>
                                    {student.morningLog?.scanTime && (
                                      <Text style={styles.timeText}>{student.morningLog.scanTime}</Text>
                                    )}
                                  </View>
                                );
                              })()}
                            </View>
                            <View style={styles.periodColumn}>
                              <Text style={styles.periodColumnLabel}>PM</Text>
                              {(() => {
                                const status = getStatusDisplay(student.afternoonLog);
                                return (
                                  <View style={styles.statusMinimal}>
                                    <Text style={[styles.statusText, { color: status.color }]}>
                                      {status.text}
                                    </Text>
                                    {student.afternoonLog?.scanTime && (
                                      <Text style={styles.timeText}>{student.afternoonLog.scanTime}</Text>
                                    )}
                                  </View>
                                );
                              })()}
                            </View>
                          </View>
                        ) : (
                          <View style={styles.singlePeriodDisplay}>
                            {(() => {
                              const log = selectedPeriod === 'morning' ? student.morningLog : student.afternoonLog;
                              const status = getStatusDisplay(log);
                              return (
                                <View style={styles.statusMinimal}>
                                  <Text style={[styles.statusText, { color: status.color, fontWeight: '600' }]}>
                                    {status.text}
                                  </Text>
                                  {log?.scanTime && (
                                    <Text style={styles.timeText}>{log.scanTime}</Text>
                                  )}
                                </View>
                              );
                            })()}
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                );
              })}
            </>
          )}

          <View style={{ height: 80 }} />
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
