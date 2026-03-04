const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    console.log('\n=== USERS TABLE SCHEMA ===');
    const [schema] = await pool.query('DESCRIBE users');
    schema.forEach(col => {
      console.log(`  ${col.Field} (${col.Type})${col.Null === 'NO' ? ' NOT NULL' : ''}`);
    });
    
    console.log('\n=== SAMPLE USERS DATA ===');
    const [users] = await pool.query('SELECT * FROM users LIMIT 5');
    console.log(JSON.stringify(users, null, 2));
    
    console.log('\n=== USERS BY ROLE ===');
    const [roleCount] = await pool.query('SELECT role, COUNT(*) as count FROM users GROUP BY role');
    roleCount.forEach(row => {
      console.log(`  ${row.role}: ${row.count}`);
    });
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit();
})();
