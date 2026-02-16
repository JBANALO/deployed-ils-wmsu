// API service for connecting to backend
// Connected to Railway backend
const API_BASE_URL = 'https://deployed-ils-wmsu-production.up.railway.app/api';
const TIMEOUT = 10000; // 10 seconds timeout

const fetchWithTimeout = (url, options = {}, timeout = TIMEOUT) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Network request timed out')), timeout)
    )
  ]);
};

export const attendanceAPI = {
  // Record attendance via QR scan
  recordAttendance: async (studentId, qrData, location = 'Mobile App') => {
    try {
      console.log('Recording attendance for student:', studentId);
      console.log('API URL:', API_BASE_URL);
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId,
          qrData,
          location,
          deviceInfo: {
            platform: 'react-native',
            timestamp: new Date().toISOString()
          }
        }),
      });
      
      const result = await response.json();
      console.log('Attendance API response:', result);
      return result;
    } catch (error) {
      console.error('Error recording attendance:', error);
      throw error;
    }
  },

  // Get all students
  getStudents: async () => {
    try {
      console.log('Fetching students from API...');
      console.log('API URL:', API_BASE_URL);
      const response = await fetchWithTimeout(`${API_BASE_URL}/students`);
      const result = await response.json();
      console.log('Students API response:', result);
      return result.data || result; // Handle both response formats
    } catch (error) {
      console.error('Error fetching students:', error);
      console.error('API Base URL:', API_BASE_URL);
      throw error;
    }
  },

  // Get today's attendance
  getTodayAttendance: async () => {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/attendance/today`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching attendance:', error);
      console.error('API Base URL:', API_BASE_URL);
      throw error;
    }
  },

  // Get student by ID
  getStudentById: async (studentId) => {
    try {
      const students = await attendanceAPI.getStudents();
      return students.find(student => student.id === studentId);
    } catch (error) {
      console.error('Error fetching student by ID:', error);
      throw error;
    }
  },

  // Test connection to backend
  testConnection: async () => {
    try {
      console.log('Testing connection to:', API_BASE_URL);
      const response = await fetchWithTimeout(`${API_BASE_URL}/students`, {}, 5000);
      const isConnected = response.ok;
      console.log('Connection test result:', isConnected);
      console.log('Response status:', response.status);
      return isConnected;
    } catch (error) {
      console.error('Connection test failed:', error);
      console.error('API Base URL:', API_BASE_URL);
      return false;
    }
  }
};

export default attendanceAPI;