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
    
    console.log('\n=== CHECKING ADMIN ACCOUNTS ===\n');
    
    const [users] = await conn.query(
      `SELECT id, email, username, role FROM users WHERE username = ? OR email LIKE ?`,
      ['adminjossie', '%admin%']
    );
    
    console.log(`Found ${users.length} admin-like accounts:\n`);
    users.forEach(u => {
      console.log(`  Email: ${u.email}`);
      console.log(`  Username: ${u.username}`);
      console.log(`  Role: ${u.role}\n`);
    });
    
    if (users.length === 0) {
      console.log('No admin accounts found. Creating one...\n');
      
      const newPassword = 'Admin123!';
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      const adminId = 'admin-' + Date.now();
      
      const [result] = await conn.query(
        `INSERT INTO users (id, firstName, lastName, email, username, password, role, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [adminId, 'Josie', 'Banalo', 'adminjossie@wmsu.edu.ph', 'adminjossie', hashedPassword, 'admin', 'approved']
      );
      
      console.log('✅ Admin account created!\n');
      console.log('  Email: adminjossie@wmsu.edu.ph');
      console.log('  Password: Admin123!\n');
    } else {
      console.log('Admin account exists! Updating password to Admin123!...\n');
      
      const newPassword = 'Admin123!';
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      const [result] = await conn.query(
        `UPDATE users SET password = ? WHERE username = ?`,
        [hashedPassword, 'adminjossie']
      );
      
      console.log('✅ Password updated!\n');
      console.log('  Email: ' + users[0].email);
      console.log('  Password: Admin123!\n');
    }
    
    conn.release();
    process.exit();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
