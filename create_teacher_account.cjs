const { query } = require('./server/config/database');
const bcrypt = require('bcryptjs');

async function createTeacherAccount() {
  try {
    console.log('🔧 Creating teacher account...');
    
    // Check if teacher already exists
    const existingTeachers = await query('SELECT * FROM users WHERE email = ?', ['Hz202305178@wmsu.edu.ph']);
    
    if (existingTeachers.length > 0) {
      console.log('ℹ️ Teacher account already exists:');
      console.table(existingTeachers);
      return;
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('password', 10);
    
    // Insert the teacher account
    const result = await query(
      'INSERT INTO users (firstName, lastName, email, username, password, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['Test', 'Teacher', 'Hz202305178@wmsu.edu.ph', 'Hz202305178', hashedPassword, 'teacher', 'approved']
    );
    
    console.log('✅ Teacher account created successfully!');
    console.log('📋 Account details:');
    console.log('Email: Hz202305178@wmsu.edu.ph');
    console.log('Username: Hz202305178');
    console.log('Password: password');
    console.log('Role: teacher');
    console.log('Status: approved');
    
  } catch (error) {
    console.error('❌ Error creating teacher account:', error.message);
  }
}

createTeacherAccount();
