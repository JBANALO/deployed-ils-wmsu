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
    
    const heidiId = 'ff3e8a38-7cba-4372-ba48-bfc530544150';
    
    // Find user with this ID
    const [users] = await conn.query(
      'SELECT id, firstName, lastName, email, username, role FROM users WHERE id = ?',
      [heidiId]
    );
    
    console.log('\n=== USER WITH ID ' + heidiId + ' ===');
    if (users.length === 0) {
      console.log('❌ NO USER FOUND WITH THIS ID!');
    } else {
      users.forEach(u => {
        console.log(`ID: ${u.id}`);
        console.log(`Name: ${u.firstName} ${u.lastName}`);
        console.log(`Email: ${u.email}`);
        console.log(`Username: ${u.username}`);
        console.log(`Role: ${u.role}`);
      });
    }

    // Check advisory relationship
    const [classes] = await conn.query(
      'SELECT id, grade, section, adviser_id, adviser_name FROM classes WHERE adviser_id = ?',
      [heidiId]
    );
    
    console.log('\n=== CLASSES WITH THIS ADVISER ===');
    classes.forEach(c => {
      console.log(`${c.grade} - ${c.section} (adviser_name: ${c.adviser_name})`);
    });

    conn.release();
    process.exit();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
