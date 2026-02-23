const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function addTeacher() {
  let connection;
  try {
    console.log('🔧 Connecting to database...');
    
    // Direct connection to Railway database
    connection = await mysql.createConnection({
      host: 'metro.proxy.rlwy.net',
      port: 25385,
      user: 'root',
      password: 'DB_PASSWORD_PLACEHOLDER', // You'll need to replace this
      database: 'railway'
    });
    
    console.log('✅ Connected to database');
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('password', 10);
    
    // Insert the teacher account
    const [result] = await connection.execute(
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
    console.log('Insert ID:', result.insertId);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

addTeacher();
