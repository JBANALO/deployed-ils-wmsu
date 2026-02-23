import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api'; // Use the new authAPI

const AuthContext = createContext();

// Check if running on web
const isWeb = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

// Simple localStorage replacement for web
const storageManager = {
  getItem: async (key) => {
    if (isWeb) {
      return localStorage.getItem(key) || null;
    }
    return AsyncStorage.getItem(key);
  },
  setItem: async (key, value) => {
    if (isWeb) {
      localStorage.setItem(key, value);
      return;
    }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: async (key) => {
    if (isWeb) {
      localStorage.removeItem(key);
      return;
    }
    return AsyncStorage.removeItem(key);
  }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredUser();
  }, []);

  const loadStoredUser = async () => {
    try {
      const storedUser = await storageManager.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading stored user:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (emailOrUsername, password) => {
    try {
      console.log('=== LOGIN ATTEMPT ===');
      console.log('Email/Username:', emailOrUsername);
      
      const result = await authAPI.login(emailOrUsername, password);
      console.log('Login response:', JSON.stringify(result));

      if (result.status === 'success' && result.data && result.data.user) {
        const userData = {
          ...result.data.user,
          token: result.token
        };
        await storageManager.setItem('user', JSON.stringify(userData));
        setUser(userData);
        console.log('✅ Login successful!');
        return { success: true };
      } else {
        return { 
          success: false, 
          error: result.message || 'Invalid email or password' 
        };
      }
    } catch (error) {
      console.error('=== LOGIN ERROR ===');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Full error:', error);
      
      // Determine specific error type
      let errorMsg = 'Connection failed. Please check your internet connection.';
      
      if (error.name === 'AbortError') {
        errorMsg = 'Connection timeout - server took too long to respond';
      } else if (error.message?.includes('Network request')) {
        errorMsg = 'Network error - cannot reach server';
      } else if (error.message?.includes('fetch')) {
        errorMsg = 'Network connection failed - ' + error.message;
      } else {
        errorMsg = error.message || errorMsg;
      }
      
      console.error('Final error message:', errorMsg);
      
      return { 
        success: false, 
        error: errorMsg
      };
    }
  };

  const register = async (userData) => {
    // Registration not yet implemented
    return { 
      success: false, 
      error: 'Registration is not yet available. Please contact your administrator.' 
    };
  };

  const logout = async () => {
    try {
      await storageManager.removeItem('user');
      await storageManager.removeItem('token');
      setUser(null);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: 'Failed to logout' };
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    register,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
