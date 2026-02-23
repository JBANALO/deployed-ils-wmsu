#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const studentsFilePath = path.join(__dirname, './data/students.json');

async function syncQRCodesToDatabase() {
  try {
    // Read students from JSON
    const studentsData = fs.readFileSync(studentsFilePath, 'utf8');
    const students = JSON.parse(studentsData);
    
    console.log(`📖 Loaded ${students.length} students from students.json`);

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

    const connection = await pool.getConnection();
    console.log('✅ Connected to database');

    let updated = 0;
    let skipped = 0;

    // Update each student with QR code
    for (const student of students) {
      if (!student.qrCode) {
        skipped++;
        continue;
      }

      try {
        const result = await connection.query(
          'UPDATE students SET qr_code = ? WHERE lrn = ?',
          [student.qrCode, student.lrn]
        );

        if (result[0].affectedRows > 0) {
          updated++;
          if (updated % 10 === 0) {
            console.log(`  ✓ Updated ${updated} students...`);
          }
        }
      } catch (err) {
        console.error(`❌ Error updating ${student.firstName} ${student.lastName}:`, err.message);
      }
    }

    connection.release();
    await pool.end();

    console.log(`\n📊 Sync Complete:`);
    console.log(`   ✓ Updated: ${updated} students`);
    console.log(`   ⊘ Skipped: ${skipped} students (no QR code)`);
    console.log(`   Total: ${students.length} students`);

  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    process.exit(1);
  }
}

syncQRCodesToDatabase();
