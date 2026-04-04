const mysql = require('mysql2/promise');
async function fix() {
  const conn = await mysql.createConnection({
    host: 'metro.proxy.rlwy.net', port: 25385,
    user: 'root', password: 'REPLACE_ME_DB_PASSWORD', database: 'railway'
  });

  await conn.query('DROP TABLE IF EXISTS class_assignments');
  console.log('✅ Dropped old class_assignments table');

  await conn.query(`
    CREATE TABLE class_assignments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      grade_level VARCHAR(50) NOT NULL,
      section VARCHAR(100) NOT NULL,
      adviser_id VARCHAR(255) NOT NULL,
      adviser_name VARCHAR(255) DEFAULT '',
      UNIQUE KEY unique_class (grade_level, section)
    )
  `);
  console.log('✅ Created class_assignments with correct schema (adviser_id VARCHAR, adviser_name included)');

  await conn.end();
}
fix().catch(console.error);
