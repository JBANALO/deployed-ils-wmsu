#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function checkQRData() {
  const dbUrl = 'REPLACE_ME_DATABASE_URL';
  const urlObj = new URL(dbUrl);

  const config = {
    host: urlObj.hostname,
    port: parseInt(urlObj.port),
    user: urlObj.username,
    password: urlObj.password,
    database: urlObj.pathname.slice(1)
  };

  try {
    console.log('\n🔍 Checking QR Code Data Length\n');
    const connection = await mysql.createConnection(config);

    // Get all students with their QR code info
    const [students] = await connection.query(`
      SELECT 
        id, 
        lrn, 
        first_name, 
        last_name,
        LENGTH(qr_code) as qr_length,
        SUBSTRING(qr_code, 1, 50) as qr_preview
      FROM students
    `);

    console.log(`📊 QR Code Status for ${students.length} students:\n`);
    
    students.forEach(s => {
      const hasQR = s.qr_length > 0;
      const status = hasQR ? '✅' : '❌';
      const size = hasQR ? `${Math.round(s.qr_length / 1024)}KB` : 'EMPTY';
      console.log(`${status} ${s.first_name} ${s.last_name} (ID: ${s.id})`);
      console.log(`   QR Code: ${size}`);
      console.log(`   Preview: ${s.qr_preview?.substring(0, 40)}...`);
    });

    const withQR = students.filter(s => s.qr_length > 0);
    console.log(`\n📈 Summary:`);
    console.log(`   Total: ${students.length}`);
    console.log(`   With QR: ${withQR.length} ✅`);
    console.log(`   Without QR: ${students.length - withQR.length} ❌`);

    await connection.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkQRData();
