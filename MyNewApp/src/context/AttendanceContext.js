// context/AttendanceContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthProvider';

const AttendanceContext = createContext();

export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendance must be used within AttendanceProvider');
  }
  return context;
};

export function AttendanceProvider({ children }) {
  const { user } = useAuth();
  const [attendanceLog, setAttendanceLog] = useState([]);
  const [loading, setLoading] = useState(false);

  const getLocalDateString = (date = new Date()) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

  // Load attendance logs
  useEffect(() => {
    if (user) {
      loadAttendanceLogs();
    }
  }, [user]);

  // Load attendance logs from backend API
  const loadAttendanceLogs = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Create timeout promise (5 second timeout)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 5000)
      );
      
      // Don't use teacherId - just get all attendance data
      const fetchPromise = fetch(`https://deployed-ils-wmsu-production.up.railway.app/api/attendance`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);
      const result = await response.json();
      if (result.success) {
        const serverRecords = result.data || [];
        // Merge: keep optimistic (local_*) records that the server doesn't have yet,
        // so they survive a refresh until the server catches up.
        setAttendanceLog(prev => {
          const localOnly = prev.filter(l =>
            String(l.id).startsWith('local_') &&
            !serverRecords.some(s =>
              String(s.studentId) === String(l.studentId) &&
              normalizeDateString(s.date) === normalizeDateString(l.date) &&
              (() => {
                const localSubject = String(l.subject || '').trim().toLowerCase();
                if (localSubject) {
                  const serverSubject = String(s.subject || '').trim().toLowerCase();
                  const localClass = String(l.classId || '').trim();
                  const serverClass = String(s.classId || '').trim();
                  return serverSubject === localSubject && (!localClass || serverClass === localClass);
                }
                return String(s.period || '').toLowerCase() === String(l.period || '').toLowerCase();
              })()
            )
          );
          return [...serverRecords, ...localOnly];
        });
      } else {
        console.log('Attendance response not successful — keeping local records');
        // Don't clear local state when server fails
      }
    } catch (error) {
      console.error('Error loading attendance logs:', error.message);
      // Don't clear local state on error — keep optimistic records visible
    } finally {
      setLoading(false);
    }
  };

  // Record attendance using backend API
  const recordAttendance = async (studentData, classData) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setLoading(true);
      
      const attendanceData = {
        studentId: studentData.id || studentData.studentId,
        studentName: studentData.name || studentData.firstName + ' ' + studentData.lastName,
        classId: classData.id,
        className: classData.name,
        teacherId: user.id,
        teacherName: user.name,
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString(),
        status: 'present'
      };

      const response = await fetch('https://deployed-ils-wmsu-production.up.railway.app/api/attendance', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attendanceData),
      });

      const result = await response.json();
      
      if (result.success) {
        // Add to local state
        setAttendanceLog(prev => [result.data, ...prev]);
        return { success: true, data: result.data };
      } else {
        throw new Error(result.message || 'Failed to record attendance');
      }
    } catch (error) {
      console.error('Error recording attendance:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Get today's attendance
  const getTodayAttendance = () => {
    const today = getLocalDateString();
    return attendanceLog.filter(log => normalizeDateString(log.date) === today);
  };

  // Get attendance by date
  const getAttendanceByDate = (date) => {
    return attendanceLog.filter(log => log.date === date);
  };

  // Get attendance statistics
  const getAttendanceStats = () => {
    const total = attendanceLog.length;
    const today = getTodayAttendance().length;
    const thisWeek = attendanceLog.filter(log => {
      const logDate = new Date(log.date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return logDate >= weekAgo;
    }).length;

    return { total, today, thisWeek };
  };

  // Get current attendance period (morning or afternoon)
  const getAttendancePeriod = () => {
    return 'subject';
  };

  // Check attendance status based on current time
  const checkAttendanceStatus = () => {
    // Status is now determined by subject schedule windows in Scan/Home screens.
    return { status: 'present', period: 'subject' };
  };

  // Get today's attendance statistics
  const getTodayStats = () => {
    const today = getLocalDateString();

    const todayLogs = attendanceLog.filter(log => {
      // Normalize log.date - server returns YYYY-MM-DD, local adds may use other formats
      const logDate = normalizeDateString(log.date);
      return logDate === today;
    });

    const stats = {
      morning: { present: 0, late: 0, absent: 0 },
      afternoon: { present: 0, late: 0, absent: 0 },
    };

    todayLogs.forEach(log => {
      const period = (log.period || getAttendancePeriod() || '').toLowerCase();
      const status = (log.status || '').toLowerCase();
      
      if (period === 'morning') {
        if (status === 'present') stats.morning.present++;
        else if (status === 'late') stats.morning.late++;
        else stats.morning.absent++;
      } else if (period === 'afternoon') {
        if (status === 'present') stats.afternoon.present++;
        else if (status === 'late') stats.afternoon.late++;
        else stats.afternoon.absent++;
      }
    });

    return stats;
  };

  // Add manual absence
  const addManualAbsence = async (studentId, period) => {
    try {
      const attendanceData = {
        studentId,
        teacherId: user.id,
        teacherName: user.name,
        timestamp: new Date().toISOString(),
        date: getLocalDateString(),
        time: new Date().toLocaleTimeString(),
        status: 'absent',
        period: period || getAttendancePeriod()
      };

      const response = await fetch('https://deployed-ils-wmsu-production.up.railway.app/api/attendance', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attendanceData),
      });

      const result = await response.json();
      
      if (result.success) {
        setAttendanceLog(prev => [result.data, ...prev]);
        return { success: true };
      } else {
        return { success: false, error: result.message || 'Failed to add absence' };
      }
    } catch (error) {
      console.error('Error adding manual absence:', error);
      return { success: false, error: 'Failed to add absence' };
    }
  };

  // Remove absence (mark as present)
  const removeAbsence = async (studentId, period) => {
    try {
      const attendanceData = {
        studentId,
        teacherId: user.id,
        teacherName: user.name,
        timestamp: new Date().toISOString(),
        date: getLocalDateString(),
        time: new Date().toLocaleTimeString(),
        status: 'present',
        period: period || getAttendancePeriod()
      };

      const response = await fetch('https://deployed-ils-wmsu-production.up.railway.app/api/attendance', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attendanceData),
      });

      const result = await response.json();
      
      if (result.success) {
        setAttendanceLog(prev => [result.data, ...prev]);
        return { success: true };
      } else {
        return { success: false, error: result.message || 'Failed to remove absence' };
      }
    } catch (error) {
      console.error('Error removing absence:', error);
      return { success: false, error: 'Failed to remove absence' };
    }
  };

  // Add attendance record (alias for recordAttendance for compatibility)
  const addAttendance = async (studentId, period, status, metadata = {}) => {
    if (!user) return { success: false, error: 'User not logged in' };

    const now = new Date();
    const dateStr = getLocalDateString(now);
    const timeStr = now.toLocaleTimeString();
    const currentStatus = status || 'present';
    const currentPeriod = period || getAttendancePeriod();
    const subjectValue = metadata.subject ? String(metadata.subject).trim() : null;
    const classIdValue = metadata.classId ? String(metadata.classId).trim() : null;

    // Optimistic update: add to local state immediately so UI shows right away
    const optimisticRecord = {
      id: 'local_' + Date.now(),
      studentId,
      studentName: metadata.studentName || '',
      gradeLevel: metadata.gradeLevel || '',
      section: metadata.section || '',
      date: dateStr,
      time: timeStr,
      status: currentStatus,
      period: currentPeriod,
      classId: classIdValue,
      subject: subjectValue,
      scheduleDay: metadata.scheduleDay || null,
      scheduleStartTime: metadata.scheduleStartTime || null,
      scheduleEndTime: metadata.scheduleEndTime || null,
      autoMarked: metadata.autoMarked ? 1 : 0,
      teacherId: user.id,
      teacherName: user.name,
    };
    setAttendanceLog(prev => {
      // Remove any existing record for same student+date+scope before adding.
      const filtered = prev.filter(l => {
        const sameStudent = String(l.studentId) === String(studentId);
        const sameDate = String(l.date) === dateStr;
        if (!sameStudent || !sameDate) return true;

        const existingSubject = String(l.subject || '').trim().toLowerCase();
        const incomingSubject = String(subjectValue || '').trim().toLowerCase();
        const existingClassId = String(l.classId || '').trim();

        if (incomingSubject) {
          const sameSubject = existingSubject === incomingSubject;
          const sameClass = classIdValue ? existingClassId === classIdValue : true;
          return !(sameSubject && sameClass);
        }

        return String(l.period || '').toLowerCase() !== String(currentPeriod || '').toLowerCase();
      });
      return [optimisticRecord, ...filtered];
    });

    try {
      const attendanceData = {
        studentId,
        teacherId: user.id,
        teacherName: user.name,
        timestamp: now.toISOString(),
        date: dateStr,
        time: timeStr,
        status: currentStatus,
        period: currentPeriod,
        classId: classIdValue,
        subject: subjectValue,
        scheduleDay: metadata.scheduleDay || null,
        scheduleStartTime: metadata.scheduleStartTime || null,
        scheduleEndTime: metadata.scheduleEndTime || null,
        autoMarked: metadata.autoMarked ? 1 : 0
      };

      const response = await fetch('https://deployed-ils-wmsu-production.up.railway.app/api/attendance', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attendanceData),
      });

      const result = await response.json();
      
      if (result.success) {
        // Replace optimistic record with real server record
        setAttendanceLog(prev => {
          const filtered = prev.filter(l => l.id !== optimisticRecord.id);
          return [result.data, ...filtered];
        });
        return { success: true };
      } else {
        console.warn('Server attendance save failed:', result.message);
        // Remove optimistic record so UI only shows DB-saved data.
        setAttendanceLog(prev => prev.filter(l => l.id !== optimisticRecord.id));
        return { success: false, error: result.message || 'Failed to record attendance' };
      }
    } catch (error) {
      console.error('Error adding attendance:', error);
      // Remove optimistic record on network/server failure.
      setAttendanceLog(prev => prev.filter(l => l.id !== optimisticRecord.id));
      return { success: false, error: 'Failed to record attendance' };
    }
  };

  const value = {
    attendanceLog,
    loading,
    recordAttendance,
    loadAttendanceLogs,
    getTodayAttendance,
    getAttendanceByDate,
    getAttendanceStats,
    getAttendancePeriod,
    checkAttendanceStatus,
    getTodayStats,
    addManualAbsence,
    removeAbsence,
    addAttendance,
  };

  return (
    <AttendanceContext.Provider value={value}>
      {children}
    </AttendanceContext.Provider>
  );
}
