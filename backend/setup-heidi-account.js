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
    
    // Search for user with email or username containing eh202202743
    const [users] = await conn.query(
      'SELECT id, firstName, lastName, email, username, role FROM users WHERE email LIKE ? OR username LIKE ?',
      ['%eh202202743%', '%eh202202743%']
    );
    
    console.log('\n=== SEARCH FOR eh202202743 ===');
    if (users.length === 0) {
      console.log('❌ NO USER FOUND WITH THIS EMAIL/USERNAME');
      console.log('\nCreating teacher account...\n');

      const newUserId = 'user-' + Date.now();
      const [result] = await conn.query(
        `INSERT INTO users (id, firstName, lastName, email, username, password, role, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [newUserId, 'Heidi', 'Rubia', 'eh202202743@wmsu.edu.ph', 'eh202202743', 'password123', 'teacher', 'approved']
      );

      console.log('✅ Teacher account created!');
      console.log(`   ID: ${newUserId}`);
      console.log(`   Name: Heidi Rubia`);
      console.log(`   Email: eh202202743@wmsu.edu.ph`);
      console.log(`   Role: teacher`);

      // Now update the adviser assignment
      const [updateResult] = await conn.query(
        'UPDATE classes SET adviser_id = ? WHERE grade = ? AND section = ?',
        [newUserId, 'Grade 3', 'Wisdom']
      );

      console.log(`\n✅ Updated ${updateResult.affectedRows} class adviser assignment`);
      console.log(`   Grade 3 - Wisdom adviser_id: ${newUserId}`);

    } else {
      const user = users[0];
      console.log('✅ User found!');
      console.log(`   ID: ${user.id}`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);

      // Update adviser assignment
      const [updateResult] = await conn.query(
        'UPDATE classes SET adviser_id = ? WHERE grade = ? AND section = ?',
        [user.id, 'Grade 3', 'Wisdom']
      );

      console.log(`\n✅ Updated ${updateResult.affectedRows} class adviser assignment`);
      console.log(`   Grade 3 - Wisdom adviser_id: ${user.id}`);
    }

    conn.release();
    process.exit();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
