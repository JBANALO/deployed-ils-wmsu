// Fix all student passwords to match the credentials display format
// Password format: WMSU{last4LRN}{random4digits}
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
    let skipped = 0;

    for (const student of students) {
      // Generate password: WMSU{last4LRN}{random4digits}
      const last4LRN = student.lrn ? student.lrn.slice(-4).padStart(4, '0') : '0000';
      const random4 = Math.floor(1000 + Math.random() * 9000).toString();
      const newPassword = `WMSU${last4LRN}${random4}`;

      // Check if password is already plain text (not hashed)
      const isHashed = student.password?.startsWith('$2');
      
      if (!isHashed && student.password?.startsWith('WMSU')) {
        // Already in correct format
        skipped++;
        continue;
      }

      // Update to plain text password
      await pool.query(
        'UPDATE students SET password = ? WHERE id = ?',
        [newPassword, student.id]
      );
      updated++;

      if (updated % 50 === 0) {
        console.log(`Updated ${updated} students...`);
      }
    }

    console.log(`\n✅ Done!`);
    console.log(`   Updated: ${updated} students (passwords reset to WMSU format)`);
    console.log(`   Skipped: ${skipped} students (already in correct format)`);

    // Show sample
    console.log('\n=== Sample Students ===');
    const [sample] = await pool.query(
      "SELECT lrn, first_name, last_name, password, status FROM students WHERE status IN ('Active', 'approved') LIMIT 5"
    );
    console.table(sample);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
