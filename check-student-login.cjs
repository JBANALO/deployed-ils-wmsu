// Check student accounts and their passwords
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

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
    // Check some students
    console.log('\n=== Sample Students ===');
    const [students] = await pool.query(
      "SELECT id, lrn, first_name, last_name, student_email, password, status, created_by FROM students LIMIT 5"
    );
    
    for (const s of students) {
      console.log({
        id: s.id,
        lrn: s.lrn,
        name: `${s.first_name} ${s.last_name}`,
        email: s.student_email,
        passwordHash: s.password ? s.password.substring(0, 20) + '...' : 'NULL',
        isHashed: s.password?.startsWith('$2'),
        status: s.status,
        created_by: s.created_by
      });
    }

    // Test password comparison for a student
    console.log('\n=== Testing password comparison ===');
    if (students.length > 0 && students[0].password) {
      const testPassword = 'Password123';
      const hash = students[0].password;
      const match = await bcrypt.compare(testPassword, hash);
      console.log(`Testing "${testPassword}" against hash: ${match ? 'MATCH' : 'NO MATCH'}`);
      
      // Also test with LRN as password (common pattern)
      const lrnMatch = await bcrypt.compare(students[0].lrn, hash);
      console.log(`Testing LRN "${students[0].lrn}" against hash: ${lrnMatch ? 'MATCH' : 'NO MATCH'}`);
    }

    // Count students by created_by
    console.log('\n=== Students by creator ===');
    const [counts] = await pool.query(
      "SELECT created_by, COUNT(*) as count FROM students GROUP BY created_by"
    );
    console.log(counts);

    // Check if any students have NULL password
    const [nullPass] = await pool.query(
      "SELECT COUNT(*) as count FROM students WHERE password IS NULL OR password = ''"
    );
    console.log('\nStudents with NULL/empty password:', nullPass[0].count);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
