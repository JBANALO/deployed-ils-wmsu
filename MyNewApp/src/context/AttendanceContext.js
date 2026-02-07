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

  // Load attendance logs
  useEffect(() => {
    // Disabled automatic loading to prevent app blocking
    // if (user) {
    //   loadAttendanceLogs();
    // }
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
      const fetchPromise = fetch(`http://192.168.0.153:5000/api/attendance`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);
      const result = await response.json();
      if (result.success) {
        setAttendanceLog(result.data || []);
      } else {
        console.log('Attendance response not successful:', result);
      }
    } catch (error) {
      console.error('Error loading attendance logs:', error.message);
      // Don't block the UI - just log the error silently
      setAttendanceLog([]);
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

      const response = await fetch('http://192.168.0.153:5000/api/attendance', {
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
    const today = new Date().toISOString().split('T')[0];
    return attendanceLog.filter(log => log.date === today);
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
    const now = new Date();
    const hours = now.getHours();
    
    // Morning: 6:00 AM - 12:00 PM
    // Afternoon: 12:00 PM - 6:00 PM
    if (hours >= 6 && hours < 12) {
      return 'morning';
    } else {
      return 'afternoon';
    }
  };

  // Check attendance status based on current time
  const checkAttendanceStatus = () => {
    const now = new Date();
    const hours = now.getHours();
    
    // Morning session (Before 12 PM)
    if (hours < 12) {
      if (hours < 8) {
        // Before 8 AM - Present
        return { status: 'present', period: 'morning' };
      } else if (hours < 10) {
        // 8 AM - 9:59 AM - Late
        return { status: 'late', period: 'morning' };
      } else {
        // After 10 AM - Absent
        return { status: 'absent', period: 'morning' };
      }
    } 
    // Afternoon session (After 12 PM)
    else {
      if (hours < 14) {
        // Before 2 PM - Present
        return { status: 'present', period: 'afternoon' };
      } else if (hours < 15) {
        // 2 PM - 2:59 PM - Late
        return { status: 'late', period: 'afternoon' };
      } else {
        // After 3 PM - Absent
        return { status: 'absent', period: 'afternoon' };
      }
    }
  };

  // Get today's attendance statistics
  const getTodayStats = () => {
    const today = new Date().toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    });

    const todayLogs = attendanceLog.filter(log => log.date === today);

    const stats = {
      morning: { present: 0, late: 0, absent: 0 },
      afternoon: { present: 0, late: 0, absent: 0 },
    };

    todayLogs.forEach(log => {
      const period = log.period || getAttendancePeriod();
      if (period === 'morning') {
        if (log.status === 'present') stats.morning.present++;
        else if (log.status === 'late') stats.morning.late++;
        else stats.morning.absent++;
      } else if (period === 'afternoon') {
        if (log.status === 'present') stats.afternoon.present++;
        else if (log.status === 'late') stats.afternoon.late++;
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
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString(),
        status: 'absent',
        period: period || getAttendancePeriod()
      };

      const response = await fetch('http://192.168.0.153:5000/api/attendance', {
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
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString(),
        status: 'present',
        period: period || getAttendancePeriod()
      };

      const response = await fetch('http://192.168.0.153:5000/api/attendance', {
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
  const addAttendance = async (studentId, period, status) => {
    if (!user) return { success: false, error: 'User not logged in' };

    try {
      const now = new Date();
      const attendanceData = {
        studentId,
        teacherId: user.id,
        teacherName: user.name,
        timestamp: now.toISOString(),
        date: now.toISOString().split('T')[0],
        time: now.toLocaleTimeString(),
        status: status || 'present',
        period: period || getAttendancePeriod()
      };

      const response = await fetch('http://192.168.0.153:5000/api/attendance', {
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
        return { success: false, error: result.message || 'Failed to record attendance' };
      }
    } catch (error) {
      console.error('Error adding attendance:', error);
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
