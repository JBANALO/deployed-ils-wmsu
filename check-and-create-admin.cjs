require('dotenv').config();
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
    
    console.log('\n=== CHECKING FOR ADMIN ACCOUNTS ===\n');
    
    // Check for any admin accounts
    const [admins] = await conn.query(
      `SELECT id, email, role, password FROM users WHERE email LIKE ? OR role = ?`,
      ['%adminjossie%', 'admin']
    );
    
    if (admins.length === 0) {
      console.log('❌ NO ADMIN ACCOUNTS FOUND!');
      console.log('\nCreating new admin account...\n');
      
      const newPassword = 'Admin123!';
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      const adminId = 'admin-' + Date.now();
      
      const [result] = await conn.query(
        `INSERT INTO users (id, first_name, last_name, email, username, password, role, approval_status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [adminId, 'Josie', 'Banalo', 'adminjossie@wmsu.edu.ph', 'adminjossie', hashedPassword, 'admin', 'approved']
      );
      
      console.log('✅ NEW ADMIN ACCOUNT CREATED!');
      console.log('\nLogin credentials:');
      console.log('  Email: adminjossie@wmsu.edu.ph');
      console.log('  Password: Admin123!');
    } else {
      console.log(`✅ Found ${admins.length} admin account(s):\n`);
      admins.forEach((a, idx) => {
        console.log(`  ${idx + 1}. ${a.email}`);
        console.log(`     Role: ${a.role}`);
        console.log(`     Has password: ${a.password ? '✅' : '❌'}`);
      });
      
      console.log('\nResetting password for adminjossie@wmsu.edu.ph...\n');
      
      const newPassword = 'Admin123!';
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      const [updateResult] = await conn.query(
        'UPDATE users SET password = ? WHERE email = ?',
        [hashedPassword, 'adminjossie@wmsu.edu.ph']
      );
      
      if (updateResult.affectedRows > 0) {
        console.log('✅ PASSWORD RESET SUCCESSFUL!');
        console.log('\nLogin credentials:');
        console.log('  Email: adminjossie@wmsu.edu.ph');
        console.log('  Password: Admin123!');
      } else {
        console.log('❌ Failed to update password');
      }
    }
    
    await conn.end();
    process.exit();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
