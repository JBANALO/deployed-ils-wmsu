// Check Ashley's subject teacher assignments
require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'junction.proxy.rlwy.net',
    port: process.env.DB_PORT || 47162,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'railway',
    waitForConnections: true,
  });

  try {
    // Check all subject_teachers for Diligence
    console.log('\n=== Subject Teachers for Diligence ===');
    const [diligence] = await pool.query(
      "SELECT * FROM subject_teachers WHERE class_id LIKE '%diligence%'"
    );
    console.log(diligence);

    // Check Ashley's ID
    console.log('\n=== Looking for Ashley in teachers table ===');
    const [ashleyTeacher] = await pool.query(
      "SELECT id, first_name, last_name, email, role FROM teachers WHERE first_name LIKE '%Ashley%' OR email LIKE '%ashley%'"
    );
    console.log(ashleyTeacher);

    console.log('\n=== Looking for Ashley in users table ===');
    const [ashleyUser] = await pool.query(
      "SELECT id, first_name, last_name, email, role FROM users WHERE first_name LIKE '%Ashley%' OR email LIKE '%ashley%'"
    );
    console.log(ashleyUser);

    // Check Ashley's UUID from JSON
    console.log('\n=== Checking subject_teachers by Ashley UUID ===');
    const ashleyUUID = 'f9aa512c-88ab-4cd5-92e7-12121a5e41cb';
    const [ashleyAssignments] = await pool.query(
      "SELECT * FROM subject_teachers WHERE teacher_id = ?",
      [ashleyUUID]
    );
    console.log(ashleyAssignments);

    // Show all subject_teachers
    console.log('\n=== All Subject Teachers ===');
    const [all] = await pool.query("SELECT * FROM subject_teachers LIMIT 20");
    console.log(all);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
