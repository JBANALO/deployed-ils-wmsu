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
    
    // Get hz202202743 account ID
    const [users] = await conn.query(
      'SELECT id, firstName, lastName, email, role FROM users WHERE email LIKE ? OR username LIKE ?',
      ['%hz202202743%', '%hz202202743%']
    );

    if (users.length === 0) {
      console.log('❌ hz202202743 account not found!');
      conn.release();
      process.exit(1);
    }

    const user = users[0];
    console.log(`✅ Found account: ${user.firstName} ${user.lastName} (${user.email})`);

    // Update role to teacher if not already
    if (user.role !== 'teacher' && user.role !== 'adviser') {
      await conn.query('UPDATE users SET role = ? WHERE id = ?', ['teacher', user.id]);
      console.log('✅ Role updated to teacher');
    }

    // Update Grade 3 - Wisdom adviser_id to this user
    const [result] = await conn.query(
      'UPDATE classes SET adviser_id = ?, adviser_name = ? WHERE grade = ? AND section = ?',
      [user.id, `${user.firstName} ${user.lastName}`, 'Grade 3', 'Wisdom']
    );
    console.log(`✅ Updated adviser assignment for Grade 3 - Wisdom (${result.affectedRows} row)`);

    // Delete duplicate eh202202743 account if it exists
    await conn.query('DELETE FROM users WHERE email = ?', ['eh202202743@wmsu.edu.ph']);
    console.log('✅ Removed duplicate eh202202743 account');

    conn.release();
    process.exit();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
