#!/usr/bin/env node

const mysql = require('mysql2/promise');
const QRCode = require('qrcode');

async function generateQRCodesForDatabase() {
  const dbUrl = 'REPLACE_ME_DATABASE_URL';
  const urlObj = new URL(dbUrl);

  const config = {
    host: urlObj.hostname,
    port: parseInt(urlObj.port),
    user: urlObj.username,
    password: urlObj.password,
    database: urlObj.pathname.slice(1)
  };

  console.log('\n🔄 Generate Base64 QR Codes for All Students\n');
  console.log('🔌 Connecting to Railway MySQL...');

  try {
    const connection = await mysql.createConnection(config);
    console.log('✅ Connected!\n');

    // Get all students
    const [students] = await connection.query('SELECT * FROM students');
    console.log(`📊 Found ${students.length} students\n`);

    let generated = 0;
    let failed = 0;

    for (let i = 0; i < students.length; i++) {
      const student = students[i];

      try {
        // Generate QR code data with student info
        const qrData = JSON.stringify({
          lrn: student.lrn,
          name: `${student.first_name} ${student.last_name}`,
          gradeLevel: student.grade_level,
          section: student.section,
          timestamp: new Date().toISOString()
        });

        // Generate as base64 data URL
        const qrBase64 = await QRCode.toDataURL(qrData, {
          width: 300,
          margin: 2,
          errorCorrectionLevel: 'H'
        });

        // Update database
        await connection.query(
          'UPDATE students SET qr_code = ? WHERE id = ?',
          [qrBase64, student.id]
        );

        generated++;

        if ((i + 1) % 3 === 0) {
          console.log(`   ✓ Generated ${i + 1}/${students.length} QR codes...`);
        }
      } catch (err) {
        failed++;
        console.error(`   ✗ Error for ${student.first_name}:`, err.message);
      }
    }

    await connection.end();

    console.log(`\n✅ QR Code Generation Complete!`);
    console.log(`   ✓ Generated: ${generated}/${students.length}`);
    console.log(`   ✗ Failed: ${failed}\n`);
    console.log('📱 QR codes now stored as base64 data URLs!');
    console.log('✨ Mobile app can display them directly without file dependencies!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

generateQRCodesForDatabase();
