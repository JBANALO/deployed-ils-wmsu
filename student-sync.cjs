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
  const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
  
  if (!dbUrlMatch) {
    console.error('❌ DATABASE_URL not found in .env');
    process.exit(1);
  }

  const databaseUrl = dbUrlMatch[1].trim();
  const urlObj = new URL(databaseUrl);

  console.log('\n📚 Student & QR Code Sync to Railway\n');
  console.log('🔌 Connecting to Railway MySQL...');
  
  let connection;
  try {
    connection = await mysql.createConnection({
      host: urlObj.hostname,
      port: parseInt(urlObj.port),
      user: urlObj.username,
      password: urlObj.password,
      database: urlObj.pathname.slice(1)
    });
    
    console.log(`   ✓ Connected to ${urlObj.hostname}:${urlObj.port}\n`);
    
    // Load students from JSON
    const jsonPath = path.join(__dirname, 'data', 'students.json');
    const jsonStudents = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    
    console.log(`📖 Loaded ${jsonStudents.length} students from JSON\n`);
    
    let imported = 0;
    let updated = 0;
    let errors = 0;
    
    // Process each student
    for (let i = 0; i < jsonStudents.length; i++) {
      try {
        const student = jsonStudents[i];
        const id = student.id || uuidv4();
        const first = String(student.firstName || '').trim();
        const last = String(student.lastName || '').trim();
        const full = student.fullName || `${first} ${last}`.trim();
        
        // Prepare LRN - always provide a value
        let lrn = undefined;
        if (student.lrn) {
          const lrnStr = String(student.lrn);
          lrn = lrnStr.length <= 12 ? lrnStr : lrnStr.slice(-12);
        } else {
          lrn = uuidv4().substring(0, 12);
        }
        
        // Check if exists
        const [rows] = await connection.execute(
          'SELECT id FROM students WHERE full_name = ? LIMIT 1',
          [full]
        );
        
        if (rows.length > 0) {
          // Update
          await connection.execute(
            'UPDATE students SET lrn = ?, qr_code = ?, profile_pic = ?, contact = ? WHERE full_name = ?',
            [
              lrn,
              student.qrCode || null,
              student.profilePic || null,
              student.contact || '',
              full
            ]
          );
          updated++;
        } else {
          // Insert
          const email = `${first.toLowerCase().replace(/\s+/g, '')}${last.toLowerCase().replace(/\s+/g, '')}@student.wmsu.edu.ph`;
          
          await connection.execute(
            `INSERT INTO students (id, lrn, first_name, middle_name, last_name, full_name, grade_level, section, sex, age, wmsu_email, password, status, qr_code, profile_pic, contact, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              id,
              lrn,
              first,
              String(student.middleName || ''),
              last,
              full,
              student.gradeLevel || 'Grade 3',
              student.section || 'Wisdom',
              student.sex || 'Not Specified',
              student.age || 10,
              email,
              'TempPassword123!',
              'Active',
              student.qrCode || null,
              student.profilePic || null,
              student.contact || ''
            ]
          );
          imported++;
        }
        
        if ((i + 1) % 50 === 0) {
          console.log(`  ✓ Processed ${i + 1}/167...`);
        }
      } catch (err) {
        console.error(`  ❌ ${student.firstName}: ${err.message}`);
        errors++;
      }
    }
    
    console.log(`\n✅ Sync Complete!`);
    console.log(`   📥 Imported: ${imported}`);
    console.log(`   📝 Updated: ${updated}`);
    console.log(`   ⚠️  Errors: ${errors}`);
    
    // Verify
    const [[total]] = await connection.execute('SELECT COUNT(*) as count FROM students');
    const [[withQR]] = await connection.execute('SELECT COUNT(*) as count FROM students WHERE qr_code IS NOT NULL AND qr_code != ""');
    
    console.log(`\n📊 Database Status:`);
    console.log(`   ✓ Total students: ${total.count}`);
    console.log(`   ✓ With QR codes: ${withQR.count}`);
    
    if (imported + updated > 0) {
      console.log(`\n🎉 Successfully synced ${imported + updated} students!`);
    }
    
    await connection.end();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (connection) try { await connection.end(); } catch (e) {}
    process.exit(1);
  }
}

main();
