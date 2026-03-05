require('dotenv').config();
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
    
    console.log('\n=== CHECKING FOR ADMIN ACCOUNTS ===\n');
    
    const [admins] = await conn.query(
      `SELECT id, email, role FROM users WHERE email = ?`,
      ['adminjossie@wmsu.edu.ph']
    );
    
    if (admins.length === 0) {
      console.log('❌ Admin account NOT FOUND in database!');
      console.log('\nThe account needs to be created through the signup form.');
      console.log('Or I can create it with a default password if you authorize it.');
    } else {
      console.log('✅ Admin account FOUND!');
      console.log('\nAccount details:');
      admins.forEach(a => {
        console.log(`  Email: ${a.email}`);
        console.log(`  Role: ${a.role}`);
      });
      console.log('\nThe password was reset to: Admin123!');
      console.log('(Make sure to change it after logging in)');
    }
    
    await conn.end();
    process.exit();
  } catch (error) {
    console.error('❌ Database error:', error.message);
    process.exit(1);
  }
})();
