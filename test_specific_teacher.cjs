const { query } = require('./server/config/database');

async function testSpecificTeacher() {
  try {
    console.log('Testing specific teacher account...');
    
    // Test the exact email you provided
    const teachers = await query('SELECT email, username, role, status, password FROM users WHERE email = ?', ['Hz202305178@wmsu.edu.ph']);
    
    if (teachers.length > 0) {
      console.log('✅ Teacher account found:');
      console.table(teachers);
      
      const teacher = teachers[0];
      console.log('🔍 Account Details:');
      console.log('Email:', teacher.email);
      console.log('Username:', teacher.username);
      console.log('Role:', teacher.role);
      console.log('Status:', teacher.status);
      console.log('Password Hash:', teacher.password ? 'Hashed' : 'Plain text');
      
      // Test password comparison
      const bcrypt = require('bcryptjs');
      const testPassword = 'password';
      const passwordMatch = await bcrypt.compare(testPassword, teacher.password);
      console.log('Password Match:', passwordMatch);
      
    } else {
      console.log('❌ Teacher account NOT found with email: Hz202305178@wmsu.edu.ph');
      
      // Try searching for similar emails
      const similarTeachers = await query('SELECT email, username, role, status FROM users WHERE email LIKE ?', ['%wmsu.edu.ph%']);
      if (similarTeachers.length > 0) {
        console.log('🔍 Found similar teacher accounts:');
        console.table(similarTeachers);
      }
    }
    
  } catch (error) {
    console.error('❌ Database error:', error);
  }
}

testSpecificTeacher();
