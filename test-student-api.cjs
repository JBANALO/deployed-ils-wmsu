#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function testStudentAPI() {
  const config = {
    host: 'metro.proxy.rlwy.net',
    port: 25385,
    user: 'root',
    password: 'SnBjHirVrIYZTNIPXZhmVMzOyqmsMznu',
    database: 'railway'
  };

  try {
    console.log('\n🧪 Test Student Creation\n');
    const conn = await mysql.createConnection(config);

    // Create test student
    const testData = {
      lrn: '999999999999',
      firstName: 'Test',
      lastName: 'Student',
      email: 'test.student@wmsu.edu.ph',
      age: 10,
      sex: 'Male',
      gradeLevel: 'Grade 3',
      section: 'Diligence',
      status: 'Active'
    };

    console.log('Attempting insert with test data:', testData);
    
    const [result] = await conn.query(
      `INSERT INTO students (lrn, first_name, last_name, age, sex, grade_level, section, student_email, password, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [testData.lrn, testData.firstName, testData.lastName, testData.age, testData.sex, testData.gradeLevel, testData.section, testData.email, 'temp123', testData.status]
    );

    console.log(`✅ Insert successful! Affected rows: ${result.affectedRows}`);

    // Verify it was created
    const [rows] = await conn.query('SELECT * FROM students WHERE lrn = ?', [testData.lrn]);
    
    if (rows.length > 0) {
      console.log('\n✅ Verification successful:');
      console.log(`   Name: ${rows[0].first_name} ${rows[0].last_name}`);
      console.log(`   Grade: ${rows[0].grade_level} - ${rows[0].section}`);
      console.log(`   Email: ${rows[0].student_email}`);
      console.log(`   Status: ${rows[0].status}`);
    }

    // Clean up
    await conn.query('DELETE FROM students WHERE lrn = ?', [testData.lrn]);
    console.log('\n✅ Test record cleaned up\n');

    await conn.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

testStudentAPI();
