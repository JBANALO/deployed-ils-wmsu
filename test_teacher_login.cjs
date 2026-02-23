const axios = require('axios');

async function testTeacherLogin() {
  try {
    console.log('🔍 Testing teacher login...');
    
    // Test the specific teacher account
    const loginData = {
      email: 'Hz202305178@wmsu.edu.ph',
      password: 'password'
    };
    
    console.log('📤 Sending login request:', { email: loginData.email, password: '***' });
    
    const response = await axios.post('http://localhost:5000/api/auth/login', loginData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response data:', response.data);
    
    if (response.data.token) {
      console.log('✅ Login successful!');
      console.log('👤 User data:', response.data.user);
      console.log('🔑 Token received:', response.data.token ? 'Yes' : 'No');
    } else {
      console.log('❌ Login failed!');
      console.log('💬 Error message:', response.data.message || 'No error message provided');
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    if (error.response) {
      console.error('📥 Status:', error.response.status);
      console.error('💬 Response:', error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🔌 Connection refused - Make sure server is running on localhost:5000');
    } else {
      console.error('🌐 Network error:', error.code);
    }
  }
}

testTeacherLogin();
