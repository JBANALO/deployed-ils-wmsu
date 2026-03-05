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
    
    // Find Heidi's user ID
    const [heidiUsers] = await conn.query(
      'SELECT id, firstName, lastName, email, role FROM users WHERE firstName = ? AND lastName = ?',
      ['Heidi', 'Rubia']
    );
    
    console.log('\n=== HEIDI USER INFO ===');
    heidiUsers.forEach(u => {
      console.log(`ID: ${u.id}`);
      console.log(`Name: ${u.firstName} ${u.lastName}`);
      console.log(`Email: ${u.email}`);
      console.log(`Role: ${u.role}`);
    });

    if (heidiUsers.length === 0) {
      console.log('Heidi not found!');
      conn.release();
      process.exit(1);
    }

    const heidiId = heidiUsers[0].id;

    // Check all classes and their adviser_id + adviser_name
    const [classes] = await conn.query(
      'SELECT id, grade, section, adviser_id, adviser_name FROM classes ORDER BY grade, section'
    );

    console.log('\n=== ALL CLASSES ===');
    classes.forEach(c => {
      const isHeidiAdviser = c.adviser_id === heidiId;
      console.log(`${c.grade} - ${c.section}`);
      console.log(`  adviser_id: ${c.adviser_id}`);
      console.log(`  adviser_name: ${c.adviser_name}`);
      console.log(`  Is Heidi adviser? ${isHeidiAdviser ? 'YES ✅' : 'NO ❌'}`);
    });

    conn.release();
    process.exit();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
