#!/usr/bin/env node

const mysql = require('mysql2/promise');
const https = require('https');

async function testBulkImportFlow() {
  const config = {
    host: 'metro.proxy.rlwy.net',
    port: 25385,
    user: 'root',
    password: 'REPLACE_ME_DB_PASSWORD',
    database: 'railway'
  };

  try {
    console.log('\n🧪 Test Bulk Import Flow\n');
    const conn = await mysql.createConnection(config);

    // Clear any test data
    await conn.query('DELETE FROM students WHERE lrn LIKE "131%"');

    // Insert test student directly
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const testLRN = `${yy}${mm}${dd}${hh}${min}01`;
    console.log(`1. Inserting test student with LRN: ${testLRN} (length: ${testLRN.length})\n`);

    const [result] = await conn.query(
      `INSERT INTO students (lrn, first_name, last_name, age, sex, grade_level, section, student_email, password, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [testLRN, 'Matthew', 'Alacre', 10, 'Male', 'Grade 3', 'Diligence', 'matthew.alacre@wmsu.edu.ph', 'temp123', 'Active']
    );

    console.log(`✅ Inserted! Affected rows: ${result.affectedRows}\n`);

    // Verify retrieval
    const [students] = await conn.query(`
      SELECT id, lrn, first_name, last_name, grade_level, section, student_email, status
      FROM students 
      WHERE lrn = ?
    `, [testLRN]);

    if (students.length === 0) {
      console.log('❌ Error: Student not found after insertion!');
      await conn.end();
      return;
    }

    const student = students[0];
    console.log('✅ Retrieved student:');
    console.log(`   LRN: ${student.lrn}`);
    console.log(`   Name: ${student.first_name} ${student.last_name}`);
    console.log(`   Grade: ${student.grade_level} - ${student.section}`);
    console.log(`   Email: ${student.student_email}`);
    console.log(`   Status: ${student.status}\n`);

    // Clean up
    await conn.query('DELETE FROM students WHERE lrn = ?', [testLRN]);
    console.log('✅ Test record cleaned up\n');

    await conn.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

testBulkImportFlow();
