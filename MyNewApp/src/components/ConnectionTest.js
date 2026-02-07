import React, { useState } from 'react';
import { View, Text, Button, Alert, StyleSheet } from 'react-native';
import { attendanceAPI } from '../services/api';

export default function ConnectionTest() {
  const [status, setStatus] = useState('Not tested');
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setStatus('Testing connection...');
    
    try {
      // Test basic connection
      const connected = await attendanceAPI.testConnection();
      
      if (connected) {
        // If connected, try to fetch students
        const students = await attendanceAPI.getStudents();
        const message = `✅ Connected! Found ${students.length} students in database`;
        setStatus(message);
        
        Alert.alert(
          'Connection Successful! 🎉', 
          `Backend server is running.\n\nFound ${students.length} students in the system.\n\nReady for QR attendance scanning!`,
          [{ text: 'Great!', style: 'default' }]
        );
      } else {
        setStatus('❌ Connection failed - Server not responding');
        Alert.alert(
          'Connection Failed ❌', 
          'Cannot connect to backend server.\n\nPlease check:\n• Backend server is running\n• Both devices on same WiFi\n• Computer firewall allows port 5000',
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error) {
      const errorMessage = `❌ Error: ${error.message}`;
      setStatus(errorMessage);
      Alert.alert(
        'Connection Error ❌', 
        `Error details: ${error.message}\n\nPlease check your internet connection and try again.`,
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Backend Connection Test</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>{status}</Text>
      </View>
      
      <Button 
        title={loading ? "Testing..." : "Test Backend Connection"} 
        onPress={testConnection}
        disabled={loading}
        color="#007AFF"
      />
      
      <Text style={styles.infoText}>
        Server: http://192.168.0.153:5000/api
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    margin: 20,
    borderRadius: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  statusContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  statusText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
  infoText: {
    fontSize: 12,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },
});
