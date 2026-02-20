import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  StatusBar,
  KeyboardAvoidingView,
  Alert,
  ScrollView
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../context/AuthProvider';

// Detect if running on web
const isWeb = typeof window !== 'undefined';
// Safe Platform access - only imported when not on web
let Platform = null;
if (!isWeb) {
  try {
    Platform = require('react-native').Platform;
  } catch (e) {
    Platform = { OS: 'android' };
  }
}

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');

    if (!email || !password) {
      setError('Please enter email/username and password');
      return;
    }

    setLoading(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        navigation.replace('Home');
      } else {
        setLoading(false);
        setError(result.error || 'Login failed. Please try again.');
      }
    } catch (err) {
      setLoading(false);
      setError('An error occurred. Please try again.');
    }
  };


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor="#8B0000" barStyle="light-content" />
        <ActivityIndicator size="large" color="#8B0000" />
        <Text style={styles.loadingText}>Logging in...</Text>
        <Text style={styles.loadingSubtext}>Please wait</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar backgroundColor="#8B0000" barStyle="light-content" />
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={isWeb ? 'height' : (Platform?.OS === 'ios' ? 'padding' : 'height')}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Icon name="school" size={60} color="#fff" />
            <Text style={styles.headerTitle}>WMSU ElemScan</Text>
            <Text style={styles.headerSubtitle}>Teacher's Login</Text>
          </View>

          <View style={styles.formContainer}>
          
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeText}>Welcome Back!</Text>
            <Text style={styles.welcomeSubtext}>Login to continue</Text>
          </View>

        
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email or Username</Text>
            <View style={styles.inputContainer}>
              <Icon name="account" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="email@wmsu.edu.ph or username"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="username"
              />
            </View>
          </View>

         
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Icon name="lock" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                textContentType="password"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Icon 
                  name={showPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>
          </View>

          
          {error ? (
            <View style={styles.errorContainer}>
              <Icon name="alert-circle" size={20} color="#f44336" />
              <Text style={styles.errorMessage}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity 
            style={styles.loginButton} 
            onPress={handleLogin}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>

          
          <TouchableOpacity style={styles.forgotPasswordContainer}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          
          <View style={styles.registerLinkContainer}>
            <Text style={styles.registerLinkText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Register</Text>
            </TouchableOpacity>
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5' 
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20
  },
  
  header: { 
    backgroundColor: '#8B0000', 
    padding: 40,
    paddingTop: 60,
    alignItems: 'center'
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#fff',
    marginTop: 16
  },
  headerSubtitle: { 
    fontSize: 16, 
    color: '#fff', 
    opacity: 0.9, 
    marginTop: 8 
  },
  
  formContainer: { 
    flex: 1,
    padding: 20 
  },
  
  welcomeContainer: {
    marginTop: 20,
    marginBottom: 30
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
  },
  welcomeSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  
  inputGroup: { marginBottom: 20 },
  label: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#333', 
    marginBottom: 8 
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    height: 50
  },
  inputIcon: { marginRight: 8 },
  input: { 
    flex: 1, 
    fontSize: 15, 
    color: '#000',
    fontWeight: '400'
  },
  
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8
  },
  errorMessage: { 
    flex: 1, 
    fontSize: 14, 
    color: '#f44336' 
  },
  
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#8B0000',
    gap: 8
  },
  resendButtonText: {
    fontSize: 14,
    color: '#8B0000',
    fontWeight: '600'
  },
  
  loginButton: {
    backgroundColor: '#8B0000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8
  },
  loginButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: 16
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#8B0000',
    fontWeight: '600'
  },
  
  registerLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30
  },
  registerLinkText: { 
    fontSize: 14, 
    color: '#666' 
  },
  registerLink: { 
    fontSize: 14, 
    color: '#8B0000', 
    fontWeight: 'bold' 
  },
  
  // Loading Screen
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8
  },
});