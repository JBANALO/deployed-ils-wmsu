// Debug student login for specific LRN
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const testLRN = '260303020154';
  const testPassword = 'WMSU01540000';

  try {
    console.log(`\n=== Checking student with LRN: ${testLRN} ===`);
    
    const [students] = await pool.query(
      `SELECT id, lrn, first_name, last_name, student_email, password, status 
       FROM students WHERE lrn = ?`,
      [testLRN]
    );

    if (students.length === 0) {
      console.log('❌ Student NOT FOUND in database!');
      return;
    }

    const student = students[0];
    console.log('Student found:', {
      id: student.id,
      lrn: student.lrn,
      name: `${student.first_name} ${student.last_name}`,
      email: student.student_email,
      status: student.status,
      password: student.password,
      passwordLength: student.password?.length
    });

    // Check if password is hashed or plain
    const isHashed = student.password?.startsWith('$2');
    console.log('\nPassword is hashed:', isHashed);

    // Try password comparison
    if (isHashed) {
      const match = await bcrypt.compare(testPassword, student.password);
      console.log(`bcrypt.compare("${testPassword}"): ${match ? '✅ MATCH' : '❌ NO MATCH'}`);
    } else {
      const match = testPassword === student.password;
      console.log(`Plain text compare ("${testPassword}" === "${student.password}"): ${match ? '✅ MATCH' : '❌ NO MATCH'}`);
    }

    // Check status
    if (student.status !== 'approved' && student.status !== 'Active') {
      console.log(`\n⚠️ Student status is "${student.status}" - needs to be approved or Active to login!`);
    } else {
      console.log(`\n✅ Student status "${student.status}" is OK for login`);
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
