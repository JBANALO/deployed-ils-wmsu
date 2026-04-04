import axios from 'axios';

// Get API URL from environment variable with fallbacks
const apiURL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 
               (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : 'https://deployed-ils-wmsu-production.up.railway.app/api');

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
    // Preserve the original error so callers can inspect `error.response`
    if (error.response) {
      console.error('Response error:', error.response.data);
    } else if (error.request) {
      console.error('Request error: no response received', error.request);
    } else {
      console.error('Axios error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
