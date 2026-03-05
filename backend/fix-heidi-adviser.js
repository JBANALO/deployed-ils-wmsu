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
    
    // Find user with username eh2022
    const [users] = await conn.query(
      'SELECT id, firstName, lastName, email, username, role FROM users WHERE username = ?',
      ['eh2022']
    );
    
    console.log('\n=== USER eh2022 ===');
    if (users.length === 0) {
      console.log('❌ User not found!');
      conn.release();
      process.exit(1);
    }

    const user = users[0];
    console.log(`ID: ${user.id}`);
    console.log(`Name: ${user.firstName} ${user.lastName}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);

    const heidiId = user.id;

    // Now fix the adviser_id in Grade 3 - Wisdom
    console.log(`\n=== FIXING ADVISER ASSIGNMENT ===`);
    const [result] = await conn.query(
      'UPDATE classes SET adviser_id = ? WHERE grade = ? AND section = ?',
      [heidiId, 'Grade 3', 'Wisdom']
    );

    console.log(`✅ Updated ${result.affectedRows} class(es)`);
    console.log(`   Grade 3 - Wisdom now has adviser_id: ${heidiId}`);

    // Verify
    const [updated] = await conn.query(
      'SELECT id, grade, section, adviser_id, adviser_name FROM classes WHERE grade = ? AND section = ?',
      ['Grade 3', 'Wisdom']
    );

    console.log('\n=== VERIFICATION ===');
    updated.forEach(c => {
      console.log(`${c.grade} - ${c.section}`);
      console.log(`  adviser_name: ${c.adviser_name}`);
      console.log(`  adviser_id: ${c.adviser_id}`);
      console.log(`  Matches eh2022 ID? ${c.adviser_id === heidiId ? 'YES ✅' : 'NO ❌'}`);
    });

    conn.release();
    process.exit();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
