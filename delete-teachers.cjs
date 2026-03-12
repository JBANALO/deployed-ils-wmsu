const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mysql = require('mysql2/promise');

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT)
  });

  // Show what will be deleted
  const [rows] = await pool.query("SELECT id, firstName, lastName, email, role FROM users WHERE role != 'admin'");
  console.log('Non-admin users to delete:', rows.length);
  rows.forEach(r => console.log(`  - ${r.firstName} ${r.lastName} | ${r.email} | ${r.role}`));

  // Clean subject_teachers first (references teacher_id)
  const [st] = await pool.query('DELETE FROM subject_teachers');
  console.log('Deleted subject_teachers:', st.affectedRows);

  // Clear adviser assignments
  const [ca] = await pool.query('UPDATE classes SET adviser_id = NULL, adviser_name = NULL WHERE adviser_id IS NOT NULL');
  console.log('Cleared adviser assignments:', ca.affectedRows);

  // Delete non-admin users
  const [result] = await pool.query("DELETE FROM users WHERE role != 'admin'");
  console.log('Deleted users:', result.affectedRows);

  // Verify
  const [remaining] = await pool.query('SELECT email, role FROM users');
  console.log('\nRemaining users:', remaining.map(r => `${r.email} (${r.role})`));

  await pool.end();
  console.log('\nDone!');
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
