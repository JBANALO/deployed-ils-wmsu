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
    
    // Find all users with "Heidi" in name
    const [users] = await conn.query(
      'SELECT id, firstName, lastName, email, role FROM users WHERE firstName LIKE ? OR lastName LIKE ?',
      ['%Heidi%', '%Heidi%']
    );
    
    console.log('\n=== USERS WITH HEIDI ===');
    users.forEach(u => {
      console.log(`ID: ${u.id}`);
      console.log(`Name: ${u.firstName} ${u.lastName}`);
      console.log(`Email: ${u.email}`);
      console.log(`Role: ${u.role}\n`);
    });

    // Also check adviser names in classes
    console.log('\n=== ADVISER NAMES IN CLASSES ===');
    const [classes] = await conn.query(
      'SELECT DISTINCT adviser_name, adviser_id FROM classes WHERE adviser_name IS NOT NULL'
    );
    
    classes.forEach(c => {
      console.log(`Name: ${c.adviser_name}, ID: ${c.adviser_id}`);
    });

    conn.release();
    process.exit();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
