#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function cleanDatabase() {
  const config = {
    host: 'metro.proxy.rlwy.net',
    port: 25385,
    user: 'root',
    password: 'SnBjHirVrIYZTNIPXZhmVMzOyqmsMznu',
    database: 'railway'
  };

  try {
    console.log('\n🗑️  Clean Database for Fresh Import\n');
    const conn = await mysql.createConnection(config);

    // Get counts before
    const [countBefore] = await conn.query('SELECT COUNT(*) as count FROM students');
    const [usersBefore] = await conn.query('SELECT COUNT(*) as count FROM users WHERE role = "student"');
    
    console.log(`Before:\n  Students: ${countBefore[0].count}\n  Student Users: ${usersBefore[0].count}\n`);

    // Simple approach: Delete all students from target grades
    console.log('🔄 Deleting students from Grade 3, Grade 1, Kindergarten...');
    const [result1] = await conn.query(`
      DELETE FROM students 
      WHERE grade_level IN ('Grade 3', 'Grade 1', 'Kindergarten')
    `);
    console.log(`✅ Deleted ${result1.affectedRows} students\n`);

    // Delete ALL student users (they can be recreated during import)
    console.log('🔄 Deleting all student user accounts...');
    const [result2] = await conn.query(`DELETE FROM users WHERE role = "student"`);
    console.log(`✅ Deleted ${result2.affectedRows} student users\n`);

    // Get counts after
    const [countAfter] = await conn.query('SELECT COUNT(*) as count FROM students');
    const [usersAfter] = await conn.query('SELECT COUNT(*) as count FROM users WHERE role = "student"');
    
    console.log(`After:\n  Students: ${countAfter[0].count}\n  Student Users: ${usersAfter[0].count}\n`);

    // Show remaining students (non-target grades)
    const [remaining] = await conn.query(`
      SELECT first_name, last_name, grade_level, section
      FROM students
      ORDER BY grade_level, section
    `);

    if (remaining.length > 0) {
      console.log(`📝 ${remaining.length} Remaining students (preserved):`);
      remaining.forEach(s => {
        console.log(`   ${s.first_name} ${s.last_name} (${s.grade_level} - ${s.section})`);
      });
    } else {
      console.log('📝 All students removed from database');
    }

    console.log('\n✅ Database ready for fresh import!\n');
    await conn.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

cleanDatabase();
