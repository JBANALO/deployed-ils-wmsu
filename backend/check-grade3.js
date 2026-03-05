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
    
    // Check Grade 3 classes
    const [classes] = await conn.query(
      'SELECT id, grade, section, adviser_id, adviser_name FROM classes WHERE grade LIKE ? ORDER BY section',
      ['%3%']
    );
    
    console.log('\n=== GRADE 3 CLASSES ===\n');
    classes.forEach(c => {
      console.log(`ID: ${c.id}`);
      console.log(`  Grade: ${c.grade}`);
      console.log(`  Section: ${c.section}`);
      console.log(`  Adviser: ${c.adviser_name}`);
      console.log('');
    });

    conn.release();
    process.exit();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
