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
    
    // Get ALL users - show them all so I can find patterns
    const [allUsers] = await conn.query(
      'SELECT id, firstName, lastName, username, email, role FROM users ORDER BY firstName, lastName LIMIT 30'
    );
    
    console.log('\n=== ALL USERS (SAMPLE) ===\n');
    allUsers.forEach((u, idx) => {
      console.log(`${(idx+1).toString().padStart(2)}) ${u.firstName} ${u.lastName.padEnd(15)} | ${u.username.padEnd(20)} | Role: ${u.role}`);
    });

    conn.release();
    process.exit();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
