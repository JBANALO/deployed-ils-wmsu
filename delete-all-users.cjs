#!/usr/bin/env node

const mysql = require('mysql2/promise');

// Use the same config as the application
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'wmsu_ed',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function deleteAllStudentUsers() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🗑️  Deleting ALL user accounts (student role)...\n');

    // Get users with student role before deletion
    const [studentUsers] = await connection.query(
      'SELECT id, username, email, role FROM users WHERE role = "student"'
    );
    console.log(`Found ${studentUsers.length} student users to delete`);

    if (studentUsers.length > 0) {
      console.log('Sample users to delete:');
      studentUsers.slice(0, 5).forEach(u => {
        console.log(`  - ${u.username} (${u.email})`);
      });
      if (studentUsers.length > 5) {
        console.log(`  ... and ${studentUsers.length - 5} more`);
      }
    }

    // Delete all student users
    const [deleteResult] = await connection.query(
      'DELETE FROM users WHERE role = "student"'
    );

    console.log(`\n✅ Deleted ${deleteResult.affectedRows} student users from users table`);

    // Verify deletion
    const [remainingUsers] = await connection.query(
      'SELECT COUNT(*) as count FROM users WHERE role = "student"'
    );
    console.log(`Remaining student users: ${remainingUsers[0].count}`);

    console.log('\n✅ All user accounts with student role have been deleted!');
    console.log('Ready for fresh bulk import.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    connection.release();
    await pool.end();
  }
}

deleteAllStudentUsers();
