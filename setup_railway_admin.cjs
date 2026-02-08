// Setup Railway Database - Add Admin Account
require('dotenv').config();
const mysql = require('mysql2/promise');

async function setupAdmin() {
  console.log('=== RAILWAY DATABASE SETUP ===\n');
  
  // Get Railway MySQL connection from environment variables
  // Set these in Railway: deployed-ils-wmsu service Variables tab
  // Or copy from MySQL service MYSQL_URL
  
  const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_PUBLIC_URL;
  
  if (!dbUrl) {
    console.error('❌ DATABASE_URL not found!');
    console.log('\nGet the MYSQL_URL from Railway:');
    console.log('1. Go to Railway → MySQL service → Variables');
    console.log('2. Copy MYSQL_URL value (mysql://root:password@host:port/railway)');
    console.log('3. Set it: $env:DATABASE_URL="<paste-url-here>"');
    console.log('4. Run this script again');
    process.exit(1);
  }

  const url = new URL(dbUrl);
  const dbConfig = {
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1)
  };

  console.log(`Connecting to: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`Database: ${dbConfig.database}\n`);

  let connection;
  
  try {
    // Connect to Railway MySQL
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to Railway MySQL\n');

    // Create users table
    console.log('Creating users table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id varchar(50) PRIMARY KEY,
        firstName varchar(100) NOT NULL,
        lastName varchar(100) NOT NULL,
        username varchar(100) UNIQUE NOT NULL,
        role varchar(50) NOT NULL,
        email varchar(100) UNIQUE NOT NULL,
        password varchar(255) NOT NULL,
        createdAt timestamp DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table ready\n');

    // Insert admin account
    console.log('Adding admin account...');
    await connection.execute(`
      INSERT INTO users (id, firstName, lastName, username, role, email, password, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE email = email
    `, [
      '97d78aa1-af71-4fe2-ad4a-c3584b6459f2',
      'Josie',
      'Banalo',
      'jossie',
      'admin',
      'adminjossie@wmsu.edu.ph',
      '$2b$12$q10CO7iLzzqmCWk8DjieSusCZou4Tfz9jHfJnLWH72a6bk4reFScW'
    ]);
    console.log('✅ Admin account created!\n');

    // Verify
    const [rows] = await connection.execute('SELECT id, firstName, lastName, email, role FROM users WHERE role = ?', ['admin']);
    console.log('=== Admin Accounts ===');
    console.table(rows);

    console.log('\n✅ SETUP COMPLETE!');
    console.log('\nLogin credentials:');
    console.log('  Email: adminjossie@wmsu.edu.ph');
    console.log('  Password: Admin123');
    console.log('\nFrontend: https://deployed-ils-wmsu.vercel.app');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Connection closed');
    }
  }
}

setupAdmin();
