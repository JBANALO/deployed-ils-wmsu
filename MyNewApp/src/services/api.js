// API service for connecting to backend
// Supports both development and production environments

// Development: http://192.168.x.x:3001/api (local machine IP)
// Production: https://deployed-ils-wmsu-production.up.railway.app/api

// For development, replace with your machine's local IP:
// Get IP on Windows: ipconfig (look for IPv4 Address)
// Ensure backend is running on port 3001

// Configuration can be changed here:
const API_BASE_URL = 'https://deployed-ils-wmsu-production.up.railway.app/api'; // Railway production backend
// For local development, uncomment and set to your machine IP:
// const API_BASE_URL = 'http://192.168.x.x:3001/api'; // Replace with your machine IP

const TIMEOUT = 30000; // 30 seconds timeout

const fetchWithTimeout = (url, options = {}, timeout = TIMEOUT) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Network request timed out')), timeout)
    )
  ]);
};

export const authAPI = {
  // Login endpoint
  login: async (emailOrUsername, password) => {
    try {
      const loginData = emailOrUsername.includes('@') 
        ? { email: emailOrUsername, password }
        : { username: emailOrUsername, password };
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `Server error: ${response.status}`);
      }
      
      return result;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // Get adviser classes
  getAdviserClasses: async (userId) => {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/classes/adviser/${userId}`);
      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error fetching adviser classes:', error);
      throw error;
    }
  },

  // Get subject teacher classes
  getSubjectTeacherClasses: async (userId) => {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/classes/subject-teacher/${userId}`);
      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error fetching subject teacher classes:', error);
      throw error;
    }
  }
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