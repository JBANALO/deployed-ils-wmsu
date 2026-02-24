#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function main() {
  // Find and parse .env
  let envPath = path.join(__dirname, 'server', '.env');
  if (!fs.existsSync(envPath)) {
    envPath = path.join(__dirname, '.env');
  }
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const dbUrlMatch = envContent.match(/DATABASE_URL=([^\n]+)/);
  
  if (!dbUrlMatch) {
    console.error('❌ DATABASE_URL not found in .env');
    process.exit(1);
  }

  const databaseUrl = dbUrlMatch[1].trim();
  const urlObj = new URL(databaseUrl);

  const connectionConfig = {
    host: urlObj.hostname,
    port: parseInt(urlObj.port),
    user: urlObj.username,
    password: urlObj.password,
    database: urlObj.pathname.slice(1)
  };

  console.log('\n📚 Direct Railway Database Import\n');
  console.log('🔌 Connecting to Railway MySQL...');
  console.log(`   Host: ${connectionConfig.host}:${connectionConfig.port}`);
  console.log(`   Database: ${connectionConfig.database}`);
  
  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);
    console.log('✅ Connected to Railway MySQL!\n');
    
    // Load students from JSON
    const jsonPath = path.join(__dirname, 'data', 'students.json');
    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    const jsonStudents = JSON.parse(jsonContent);
    
    console.log(`📖 Loaded ${jsonStudents.length} students from students.json\n`);
    
    let imported = 0;
    let updated = 0;
    let errors = 0;
    
    // Process each student
    for (let i = 0; i < jsonStudents.length; i++) {
      const student = jsonStudents[i];
      
      try {
        const studentId = student.id || uuidv4();
        const firstNameStr = String(student.firstName || '');
        const lastNameStr = String(student.lastName || '');
        const fullName = student.fullName || `${firstNameStr} ${lastNameStr}`;
        
        // Check if student exists
        const [existingRows] = await connection.execute(
          'SELECT id FROM students WHERE full_name = ? LIMIT 1',
          [fullName]
        );
        
        // Handle LRN - use short version or generated ID if too long
        let lrnValue = null;
        if (student.lrn) {
          const lrnStr = String(student.lrn);
          if (lrnStr.length <= 12) {
            lrnValue = lrnStr;
          } else {
            // Use last 12 digits of the LRN
            lrnValue = lrnStr.slice(-12);
          }
        } else {
          // Generate a short LRN from UUID
          lrnValue = uuidv4().substring(0, 12);
        }
        
        const qrCode = student.qrCode || null;
        const profilePic = student.profilePic || null;
        const contact = String(student.contact || '');
        
        if (existingRows && existingRows.length > 0) {
          // Update existing
          await connection.execute(
            'UPDATE students SET lrn = ?, qr_code = ?, profile_pic = ?, contact = ? WHERE full_name = ?',
            [lrnValue, qrCode, profilePic, contact, fullName]
          );
          updated++;
        } else {
          // Insert new student
          const email = `${firstNameStr.toLowerCase().replace(/\s+/g, '')}${lastNameStr.toLowerCase().replace(/\s+/g, '')}@student.wmsu.edu.ph`;
          
          await connection.execute(
            `INSERT INTO students (
              id, lrn, first_name, middle_name, last_name, full_name,
              grade_level, section, sex, age, wmsu_email, password, status,
              qr_code, profile_pic, contact, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              studentId,
              lrnValue,
              firstNameStr,
              String(student.middleName || ''),
              lastNameStr,
              fullName,
              student.gradeLevel || 'Grade 3',
              student.section || 'Wisdom',
              student.sex || 'Not Specified',
              student.age || 10,
              email,
              'TempPassword123!',
              'Active',
              qrCode,
              profilePic,
              contact
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
    const [[totalCount]] = await connection.execute('SELECT COUNT(*) as count FROM students');
    const [[qrCount]] = await connection.execute(
      'SELECT COUNT(*) as count FROM students WHERE qr_code IS NOT NULL AND qr_code != ""'
    );
    
    console.log(`\n📊 Database Status:`);
    console.log(`   ✓ Total students in DB: ${totalCount.count}`);
    console.log(`   ✓ With QR codes: ${qrCount.count}`);
    
    if (imported > 0 || updated > 0) {
      console.log('\n🎉 Success! Students imported with QR codes!');
    }
    
    await connection.end();
    process.exit(errors > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (connection) {
      try {
        await connection.end();
      } catch (e) {
        // Ignore
      }
    }
    process.exit(1);
  }
}

main();
