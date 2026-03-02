#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function deleteStudentsByNames() {
  const dbUrl = 'mysql://root:SnBjHirVrIYZTNIPXZhmVMzOyqmsMznu@metro.proxy.rlwy.net:25385/railway';
  const urlObj = new URL(dbUrl);

  const config = {
    host: urlObj.hostname,
    port: parseInt(urlObj.port),
    user: urlObj.username,
    password: urlObj.password,
    database: urlObj.pathname.slice(1)
  };

  console.log('\n🗑️  Delete Students from Database\n');
  console.log('🔌 Connecting to Railway MySQL...');

  try {
    const connection = await mysql.createConnection(config);
    console.log('✅ Connected!\n');

    // Get current count
    const [countBefore] = await connection.query('SELECT COUNT(*) as count FROM students');
    console.log(`📊 Students before deletion: ${countBefore[0].count}\n`);

    // Delete by Grade 3 Diligence & Wisdom (all names provided)
    const result1 = await connection.query(
      "DELETE FROM students WHERE grade_level = ? AND section IN (?, ?)",
      ['Grade 3', 'Diligence', 'Wisdom']
    );

    // Delete by Grade 1 Humility
    const result2 = await connection.query(
      "DELETE FROM students WHERE grade_level = ? AND section = ?",
      ['Grade 1', 'Humility']
    );

    // Delete by Kindergarten Love
    const result3 = await connection.query(
      "DELETE FROM students WHERE grade_level = ? AND section = ?",
      ['Kindergarten', 'Love']
    );

    const totalDeleted = result1[0].affectedRows + result2[0].affectedRows + result3[0].affectedRows;

    // Get new count
    const [countAfter] = await connection.query('SELECT COUNT(*) as count FROM students');
    console.log(`✅ Deletion Complete!\n`);
    console.log(`📊 Deleted records:  ${totalDeleted}`);
    console.log(`📊 Students after deletion: ${countAfter[0].count}\n`);

    // Show remaining students
    const [remaining] = await connection.query(
      'SELECT id, first_name, last_name, grade_level, section FROM students LIMIT 10'
    );
    
    if (remaining.length > 0) {
      console.log('📝 Remaining students (showing first 10):');
      remaining.forEach(s => {
        console.log(`  - ${s.first_name} ${s.last_name} (${s.grade_level} - ${s.section})`);
      });
    }

    await connection.end();
    console.log('\n🎉 Ready for fresh import!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deleteStudentsByNames();
