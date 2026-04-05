#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function deleteByGradeAndSection() {
  const dbUrl = 'mysql://root:SnBjHirVrIYZTNIPXZhmVMzOyqmsMznu@metro.proxy.rlwy.net:25385/railway';
  const urlObj = new URL(dbUrl);

  const config = {
    host: urlObj.hostname,
    port: parseInt(urlObj.port),
    user: urlObj.username,
    password: urlObj.password,
    database: urlObj.pathname.slice(1)
  };

  console.log('\n🗑️  Delete Students by Grade and Section\n');
  console.log('🔌 Connecting to Railway MySQL...');

  try {
    const connection = await mysql.createConnection(config);
    console.log('✅ Connected!\n');

    // Get count before
    const [countBefore] = await connection.query('SELECT COUNT(*) as count FROM students');
    console.log(`📊 Students before deletion: ${countBefore[0].count}\n`);

    // Delete by grade and section
    const targetsToDelete = [
      { grade: 'Grade 3', section: 'Diligence' },
      { grade: 'Grade 3', section: 'Wisdom' },
      { grade: 'Grade 1', section: 'Humility' },
      { grade: 'Kindergarten', section: 'Love' }
    ];

    let totalDeleted = 0;
    console.log('🔄 Deleting...\n');

    for (const target of targetsToDelete) {
      const [result] = await connection.query(
        'DELETE FROM students WHERE grade_level = ? AND section = ?',
        [target.grade, target.section]
      );
      const deleted = result.affectedRows;
      totalDeleted += deleted;
      console.log(`  ✓ ${target.grade} - ${target.section}: ${deleted} deleted`);
    }

    // Get count after
    const [countAfter] = await connection.query('SELECT COUNT(*) as count FROM students');
    console.log(`\n✅ Deletion Complete!\n`);
    console.log(`📊 Total deleted: ${totalDeleted}`);
    console.log(`📊 Students after deletion: ${countAfter[0].count}\n`);

    // Show remaining students
    const [remaining] = await connection.query('SELECT first_name, last_name, grade_level, section FROM students LIMIT 15');
    console.log('📝 Remaining students (showing first 15):');
    remaining.forEach(s => {
      console.log(`  - ${s.first_name} ${s.last_name} (${s.grade_level} - ${s.section})`);
    });

    await connection.end();
    console.log('\n🎉 Database cleaned! Ready for fresh import!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deleteByGradeAndSection();
