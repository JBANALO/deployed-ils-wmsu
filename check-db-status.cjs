#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function checkDatabase() {
  const dbUrl = 'mysql://root:SnBjHirVrIYZTNIPXZhmVMzOyqmsMznu@metro.proxy.rlwy.net:25385/railway';
  const urlObj = new URL(dbUrl);

  const config = {
    host: urlObj.hostname,
    port: parseInt(urlObj.port),
    user: urlObj.username,
    password: urlObj.password,
    database: urlObj.pathname.slice(1)
  };

  try {
    console.log('\n🔍 Checking Database Status\n');
    const connection = await mysql.createConnection(config);

    // Check if students table exists
    console.log('📋 Checking tables...');
    const [tables] = await connection.query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?",[config.database]
    );
    console.log(`✓ Found ${tables.length} tables`);
    tables.forEach(t => console.log(`  - ${t.TABLE_NAME}`));

    // Count students
    console.log('\n📊 Student count...');
    const [count] = await connection.query('SELECT COUNT(*) as count FROM students');
    console.log(`✓ Total students: ${count[0].count}`);

    // Get first 3 students (with relevant fields)
    console.log('\n📝 Sample students:');
    const [samples] = await connection.query(
      'SELECT id, lrn, first_name, last_name, qr_code FROM students LIMIT 3'
    );
    
    if (samples.length > 0) {
      samples.forEach(s => {
        console.log(`  ID: ${s.id}`);
        console.log(`  LRN: ${s.lrn}`);
        console.log(`  Name: ${s.first_name} ${s.last_name}`);
        console.log(`  Has QR Code: ${s.qr_code ? 'YES' : 'NO (EMPTY)'}`);
        console.log('---');
      });
    }

    await connection.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkDatabase();
