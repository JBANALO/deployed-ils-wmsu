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
    
    const [classes] = await conn.query('SELECT id, grade, section FROM classes ORDER BY grade, section LIMIT 10');
    
    console.log('\n=== CLASS IDs IN DATABASE ===\n');
    classes.forEach(c => {
      console.log(`ID: ${c.id.padEnd(40)} | Grade: ${c.grade.padEnd(10)} | Section: ${c.section}`);
    });

    conn.release();
    process.exit();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
