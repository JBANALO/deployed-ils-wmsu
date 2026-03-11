// Reset all student passwords to predictable format: WMSU{last4LRN}0000
require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('Fetching all students...');
    const [students] = await pool.query('SELECT id, lrn, password FROM students');
    console.log(`Found ${students.length} students`);

    let updated = 0;

    for (const student of students) {
      // Generate predictable password: WMSU{last4LRN}0000
      const last4LRN = student.lrn ? student.lrn.slice(-4).padStart(4, '0') : '0000';
      const newPassword = `WMSU${last4LRN}0000`;

      // Update password
      await pool.query(
        'UPDATE students SET password = ? WHERE id = ?',
        [newPassword, student.id]
      );
      updated++;

      if (updated % 50 === 0) {
        console.log(`Updated ${updated} students...`);
      }
    }

    console.log(`\n✅ Done! Updated ${updated} students`);
    console.log('Password format: WMSU{last4LRN}0000');

    // Show sample
    console.log('\n=== Sample Students (try logging in with these) ===');
    const [sample] = await pool.query(
      `SELECT lrn, first_name, last_name, student_email, password, status 
       FROM students WHERE status IN ('Active', 'approved') LIMIT 5`
    );
    sample.forEach(s => {
      console.log(`LRN: ${s.lrn} | Email: ${s.student_email} | Password: ${s.password} | Status: ${s.status}`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
