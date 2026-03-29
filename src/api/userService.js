import api from './axiosConfig';

export const authService = {
  // Register a new user
  register: async (userData) => {
    try {
      const response = await api.post('/users/signup', userData);
      // Don't auto-login when registering a teacher from admin panel
      // Only return response, don't store token
      return response.data;
    } catch (error) {
      const errorMsg = error?.response?.data?.message || error?.message || 'Registration failed';
      const err = new Error(errorMsg);
      throw err;
    }
  },

  // Login user
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      return response.data;
    } catch (error) {
      const errorMsg = error?.message || (typeof error === 'string' ? error : 'Login failed');
      const err = new Error(errorMsg);
      throw err;
    }
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      const response = await api.get('/users/me');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch user data' };
    }
  },

  // Logout user
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  // Get auth token
  getToken: () => {
    return localStorage.getItem('token');
  },

  // Forgot password
  forgotPassword: async (email) => {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      const errorMsg = error?.response?.data?.message || error?.message || 'Failed to send reset email';
      const err = new Error(errorMsg);
      throw err;
    }
  },

  // Reset password
  resetPassword: async ({ token, password }) => {
    try {
      const response = await api.post('/auth/reset-password', { token, password });
      return response.data;
    } catch (error) {
      const errorMsg = error?.response?.data?.message || error?.message || 'Failed to reset password';
      const err = new Error(errorMsg);
      throw err;
    }
  }
};

export default authService;
