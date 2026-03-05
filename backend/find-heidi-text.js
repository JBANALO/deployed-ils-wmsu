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
    
    // Count total users
    const [[{count}]] = await conn.query('SELECT COUNT(*) as count FROM users');
    console.log(`\nTotal users in database: ${count}`);

    // Search by text content
    const [matched] = await conn.query(
      'SELECT id, firstName, lastName, email, username, role FROM users WHERE CONCAT(firstName, " ", lastName) LIKE ? OR firstName LIKE ? OR lastName LIKE ?',
      ['%Heidi%', '%Lynn%', '%Rubia%']
    );
    
    console.log('\n=== SEARCH RESULTS FOR HEIDI/LYNN/RUBIA ===\n');
    if (matched.length === 0) {
      console.log('❌ NO MATCHES FOUND!');
    } else {
      matched.forEach(u => {
        console.log(`ID: ${u.id}`);
        console.log(`Name: ${u.firstName} ${u.lastName}`);
        console.log(`Email: ${u.email}`);
        console.log(`Username: ${u.username}`);
        console.log(`Role: ${u.role}\n`);
      });
    }

    conn.release();
    process.exit();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
