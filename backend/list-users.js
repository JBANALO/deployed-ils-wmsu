const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

(async () => {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT || '25385')
    });

    const conn = await pool.getConnection();
    
    // Show ALL users
    const [allUsers] = await conn.query(
      'SELECT id, firstName, lastName, email, username, role FROM users'
    );
    
    console.log('\n=== ALL USERS IN DATABASE ===\n');
    allUsers.forEach(u => {
      console.log(`Username: ${(u.username || 'NULL').padEnd(20)} | Name: ${u.firstName} ${u.lastName} | Role: ${u.role}`);
    });

    conn.release();
    process.exit();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
