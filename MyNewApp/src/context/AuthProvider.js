import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

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
      const storedUser = await AsyncStorage.getItem('user');
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
      console.log('Attempting login with:', emailOrUsername);
      
      // Use backend API login instead of Firebase
      // Send both email and username fields for backend to handle
      const loginData = emailOrUsername.includes('@') 
        ? { email: emailOrUsername, password }
        : { username: emailOrUsername, password };
      
      console.log('Login data:', loginData);
      
      const response = await fetch('http://192.168.1.169:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      const result = await response.json();
      console.log('Login API response:', result);

      if (result.status === 'success' && result.data && result.data.user) {
        // Store user and token in AsyncStorage
        const userData = {
          ...result.data.user,
          token: result.token
        };
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        return { success: true };
      } else {
        return { 
          success: false, 
          error: result.message || 'Invalid email or password' 
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error message:', error.message);
      console.error('Error details:', JSON.stringify(error));
      return { 
        success: false, 
        error: 'Connection failed. Please check your internet connection.' 
      };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('token');
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
