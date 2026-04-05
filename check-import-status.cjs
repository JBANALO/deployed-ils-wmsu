#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function checkImportStatus() {
  const config = {
    host: 'metro.proxy.rlwy.net',
    port: 25385,
    user: 'root',
    password: 'SnBjHirVrIYZTNIPXZhmVMzOyqmsMznu',
    database: 'railway'
  };

  try {
    console.log('\n📊 Check Import Status\n');
    const conn = await mysql.createConnection(config);

    // Get all students by grade
    const [students] = await conn.query(`
      SELECT grade_level, section, COUNT(*) as count, 
             GROUP_CONCAT(DISTINCT status) as statuses 
      FROM students 
      GROUP BY grade_level, section 
      ORDER BY grade_level
    `);

    console.log('Students by Grade/Section:\n');
    students.forEach(row => {
      console.log(`  ${row.grade_level} - ${row.section}: ${row.count} students (Status: ${row.statuses || 'NULL'})`);
    });

    // Get specific Grade 3 Diligence students
    const [grade3] = await conn.query(`
      SELECT first_name, last_name, status FROM students 
      WHERE grade_level = 'Grade 3' AND section = 'Diligence'
      LIMIT 5
    `);

    console.log('\nGrade 3 - Diligence Sample (first 5):');
    grade3.forEach(s => {
      console.log(`  - ${s.first_name} ${s.last_name} (Status: "${s.status}")`);
    });

    // Get total count
    const [total] = await conn.query('SELECT COUNT(*) as count FROM students');
    console.log(`\nTotal Students: ${total[0].count}\n`);

    await conn.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkImportStatus();
