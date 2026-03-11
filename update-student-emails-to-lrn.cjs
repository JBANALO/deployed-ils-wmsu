// Update all student emails to LRN format: lrn@wmsu.edu.ph
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
    // Get all students
    console.log('Fetching all students...');
    const [students] = await pool.query('SELECT id, lrn, student_email FROM students');
    console.log(`Found ${students.length} students`);

    let updated = 0;
    let skipped = 0;

    for (const student of students) {
      const newEmail = `${student.lrn}@wmsu.edu.ph`;
      
      if (student.student_email === newEmail) {
        skipped++;
        continue;
      }

      await pool.query(
        'UPDATE students SET student_email = ? WHERE id = ?',
        [newEmail, student.id]
      );
      updated++;
      
      if (updated % 50 === 0) {
        console.log(`Updated ${updated} students...`);
      }
    }

    console.log(`\n✅ Done!`);
    console.log(`   Updated: ${updated} students`);
    console.log(`   Skipped (already correct): ${skipped} students`);

    // Show sample results
    console.log('\n=== Sample Updated Students ===');
    const [sample] = await pool.query(
      'SELECT lrn, first_name, last_name, student_email FROM students LIMIT 5'
    );
    console.table(sample);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
