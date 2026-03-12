const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mysql = require('mysql2/promise');

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '25385')
  });
  const conn = await pool.getConnection();

  // Check admin first
  const [admins] = await conn.query("SELECT id, firstName, lastName, email, role FROM users WHERE role = 'admin'");
  console.log('Admin accounts to KEEP:', admins.map(a => `${a.email} (${a.role})`));

  // Count before
  const [[{tc}]] = await conn.query("SELECT COUNT(*) as tc FROM users WHERE role != 'admin'");
  const [[{sc}]] = await conn.query("SELECT COUNT(*) as sc FROM students");
  console.log('Teachers/advisers to delete:', tc);
  console.log('Students to delete:', sc);

  // Delete related data first
  const [g] = await conn.query('DELETE FROM grades');
  console.log('Deleted grades:', g.affectedRows);

  const [st] = await conn.query('DELETE FROM subject_teachers');
  console.log('Deleted subject_teachers:', st.affectedRows);

  // Reset adviser assignments in classes
  const [ca] = await conn.query('UPDATE classes SET adviser_id = NULL, adviser_name = NULL');
  console.log('Cleared adviser assignments from classes:', ca.affectedRows);

  // Try to delete attendance
  try {
    const [att] = await conn.query('DELETE FROM attendance');
    console.log('Deleted attendance:', att.affectedRows);
  } catch(e) { console.log('attendance table skip:', e.message); }

  // Try to delete delete_requests
  try {
    const [dr] = await conn.query('DELETE FROM delete_requests');
    console.log('Deleted delete_requests:', dr.affectedRows);
  } catch(e) { console.log('delete_requests skip:', e.message); }

  // Delete students
  const [s] = await conn.query('DELETE FROM students');
  console.log('Deleted students:', s.affectedRows);

  // Delete non-admin users
  const [u] = await conn.query("DELETE FROM users WHERE role != 'admin'");
  console.log('Deleted users (non-admin):', u.affectedRows);

  // Verify admin still exists
  const [remaining] = await conn.query('SELECT id, email, role FROM users');
  console.log('\nRemaining users:', remaining.map(r => `${r.email} (${r.role})`));

  conn.release();
  await pool.end();
  console.log('\n✅ Done! Only admin accounts remain.');
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
