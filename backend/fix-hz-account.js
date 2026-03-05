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
    
    // Check if hz202202743 account exists
    const [existing] = await conn.query(
      'SELECT id, firstName, lastName, email, username, role, password FROM users WHERE email LIKE ? OR username LIKE ?',
      ['%hz202202743%', '%hz202202743%']
    );

    const newPassword = 'test123';
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    if (existing.length > 0) {
      // Update password
      const user = existing[0];
      await conn.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);
      console.log('\n✅ Account found and password updated!');
      console.log(`   ID: ${user.id}`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
    } else {
      // Create new account
      const newId = 'user-hz-' + Date.now();
      await conn.query(
        `INSERT INTO users (id, firstName, lastName, email, username, password, role, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId, 'Hz', 'Account', 'hz202202743@wmsu.edu.ph', 'hz202202743', hashedPassword, 'teacher', 'approved']
      );
      console.log('\n✅ Account created!');
      console.log(`   ID: ${newId}`);
      console.log(`   Email: hz202202743@wmsu.edu.ph`);
      console.log(`   Role: teacher`);
    }

    console.log(`   Password: test123`);

    conn.release();
    process.exit();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
