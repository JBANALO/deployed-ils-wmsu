#!/usr/bin/env node
/**
 * Direct QR Code Sync to Railway Database
 * This script generates QR codes from students.json and syncs to the database
 * Works both locally and on Railway
 * 
 * Run: node sync-qr-to-railway.cjs
 */

const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

// Try to use mysql2 to connect to database directly
let mysql;
try {
  mysql = require('mysql2/promise');
} catch (e) {
  console.log('⚠️  mysql2 not available, skipping database sync');
  mysql = null;
}

async function syncQRCodes() {
  try {
    console.log('🔄 QR Code Sync to Database\n');

    // Read students.json
    const studentsPath = path.join(__dirname, './data/students.json');
    if (!fs.existsSync(studentsPath)) {
      console.error('❌ students.json not found at:', studentsPath);
      process.exit(1);
    }

    const studentsData = fs.readFileSync(studentsPath, 'utf8');
    const students = JSON.parse(studentsData);
    console.log(`📖 Loaded ${students.length} students from students.json`);

    // Generate QR codes for students missing them
    let qrGenerated = 0;
    for (let i = 0; i < students.length; i++) {
      const student = students[i];

      if (!student.qrCode && student.lrn) {
        try {
          const qrData = JSON.stringify({
            lrn: student.lrn,
            name: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
            gradeLevel: student.gradeLevel,
            section: student.section
          });

          student.qrCode = await QRCode.toDataURL(qrData, {
            width: 300,
            margin: 2,
            errorCorrectionLevel: 'H'
          });
          qrGenerated++;

          if ((i + 1) % 50 === 0) {
            console.log(`  ✓ Generated ${i + 1}/${students.length} QR codes...`);
          }
        } catch (err) {
          console.error(`  ❌ Error for ${student.firstName}:`, err.message);
        }
      }
    }

    console.log(`\n✅ Generated ${qrGenerated} missing QR codes`);

    // Save updated JSON
    fs.writeFileSync(studentsPath, JSON.stringify(students, null, 2));
    console.log(`✅ Updated students.json with QR codes`);

    // Try to sync to database if mysql is available
    if (mysql && process.env.DB_HOST) {
      await syncToDB(students);
    } else {
      console.log(`\n⚠️  Database sync skipped (mysql2 not available or DB_HOST not set)`);
      console.log(`    - QR codes are now in students.json`);
      console.log(`    - On Railway, they will sync on next server startup`);
    }

    console.log('\n🎉 Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

async function syncToDB(students) {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'wmsu_ed',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  const connection = await pool.getConnection();
  console.log(`\n🗄️  Connected to database: ${process.env.DB_HOST}`);

  let synced = 0;
  for (const student of students) {
    if (!student.qrCode) continue;

    try {
      const result = await connection.query(
        'UPDATE students SET qr_code = ? WHERE lrn = ?',
        [student.qrCode, student.lrn]
      );
      if (result[0].affectedRows > 0) {
        synced++;
      }
    } catch (err) {
      // Skip if update fails (student might not exist yet)
    }
  }

  connection.release();
  await pool.end();

  console.log(`✅ Synced ${synced} QR codes to database`);
}

syncQRCodes();
