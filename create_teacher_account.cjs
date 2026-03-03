const { query } = require('./server/config/database');
const bcrypt = require('bcryptjs');

async function createTeacherAccount() {
  try {
    console.log('🔧 Creating teacher account...');
    
    const email = 'Hz202305178@wmsu.edu.ph';
    const username = 'Hz202305178';
    const password = 'password';
    const firstName = 'Test';
    const lastName = 'Teacher';
    const fullName = `${firstName} ${lastName}`;
    
    // Check if teacher already exists in users table
    const existingUsers = await query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (existingUsers && existingUsers.length > 0) {
      console.log('ℹ️ Teacher account already exists in users table:');
      console.table(existingUsers);
      return;
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const teacherId = require('uuid').v4();
    
    // 1. Insert the teacher account into users table
    await query(
      'INSERT INTO users (id, first_name, last_name, full_name, email, username, password, role, approval_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      [teacherId, firstName, lastName, fullName, email, username, hashedPassword, 'teacher', 'approved']
    );
    
    // 2. Insert profile into teachers table (if exists)
    try {
      await query(
        'INSERT INTO teachers (id, first_name, last_name, full_name, email, status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
        [teacherId, firstName, lastName, fullName, email, 'Active']
      );
      console.log('✅ Teacher account created in both users and teachers tables!');
    } catch (teacherError) {
      // Teachers table might not exist or have different schema, continue anyway
      console.log('✅ Teacher account created in users table!');
      console.log('   Note: Teachers table insert skipped or failed');
    }
    
    console.log('📋 Account details:');
    console.log(`Email: ${email}`);
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log(`Role: teacher`);
    console.log(`Status: approved`);
    
  } catch (error) {
    console.error('❌ Error creating teacher account:', error.message);
  }
}

createTeacherAccount();
