#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const studentsFilePath = path.join(__dirname, './data/students.json');

async function syncStudentDataToDatabase() {
  try {
    // Read students from JSON
    const studentsData = fs.readFileSync(studentsFilePath, 'utf8');
    const students = JSON.parse(studentsData);
    
    console.log(`📖 Loaded ${students.length} students from students.json`);

    // Import after we know the file exists
    const mysql = require('mysql2/promise');

    // Connect to database
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

    let connection;
    try {
      connection = await pool.getConnection();
      console.log('✅ Connected to database\n');
    } catch (err) {
      console.log('⚠️  Database not available. Skipping database sync.');
      console.log('   (This is normal for development - QR codes are in students.json)\n');
      pool.end();
      return;
    }

    let qrUpdated = 0;
    let qrSkipped = 0;
    let picUpdated = 0;
    let picSkipped = 0;

    console.log('🔄 Syncing QR Codes...');
    // Update QR codes
    for (const student of students) {
      if (!student.qrCode) {
        qrSkipped++;
        continue;
      }

      try {
        const result = await connection.query(
          'UPDATE students SET qr_code = ? WHERE lrn = ?',
          [student.qrCode, student.lrn]
        );

        if (result[0].affectedRows > 0) {
          qrUpdated++;
        }
      } catch (err) {
        console.error(`❌ Error updating QR for ${student.firstName}:`, err.message);
      }
    }

    console.log(`✅ QR Codes synced: ${qrUpdated} updated, ${qrSkipped} skipped\n`);

    console.log('🔄 Syncing Profile Pictures...');
    // Update profile pictures
    for (const student of students) {
      if (!student.profilePic) {
        picSkipped++;
        continue;
      }

      try {
        const result = await connection.query(
          'UPDATE students SET profile_pic = ? WHERE lrn = ?',
          [student.profilePic, student.lrn]
        );

        if (result[0].affectedRows > 0) {
          picUpdated++;
        }
      } catch (err) {
        console.error(`❌ Error updating profile pic for ${student.firstName}:`, err.message);
      }
    }

    console.log(`✅ Profile pictures synced: ${picUpdated} updated, ${picSkipped} skipped\n`);

    connection.release();
    await pool.end();

    console.log('📊 SYNC COMPLETE:');
    console.log(`   ✓ QR Codes: ${qrUpdated}/${students.length}`);
    console.log(`   ✓ Profile Pics: ${picUpdated}/${students.length}`);

  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    process.exit(1);
  }
}

syncStudentDataToDatabase();
