const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const [t] = await conn.execute("SHOW TABLES LIKE 'school_years'");
    if (t.length === 0) {
      console.log('school_years table DOES NOT EXIST - creating it...');
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS school_years (
          id INT AUTO_INCREMENT PRIMARY KEY,
          label VARCHAR(100) NOT NULL UNIQUE,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          is_active TINYINT(1) DEFAULT 0,
          is_archived TINYINT(1) DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log('Created school_years table!');
    } else {
      console.log('school_years table EXISTS');
      const [rows] = await conn.execute('SELECT id, label, is_active FROM school_years LIMIT 5');
      console.log('Rows:', rows);
    }
  } catch(e) { console.error('ERROR:', e.message); }
  await conn.end();
})();
