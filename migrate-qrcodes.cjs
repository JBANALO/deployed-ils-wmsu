#!/usr/bin/env node
/**
 * Migration: Populate QR Codes and Profile Pictures
 * This script generates unique QR codes for all students using their LRN
 * and adds profile picture avatars for attendance tracking
 * 
 * Run: node migrate-qrcodes.cjs
 */

const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const studentsFilePath = path.join(__dirname, 'data/students.json');

async function migrateQRCodes() {
  try {
    console.log('🔄 Students QR Code Migration\n');

    // Read current students
    const studentsData = fs.readFileSync(studentsFilePath, 'utf8');
    const students = JSON.parse(studentsData);
    
    console.log(`📖 Loaded ${students.length} students`);

    // Generate QR codes for each student
    let qrCount = 0;
    let profilePicCount = 0;

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      
      // Generate unique QR code for attendance tracking
      if (!student.qrCode) {
        try {
          const qrData = JSON.stringify({
            lrn: student.lrn,
            name: `${student.firstName} ${student.lastName}`,
            gradeLevel: student.gradeLevel,
            section: student.section,
            timestamp: new Date().toISOString()
          });
          
          student.qrCode = await QRCode.toDataURL(qrData, {
            width: 300,
            margin: 2,
            errorCorrectionLevel: 'H'
          });
          qrCount++;
        } catch (err) {
          console.error(`Error generating QR for ${student.firstName}:`, err.message);
        }
      }

      // Add profile picture if missing
      if (!student.profilePic) {
        student.profilePic = `https://ui-avatars.com/api/?name=${student.firstName}+${student.lastName}&background=random&size=128`;
        profilePicCount++;
      }

      // Show progress
      if ((i + 1) % 20 === 0) {
        console.log(`  ✓ Processed ${i + 1}/${students.length}...`);
      }
    }

    // Save updated students
    fs.writeFileSync(studentsFilePath, JSON.stringify(students, null, 2));
    
    console.log(`\n✅ Migration Complete:`);
    console.log(`   ✓ QR Codes: ${qrCount}/${students.length}`);
    console.log(`   ✓ Profile Pics: ${profilePicCount}/${students.length}`);
    console.log(`   📁 File: ${studentsFilePath}`);
    console.log(`\n✅ All students now have unique QR codes for attendance!`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrateQRCodes();
