import axios from 'axios';

const host = window.location.hostname;
const isLocalHost = host === 'localhost' || host === '127.0.0.1';

// In production, always use same-origin API to prevent stale/mismatched backend targets.
const apiURL = isLocalHost
  ? (import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:5000/api')
  : `${window.location.origin}/api`;

if (import.meta.env.MODE === 'development') {
  console.log('API URL:', apiURL, 'Environment:', import.meta.env.MODE);
}

const api = axios.create({
  baseURL: apiURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor
api.interceptors.response.use(
  (response) => {
    // Just pass through the response unchanged
    return response;
  },
  (error) => {
    // Handle errors globally
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response error:', error.response.status, error.response.data);
      const errorData = error.response.data;
      const errorMessage = errorData?.message || errorData?.error || 'An error occurred';
      
      // Handle 401 Unauthorized - logout user only for actual auth failures
      if (error.response.status === 401) {
        console.log('401 Unauthorized detected, checking if it\'s an auth failure...');
        
        // Only logout if it's actually an authentication failure, not other 401 errors
        const errorMessage = errorData?.message || errorData?.error || '';
        const isAuthFailure = errorMessage.toLowerCase().includes('incorrect') || 
                           errorMessage.toLowerCase().includes('invalid') || 
                           errorMessage.toLowerCase().includes('expired') ||
                           errorMessage.toLowerCase().includes('unauthorized');
        
        if (isAuthFailure) {
          console.log('Authentication failure detected, logging out user');
          // Clear authentication data
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          
          // Clear UserContext if available
          try {
            // Trigger storage event to clear UserContext in other tabs
            window.dispatchEvent(new StorageEvent('storage', {
              key: 'user',
              newValue: null
            }));
          } catch (e) {
            console.error('Error clearing UserContext:', e);
          }
          
          // Redirect to login page (only if not already on login page)
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          
          return Promise.reject(new Error('Session expired - Please login again'));
        } else {
          console.log('401 error but not auth failure, not logging out');
          return Promise.reject(new Error(errorMessage));
        }
      }
      
      // Handle 500 Server Error - don't logout, just show error
      if (error.response.status >= 500) {
        console.error('Server error detected, not logging out user');
        return Promise.reject(new Error('Server error - Please try again later'));
      }
      
      return Promise.reject(new Error(errorMessage));
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Network error:', error.message);
      // Don't logout on network errors, could be temporary connectivity issue
      return Promise.reject(new Error('Network error - Please check your connection'));
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Request setup error:', error.message);
      return Promise.reject(new Error(error.message));
    }
  }
);

export default api;
