const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const [rows] = await conn.execute(`
      SELECT s.id, s.name, s.description, s.is_archived,
             COUNT(c.id) as class_count
      FROM sections s
      LEFT JOIN classes c ON c.section = s.name COLLATE utf8mb4_general_ci
      WHERE s.is_archived = FALSE
      GROUP BY s.id, s.name, s.description, s.is_archived
      ORDER BY s.name
    `);
    console.log('OK rows:', rows.length);
  } catch(e) {
    console.error('QUERY ERROR:', e.sqlMessage || e.message);
  }
  await conn.end();
})();
