#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function syncRealQRCodes() {
  const dbUrl = 'REPLACE_ME_DATABASE_URL';
  const urlObj = new URL(dbUrl);

  const config = {
    host: urlObj.hostname,
    port: parseInt(urlObj.port),
    user: urlObj.username,
    password: urlObj.password,
    database: urlObj.pathname.slice(1)
  };

  console.log('\n🔄 Syncing Real QR Code Data to Railway\n');
  console.log('📖 Loading students from students.json...');

  try {
    // Load students from JSON
    const jsonPath = path.join(__dirname, 'data', 'students.json');
    const studentsData = fs.readFileSync(jsonPath, 'utf8');
    const students = JSON.parse(studentsData);

    const withQR = students.filter(s => s.qrCode && s.qrCode.startsWith('data:'));
    console.log(`✓ Found ${withQR.length} students with base64 QR codes\n`);

    // Connect to Railway database
    console.log('🔌 Connecting to Railway MySQL...');
    const connection = await mysql.createConnection(config);
    console.log('✅ Connected!\n');

    let updated = 0;
    let matched = 0;
    let skipped = 0;

    // Process students by LRN first, then by name if not found
    for (let i = 0; i < withQR.length; i++) {
      const student = withQR[i];
      const qrBase64 = student.qrCode;

      try {
        // Try to match by LRN first
        let result = await connection.query(
          'UPDATE students SET qr_code = ? WHERE lrn = ?',
          [qrBase64, student.lrn]
        );

        if (result[0].affectedRows > 0) {
          updated++;
          matched++;
        } else {
          // Try to match by first and last name
          result = await connection.query(
            'UPDATE students SET qr_code = ? WHERE first_name = ? AND last_name = ?',
            [qrBase64, student.firstName, student.lastName]
          );
          
          if (result[0].affectedRows > 0) {
            updated++;
          } else {
            skipped++;
          }
        }

        if ((updated + skipped) % 10 === 0) {
          console.log(`   Progress: ${updated + skipped}/${withQR.length} (${updated} updated)`);
        }
      } catch (err) {
        console.error(`   ✗ Error updating ${student.firstName}:`, err.message);
        skipped++;
      }
    }

    await connection.end();

    console.log(`\n✅ QR Code Sync Complete!`);
    console.log(`   📊 Processed: ${updated + skipped}/${withQR.length}`);
    console.log(`   ✓ Updated: ${updated}`);
    console.log(`   ✗ No match: ${skipped}\n`);

    if (updated > 0) {
      console.log('🎉 QR codes updated! Mobile app can now scan students!');
    }

  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    process.exit(1);
  }
}

syncRealQRCodes();
