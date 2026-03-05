const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

(async () => {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT || '25385')
    });

    const connection = await pool.getConnection();
    
    // New password
    const newPassword = 'Admin123!';
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    console.log('\n=== RESETTING ADMIN PASSWORD ===\n');
    console.log('Admin email: adminjossie@wmsu.edu.ph');
    console.log('New password: ' + newPassword);
    
    // Update the admin user
    const [result] = await connection.query(
      'UPDATE users SET password = ? WHERE email = ? AND role = ?',
      [hashedPassword, 'adminjossie@wmsu.edu.ph', 'admin']
    );
    
    console.log('\n✅ Password updated successfully!');
    console.log('Rows affected:', result.affectedRows);
    
    if (result.affectedRows > 0) {
      console.log('\n🔓 You can now log in with:');
      console.log('   Email: adminjossie@wmsu.edu.ph');
      console.log('   Password: Admin123!');
    } else {
      console.log('\n⚠️  No admin user found with that email');
    }
    
    await connection.end();
    process.exit();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
