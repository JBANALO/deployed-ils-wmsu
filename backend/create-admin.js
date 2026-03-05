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
    
    console.log('\n=== CREATING ADMIN ACCOUNT ===\n');
    
    const newPassword = 'Admin123!';
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const adminId = 'admin-' + Date.now();
    
    const [result] = await conn.query(
      `INSERT INTO users (id, firstName, lastName, email, username, password, role, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [adminId, 'Josie', 'Banalo', 'adminjossie@wmsu.edu.ph', 'adminjossie', hashedPassword, 'admin', 'approved']
    );
    
    console.log('✅ ADMIN ACCOUNT CREATED SUCCESSFULLY!\n');
    console.log('Login credentials:');
    console.log('  Email: adminjossie@wmsu.edu.ph');
    console.log('  Password: Admin123!\n');
    
    conn.release();
    process.exit();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
