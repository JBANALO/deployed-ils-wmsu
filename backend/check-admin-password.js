const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

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
    
    const [users] = await conn.query(
      'SELECT email, username, password FROM users WHERE username = ?',
      ['adminjossie']
    );
    
    if (!users.length) {
      console.log('❌ Admin account not found!');
      conn.release();
      process.exit(1);
    }

    const user = users[0];
    console.log('\n=== ADMIN ACCOUNT INFO ===');
    console.log('Email:', user.email);
    console.log('Username:', user.username);
    console.log('Password hash exists:', !!user.password);
    console.log('Hash length:', user.password?.length);
    console.log('Hash starts with $2b$:', user.password?.startsWith('$2b$'));
    console.log('First 20 chars:', user.password?.substring(0, 20));

    // Test bcrypt comparison
    console.log('\n=== TESTING PASSWORD ===');
    const testPassword = 'Admin123!';
    try {
      const isValid = await bcrypt.compare(testPassword, user.password);
      console.log('Password "Admin123!" matches:', isValid);
    } catch (e) {
      console.log('Error comparing password:', e.message);
    }

    conn.release();
    process.exit();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
