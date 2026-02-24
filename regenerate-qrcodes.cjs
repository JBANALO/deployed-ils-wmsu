#!/usr/bin/env node
/**
 * Script: Regenerate QR Codes in Database
 * Generates QR codes for all students in the database
 * Run: node regenerate-qrcodes.cjs
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const QRCode = require('qrcode');

async function regenerateQRCodes() {
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

  try {
    console.log('🔄 Regenerating QR Codes in Database...\n');

    const connection = await pool.getConnection();
    console.log('✅ Connected to database\n');

    // Get all students without QR codes
    const [studentsWithoutQR] = await connection.query(
      `SELECT id, lrn, first_name, last_name, full_name, grade_level, section 
       FROM students 
       WHERE qr_code IS NULL OR qr_code = ''
       ORDER BY full_name ASC`
    );

    console.log(`📖 Found ${studentsWithoutQR.length} students without QR codes\n`);

    if (studentsWithoutQR.length === 0) {
      console.log('✅ All students already have QR codes!');
      connection.release();
      await pool.end();
      return;
    }

    // Generate QR codes for each student
    let updated = 0;
    for (let i = 0; i < studentsWithoutQR.length; i++) {
      const student = studentsWithoutQR[i];
      
      try {
        // Create QR data
        const qrData = JSON.stringify({
          lrn: student.lrn,
          name: student.full_name,
          gradeLevel: student.grade_level,
          section: student.section
        });

        // Generate QR code as data URL
        const qrCode = await QRCode.toDataURL(qrData, {
          width: 300,
          margin: 2,
          errorCorrectionLevel: 'H'
        });

        // Update student record
        await connection.query(
          'UPDATE students SET qr_code = ? WHERE id = ?',
          [qrCode, student.id]
        );

        updated++;

        // Progress indicator
        if ((i + 1) % 10 === 0) {
          console.log(`  ✓ Generated ${i + 1}/${studentsWithoutQR.length} QR codes...`);
        }
      } catch (err) {
        console.error(`  ❌ Error for ${student.full_name}:`, err.message);
      }
    }

    console.log(`\n✅ QR Code Generation Complete!`);
    console.log(`   ✓ Updated: ${updated}/${studentsWithoutQR.length} students`);

    // Also check for students with NULL or empty QR codes and regenerate all
    const [allStudents] = await connection.query('SELECT COUNT(*) as count FROM students');
    console.log(`\n📊 Database Status:`);
    console.log(`   ✓ Total students: ${allStudents[0].count}`);
    
    const [qrCount] = await connection.query(
      'SELECT COUNT(*) as count FROM students WHERE qr_code IS NOT NULL AND qr_code != ""'
    );
    console.log(`   ✓ With QR codes: ${qrCount[0].count}`);

    connection.release();
    await pool.end();
    console.log('\n🎉 Done!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

regenerateQRCodes();
