// API configuration
// Use environment variable or smart fallback based on hostname
export const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 
               (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
                 ? 'http://localhost:5000/api' 
                 : 'https://deployed-ils-wmsu-production.up.railway.app/api');

// Helper function to build API URLs
export const getApiUrl = (endpoint) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

console.log('API Config - Base URL:', API_BASE_URL, 'Environment:', import.meta.env.MODE);
