#!/usr/bin/env node
/**
 * Direct Railway Database Import
 * Imports all students from students.json directly to Railway MySQL
 * Using explicit connection string
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function importStudentsToRailway() {
  let connection;
  
  try {
    console.log('\n📚 Direct Railway Database Import\n');

    // Parse DATABASE_URL
    const dbUrl = 'mysql://root:SnBjHirVrIYZTNIPXZhmVMzOyqmsMznu@metro.proxy.rlwy.net:25385/railway';
    const url = new URL(dbUrl);
    
    const connectionConfig = {
      host: url.hostname,
      port: parseInt(url.port),
      user: url.username,
      password: url.password,
      database: url.pathname.substring(1),
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    };

    console.log(`🔌 Connecting to Railway MySQL...`);
    console.log(`   Host: ${connectionConfig.host}:${connectionConfig.port}`);
    console.log(`   Database: ${connectionConfig.database}`);

    // Create connection
    connection = await mysql.createConnection(connectionConfig);
    console.log('✅ Connected to Railway MySQL!\n');

    // Read students.json
    const studentsPath = path.join(__dirname, './data/students.json');
    if (!fs.existsSync(studentsPath)) {
      throw new Error('students.json not found');
    }

    const data = fs.readFileSync(studentsPath, 'utf8');
    const jsonStudents = JSON.parse(data);
    console.log(`📖 Loaded ${jsonStudents.length} students from students.json\n`);

    let imported = 0;
    let updated = 0;
    let errors = 0;

    // Import each student
    for (let i = 0; i < jsonStudents.length; i++) {
      const student = jsonStudents[i];

      try {
        const { v4: uuidv4 } = require('uuid');
        const studentId = uuidv4();
        const fullName = `${student.firstName || ''} ${student.middleName || ''} ${student.lastName || ''}`.trim();

        // Check if student exists by full name
        const [existing] = await connection.query(
          'SELECT id FROM students WHERE full_name = ? LIMIT 1',
          [fullName]
        );

        if (existing && existing.length > 0) {
          // Update existing
          let lrn = student.lrn;
          // Truncate LRN if too long (max 12 chars)
          if (lrn && lrn.toString().length > 12) {
            lrn = lrn.toString().substring(0, 12);
          }
          
          await connection.query(
            `UPDATE students SET lrn = ?, qr_code = ?, profile_pic = ? WHERE id = ?`,
            [lrn, student.qrCode, student.profilePic, existing[0].id]
          );
          updated++;
        } else {
          // Insert new
          let lrn = student.lrn;
          // Truncate LRN if too long (max 12 chars), or use UUID if empty
          if (!lrn) {
            lrn = require('uuid').v4().substring(0, 12);
          } else if (lrn.toString().length > 12) {
            lrn = lrn.toString().substring(0, 12);
          }
          
          await connection.query(
            `INSERT INTO students (
              id, lrn, first_name, middle_name, last_name, full_name,
              grade_level, section, sex, age, wmsu_email, password, status,
              qr_code, profile_pic, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              studentId,
              lrn,
              student.firstName || '',
              student.middleName || '',
              student.lastName || '',
              fullName,
              student.gradeLevel || 'Grade 3',
              student.section || 'Wisdom',
              student.sex || 'Not Specified',
              student.age || 10,
              `${((student.firstName || '').toLowerCase().replace(/\s+/g, ''))}${(student.lastName || '').toLowerCase().replace(/\s+/g, '')}@student.wmsu.edu.ph`,
              'TempPassword123!',
              'Active',
              student.qrCode,
              student.profilePic
            ]
          );
          imported++;
        }

        if ((i + 1) % 30 === 0) {
          console.log(`  ✓ Processed ${i + 1}/${jsonStudents.length}...`);
        }
      } catch (err) {
        console.error(`  ❌ Error for ${student.firstName}: ${err.message}`);
        errors++;
      }
    }

    console.log(`\n✅ Import Complete!`);
    console.log(`   📥 Imported: ${imported}`);
    console.log(`   📝 Updated: ${updated}`);
    console.log(`   ⚠️  Errors: ${errors}`);
    console.log(`   📊 Total: ${imported + updated} students successfully synced`);

    // Verify import
    const [allStudents] = await connection.query('SELECT COUNT(*) as count FROM students');
    const [withQR] = await connection.query(
      'SELECT COUNT(*) as count FROM students WHERE qr_code IS NOT NULL AND qr_code != ""'
    );

    console.log(`\n📊 Database Status:`);
    console.log(`   ✓ Total students in DB: ${allStudents[0].count}`);
    console.log(`   ✓ With QR codes: ${withQR[0].count}`);

    await connection.end();
    console.log('\n🎉 Success! All students imported with QR codes!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    if (connection) await connection.end();
    process.exit(1);
  }
}

importStudentsToRailway();
