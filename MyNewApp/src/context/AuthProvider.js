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
      console.log('=== LOGIN ATTEMPT ===');
      console.log('Email/Username:', emailOrUsername);
      console.log('Backend URL: http://192.168.1.169:3001/api/auth/login');
      
      const loginData = emailOrUsername.includes('@') 
        ? { email: emailOrUsername, password }
        : { username: emailOrUsername, password };
      
      console.log('Sending login data:', JSON.stringify(loginData));
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch('http://192.168.1.169:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      console.log('Response received! Status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        return { 
          success: false, 
          error: `Server error: ${response.status}` 
        };
      }

      const result = await response.json();
      console.log('Login response:', JSON.stringify(result));

      if (result.status === 'success' && result.data && result.data.user) {
        const userData = {
          ...result.data.user,
          token: result.token
        };
        await AsyncStorage.setItem('user', JSON.stringify(userData));
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
        errorMsg = 'Network error - cannot reach server at 192.168.1.169:3001';
      } else if (error.message?.includes('fetch')) {
        errorMsg = 'Network connection failed - ' + error.message;
      }
      
      console.error('Final error message:', errorMsg);
      
      return { 
        success: false, 
        error: errorMsg
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
