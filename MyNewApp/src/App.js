import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Platform } from 'react-native';
import AuthProvider from './context/AuthProvider';
import { AttendanceProvider } from './context/AttendanceContext';

import LoginScreen from './Screens/LoginScreen';
import RegisterScreen from './Screens/RegisterScreen';
import HomeScreen from './Screens/HomeScreen';
import LogScreen from './Screens/LogScreen';
import GenerateScreen from './Screens/GenerateScreen';
import ScanQRScreen from './Screens/ScanQRScreen';
import ProfileScreen from './Screens/ProfileScreen';
import TermsScreen from './Screens/TermsScreen';
import ConnectionTest from './components/ConnectionTest';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#8B0000',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          position: 'absolute', 
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 8, 
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          height: Platform.OS === 'ios' ? 85 : 70, 
          paddingBottom: Platform.OS === 'ios' ? 20 : 12,
          paddingTop: 8,
          shadowColor: '#000', 
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 3,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" size={26} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="GenerateTab" 
        component={GenerateScreen}
        options={{
          tabBarLabel: 'Generate',
          tabBarIcon: ({ color, size }) => (
            <Icon name="qrcode" size={26} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="ScanTab" 
        component={ScanQRScreen}
        options={{
          tabBarLabel: 'Scan',
          tabBarIcon: ({ color, size }) => (
            <Icon name="camera" size={26} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="LogTab" 
        component={LogScreen}
        options={{
          tabBarLabel: 'Logs',
          tabBarIcon: ({ color, size }) => (
            <Icon name="clipboard-text" size={26} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Icon name="account" size={26} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AttendanceProvider>
        <NavigationContainer>
          <Stack.Navigator 
            initialRouteName="Login"
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen 
              name="Terms" 
              component={TermsScreen}
              options={{ 
                headerShown: true,
                title: 'Terms and Conditions',
                headerStyle: { backgroundColor: '#8B0000' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' }
              }}
            />
            <Stack.Screen name="Home" component={MainTabs} />
          </Stack.Navigator>
        </NavigationContainer>
      </AttendanceProvider>
    </AuthProvider>
  );
}