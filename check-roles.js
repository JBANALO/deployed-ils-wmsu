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
    const [users] = await pool.query('SELECT id, firstName, lastName, email, role FROM users LIMIT 10');
    console.log('Sample users from database:');
    console.log(JSON.stringify(users, null, 2));
    
    const [roles] = await pool.query('SELECT DISTINCT role FROM users');
    console.log('\nDistinct roles in database:');
    console.log(JSON.stringify(roles, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit();
})();
