const mysql = require('mysql2/promise');
async function check() {
  const conn = await mysql.createConnection({
    host: 'metro.proxy.rlwy.net', port: 25385,
    user: 'root', password: 'REPLACE_ME_DB_PASSWORD', database: 'railway'
  });

  try {
    const [s] = await conn.query('SELECT grade_level, section, COUNT(*) as student_count FROM students GROUP BY grade_level, section ORDER BY grade_level, section');
    console.log('✅ Students query OK, rows:', s.length);
  } catch(e) { console.error('❌ Students query FAILED:', e.message); }

  try {
    const [u] = await conn.query("SELECT id, first_name, last_name, grade_level, section FROM users WHERE role IN ('adviser', 'Adviser', 'teacher', 'Teacher') AND grade_level IS NOT NULL AND section IS NOT NULL");
    console.log('✅ Advisers query OK, rows:', u.length, u.map(r => r.first_name));
  } catch(e) { console.error('❌ Advisers query FAILED:', e.message); }

  // Check users table columns
  try {
    const [cols] = await conn.query("SHOW COLUMNS FROM users");
    const colNames = cols.map(c => c.Field);
    console.log('Users table columns:', colNames.join(', '));
  } catch(e) { console.error('❌ SHOW COLUMNS failed:', e.message); }

  await conn.end();
}
check().catch(console.error);
