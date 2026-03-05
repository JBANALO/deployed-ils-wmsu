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
    
    const heidiPassword = 'Heidi123!';
    const hashedPassword = await bcrypt.hash(heidiPassword, 12);

    // Update Heidi's password with hashed version
    const [result] = await conn.query(
      'UPDATE users SET password = ? WHERE email = ?',
      [hashedPassword, 'eh202202743@wmsu.edu.ph']
    );

    console.log('\n=== HEIDI ACCOUNT PASSWORD FIX ===\n');
    console.log('✅ Password updated with bcrypt hash');
    console.log('   Email: eh202202743@wmsu.edu.ph');
    console.log('   Password: Heidi123!');
    console.log('   Updated rows:', result.affectedRows);

    conn.release();
    process.exit();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
