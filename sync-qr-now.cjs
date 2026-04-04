#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function syncQRCodes() {
  const dbUrl = 'REPLACE_ME_DATABASE_URL';
  const urlObj = new URL(dbUrl);

  const config = {
    host: urlObj.hostname,
    port: parseInt(urlObj.port),
    user: urlObj.username,
    password: urlObj.password,
    database: urlObj.pathname.slice(1)
  };

  console.log('\n🔄 Railway QR Code Sync\n');
  console.log('📖 Loading students from students.json...');

  try {
    // Load students from JSON
    const jsonPath = path.join(__dirname, 'data', 'students.json');
    const studentsData = fs.readFileSync(jsonPath, 'utf8');
    const students = JSON.parse(studentsData);

    const withQR = students.filter(s => s.qrCode);
    console.log(`✓ Found ${withQR.length} students with QR codes\n`);

    // Connect to Railway database
    console.log('🔌 Connecting to Railway MySQL...');
    console.log(`   Host: ${config.host}:${config.port}`);
    console.log(`   Database: ${config.database}\n`);

    const connection = await mysql.createConnection(config);
    console.log('✅ Connected!\n');

    let updated = 0;
    let failed = 0;

    // Update each student
    for (const student of withQR) {
      try {
        const result = await connection.query(
          'UPDATE students SET qr_code = ? WHERE lrn = ?',
          [student.qrCode, student.lrn]
        );

        if (result[0].affectedRows > 0) {
          updated++;
        }

        if (updated % 20 === 0) {
          console.log(`   ✓ Updated ${updated}/${withQR.length} students...`);
        }
      } catch (err) {
        failed++;
        console.error(`   ✗ Error updating ${student.firstName}:`, err.message);
      }
    }

    await connection.end();

    console.log(`\n✅ Sync Complete!`);
    console.log(`   ✓ Updated: ${updated}/${withQR.length} students`);
    console.log(`   ✗ Failed: ${failed}\n`);
    console.log('🛩️ QR codes are now available on the mobile app!');

  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    process.exit(1);
  }
}

syncQRCodes();
