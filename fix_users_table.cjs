// Fix Railway Users Table Schema
require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixUsersTable() {
  const dbUrl = process.env.DATABASE_URL || 'mysql://root:SnBjHirVrIYZTNIPXZhmVMzOyqmsMznu@metro.proxy.rlwy.net:25385/railway';
  const url = new URL(dbUrl);
  
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: parseInt(url.port),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1)
  });

  console.log('=== FIXING USERS TABLE SCHEMA ===\n');

  try {
    // Drop old users table
    console.log('Backing up and recreating users table...');
    await connection.execute('DROP TABLE IF EXISTS users_backup');
    await connection.execute('CREATE TABLE users_backup AS SELECT * FROM users');
    await connection.execute('DROP TABLE users');
    console.log('✅ Backup created');

    // Create new users table with all required columns
    console.log('Creating complete users table...');
    await connection.execute(`
      CREATE TABLE users (
        id varchar(50) PRIMARY KEY,
        firstName varchar(100) NOT NULL,
        lastName varchar(100) NOT NULL,
        username varchar(100) UNIQUE NOT NULL,
        email varchar(100) UNIQUE NOT NULL,
        password varchar(255) NOT NULL,
        role varchar(50) NOT NULL DEFAULT 'student',
        gradeLevel varchar(50),
        section varchar(50),
        status varchar(50) DEFAULT 'Active',
        user_id varchar(50),
        wmsu_email varchar(100),
        age INT,
        sex varchar(50),
        lrn varchar(50),
        createdAt timestamp DEFAULT CURRENT_TIMESTAMP,
        updatedAt timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_role (role),
        INDEX idx_gradeLevel (gradeLevel),
        INDEX idx_section (section),
        INDEX idx_status (status)
      )
    `);
    console.log('✅ Users table created');

    // Restore data from backup
    console.log('Restoring backup data...');
    await connection.execute(`
      INSERT INTO users (id, firstName, lastName, username, email, password, role, createdAt)
      SELECT id, firstName, lastName, username, email, password, role, createdAt FROM users_backup
    `);
    console.log('✅ Data restored');

    // Verify
    const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log(`✅ Total users: ${users[0].count}`);

    // Show table structure
    console.log('\n=== Users Table Structure ===');
    const [columns] = await connection.execute('DESCRIBE users');
    console.table(columns);

    console.log('\n✅ USERS TABLE FIXED!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

fixUsersTable().catch(console.error);
