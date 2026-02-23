#!/usr/bin/env node
/**
 * EMERGENCY FIX: Direct database sync for deployed Railway instance
 * This syncs QR codes and profile pictures directly to the production database
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function syncProductionDatabase() {
  // Railway environment variables
  const DB_HOST = process.env.DB_HOST || process.env.RAILWAY_DB_HOST || 'localhost';
  const DB_PORT = process.env.DB_PORT || process.env.RAILWAY_DB_PORT || 3306;
  const DB_USER = process.env.DB_USER || process.env.RAILWAY_DB_USER || 'root';
  const DB_PASSWORD = process.env.DB_PASSWORD || process.env.RAILWAY_DB_PASSWORD || '';
  const DB_NAME = process.env.DB_NAME || process.env.RAILWAY_DB_NAME || 'wmsu_ed';

  console.log('🚀 Production Database Sync\n');
  console.log('📡 Connecting to:', DB_HOST + ':' + DB_PORT + '/' + DB_NAME);

  try {
    // Read students from JSON
    const studentsPath = path.join(__dirname, './data/students.json');
    if (!fs.existsSync(studentsPath)) {
      console.error('❌ students.json not found at:', studentsPath);
      process.exit(1);
    }

    const studentsData = fs.readFileSync(studentsPath, 'utf8');
    const students = JSON.parse(studentsData);
    console.log(`📖 Loaded ${students.length} students from JSON\n`);

    // Connect to database
    const pool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    const connection = await pool.getConnection();
    console.log('✅ Connected to database\n');

    let qrUpdated = 0, picUpdated = 0, errors = 0;

    console.log('🔄 Syncing data...');
    for (const student of students) {
      try {
        // Update QR Code
        if (student.qrCode) {
          const [qrResult] = await connection.query(
            'UPDATE students SET qr_code = ? WHERE lrn = ? OR first_name = ? AND last_name = ?',
            [student.qrCode, student.lrn, student.firstName, student.lastName]
          );
          if (qrResult.affectedRows > 0) qrUpdated++;
        }

        // Update Profile Picture
        if (student.profilePic) {
          const [picResult] = await connection.query(
            'UPDATE students SET profile_pic = ? WHERE lrn = ? OR first_name = ? AND last_name = ?',
            [student.profilePic, student.lrn, student.firstName, student.lastName]
          );
          if (picResult.affectedRows > 0) picUpdated++;
        }
      } catch (err) {
        errors++;
      }
    }

    connection.release();
    await pool.end();

    console.log(`\n✅ SYNC COMPLETE`);
    console.log(`   QR Codes Updated: ${qrUpdated}/${students.length}`);
    console.log(`   Profile Pics Updated: ${picUpdated}/${students.length}`);
    console.log(`   Errors: ${errors}`);
    console.log(`\n🎉 Database sync finished! QR codes should now appear on web.`);

  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    process.exit(1);
  }
}

syncProductionDatabase();
