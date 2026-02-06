// API configuration
const isProduction = window.location.hostname.includes('railway.app') || 
                     window.location.hostname.includes('up.railway.app');

export const API_BASE_URL = isProduction ? '/api' : 'http://localhost:5000/api';

// Helper function to build API URLs
export const getApiUrl = (endpoint) => {
  // Remove leading slash if present to avoid double slashes
 const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

console.log('API Config - Base URL:', API_BASE_URL, 'isProduction:', isProduction);
