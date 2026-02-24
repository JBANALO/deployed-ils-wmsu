#!/usr/bin/env node
/**
 * Bulk Import Students from students.json to Database
 * This script imports/updates all students from students.json into the students table
 * Matches by name and creates missing students
 * 
 * Run: node bulk-import-students.cjs
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

// Import database query function
const { query } = require('./server/config/database');

async function bulkImportStudents() {
  try {
    console.log('\n📚 Bulk Importing Students from students.json\n');

    // Read students.json
    const studentsPath = path.join(__dirname, './data/students.json');
    if (!fs.existsSync(studentsPath)) {
      console.error('❌ students.json not found');
      process.exit(1);
    }

    const data = fs.readFileSync(studentsPath, 'utf8');
    const jsonStudents = JSON.parse(data);
    console.log(`📖 Loaded ${jsonStudents.length} students from students.json\n`);

    let imported = 0;
    let updated = 0;
    let errors = 0;

    for (let i = 0; i < jsonStudents.length; i++) {
      const student = jsonStudents[i];

      try {
        const studentId = uuidv4();
        const fullName = `${student.firstName || ''} ${student.middleName || ''} ${student.lastName || ''}`.trim();

        // Try to find existing student by full name
        const existing = await query(
          'SELECT id FROM students WHERE full_name = ? LIMIT 1',
          [fullName]
        );

        if (existing && existing.length > 0) {
          // Update existing student
          await query(
            `UPDATE students SET 
              lrn = ?, 
              first_name = ?, 
              middle_name = ?, 
              last_name = ?,
              full_name = ?,
              grade_level = ?,
              section = ?,
              qr_code = ?,
              profile_pic = ?
            WHERE id = ?`,
            [
              student.lrn,
              student.firstName,
              student.middleName || '',
              student.lastName,
              fullName,
              student.gradeLevel,
              student.section,
              student.qrCode,
              student.profilePic,
              existing[0].id
            ]
          );
          updated++;
        } else {
          // Insert new student
          await query(
            `INSERT INTO students (
              id, lrn, first_name, middle_name, last_name, full_name,
              grade_level, section, sex, age, wmsu_email, password, status,
              qr_code, profile_pic, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              studentId,
              student.lrn,
              student.firstName,
              student.middleName || '',
              student.lastName,
              fullName,
              student.gradeLevel || 'Grade 3',
              student.section || 'Wisdom',
              student.sex || 'Not Specified',
              student.age || 10,
              `${student.firstName.toLowerCase()}.${student.lastName.toLowerCase()}@student.wmsu.edu.ph`,
              'TempPassword123!',
              'Active',
              student.qrCode,
              student.profilePic
            ]
          );
          imported++;
        }

        // Progress
        if ((i + 1) % 30 === 0) {
          console.log(`  ✓ Processed ${i + 1}/${jsonStudents.length}...`);
        }
      } catch (err) {
        console.error(`  ❌ Error for ${student.firstName}:`, err.message);
        errors++;
      }
    }

    console.log(`\n✅ Import Complete!`);
    console.log(`   📥 Imported: ${imported}`);
    console.log(`   📝 Updated: ${updated}`);
    console.log(`   ⚠️  Errors: ${errors}`);
    console.log(`\n✨ All students now have QR codes from students.json`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

bulkImportStudents();
