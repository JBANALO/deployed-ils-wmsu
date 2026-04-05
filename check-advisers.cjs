const mysql = require('mysql2/promise');
async function check() {
  const conn = await mysql.createConnection({
    host: 'metro.proxy.rlwy.net', port: 25385,
    user: 'root', password: 'SnBjHirVrIYZTNIPXZhmVMzOyqmsMznu', database: 'railway'
  });

  // Check class_assignments table
  try {
    const [ca] = await conn.query('SELECT * FROM class_assignments');
    console.log('class_assignments rows:', ca.length, JSON.stringify(ca, null, 2));
  } catch(e) { console.log('class_assignments does not exist yet:', e.message); }

  // Check all teachers/advisers
  const [users] = await conn.query("SELECT id, first_name, last_name, role FROM users WHERE role NOT IN ('admin', 'student', 'Admin', 'Student')");
  console.log('\nTeacher/Adviser users:', JSON.stringify(users, null, 2));

  await conn.end();
}
check().catch(console.error);
