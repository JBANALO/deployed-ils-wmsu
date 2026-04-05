// Setup Complete Railway Database Schema
require('dotenv').config();
const mysql = require('mysql2/promise');

async function setupDatabase() {
  const dbUrl = process.env.DATABASE_URL || 'mysql://root:SnBjHirVrIYZTNIPXZhmVMzOyqmsMznu@metro.proxy.rlwy.net:25385/railway';
  const url = new URL(dbUrl);
  
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: parseInt(url.port),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1)
  });

  console.log('=== SETTING UP RAILWAY DATABASE SCHEMA ===\n');

  try {
    // Create classes table
    console.log('Creating classes table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS classes (
        id VARCHAR(50) PRIMARY KEY,
        grade VARCHAR(50) NOT NULL,
        section VARCHAR(50) NOT NULL,
        adviser_id VARCHAR(50),
        adviser_name VARCHAR(200),
        subject_teachers TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_grade (grade),
        INDEX idx_section (section)
      )
    `);
    console.log('✅ Classes table ready');

    // Create attendance table
    console.log('Creating attendance table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS attendance (
        id VARCHAR(50) PRIMARY KEY,
        student_id VARCHAR(50) NOT NULL,
        student_name VARCHAR(200),
        grade_level VARCHAR(50),
        section VARCHAR(50),
        date DATE NOT NULL,
        timestamp DATETIME NOT NULL,
        time VARCHAR(20),
        status VARCHAR(20) DEFAULT 'Present',
        period VARCHAR(20) DEFAULT 'morning',
        location VARCHAR(100),
        teacher_id VARCHAR(50),
        teacher_name VARCHAR(100),
        device_info TEXT,
        qr_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_student_id (student_id),
        INDEX idx_date (date),
        INDEX idx_status (status)
      )
    `);
    console.log('✅ Attendance table ready');

    // Create grades table
    console.log('Creating grades table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS grades (
        id VARCHAR(50) PRIMARY KEY,
        student_id VARCHAR(50) NOT NULL,
        subject VARCHAR(100) NOT NULL,
        q1 DECIMAL(5,2),
        q2 DECIMAL(5,2),
        q3 DECIMAL(5,2),
        q4 DECIMAL(5,2),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_student_id (student_id),
        INDEX idx_subject (subject)
      )
    `);
    console.log('✅ Grades table ready');

    // Create subject_teachers table
    console.log('Creating subject_teachers table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS subject_teachers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        class_id VARCHAR(255) NOT NULL,
        teacher_id VARCHAR(255) NOT NULL,
        teacher_name VARCHAR(200),
        subject VARCHAR(100) NOT NULL,
        day VARCHAR(50),
        start_time TIME,
        end_time TIME,
        assignedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_class (class_id),
        INDEX idx_teacher (teacher_id),
        INDEX idx_subject (subject)
      )
    `);
    console.log('✅ Subject_teachers table ready');

    // Verify all tables
    console.log('\n=== Verifying Tables ===');
    const [tables] = await connection.execute('SHOW TABLES');
    console.table(tables);

    console.log('\n✅ DATABASE SCHEMA SETUP COMPLETE!');
    console.log('\nYou can now:');
    console.log('  - Add teachers');
    console.log('  - Add students');
    console.log('  - Create classes');
    console.log('  - Manage grades');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

setupDatabase().catch(console.error);
