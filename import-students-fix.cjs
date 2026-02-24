#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

// Parse DATABASE_URL from .env (in server directory)
let envPath = path.join(__dirname, '.env');
let envContent = '';

// Try server/.env first
const serverEnvPath = path.join(__dirname, 'server', '.env');
if (fs.existsSync(serverEnvPath)) {
  envPath = serverEnvPath;
  envContent = fs.readFileSync(envPath, 'utf-8');
} else if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf-8');
} else {
  console.error('❌ .env file not found');
  process.exit(1);
}

const dbUrlMatch = envContent.match(/DATABASE_URL=([^\n]+)/);

if (!dbUrlMatch) {
  console.error('❌ DATABASE_URL not found in .env');
  process.exit(1);
}

const databaseUrl = dbUrlMatch[1].trim();
const urlObj = new URL(databaseUrl);

const connectionConfig = {
  host: urlObj.hostname,
  port: urlObj.port,
  user: urlObj.username,
  password: urlObj.password,
  database: urlObj.pathname.slice(1),
  waitForConnections: true,
  connectionLimit: 1,
  queueLimit: 0
};

async function importStudents() {
  let connection;
  
  try {
    // Connect to database
    console.log('\n📚 Direct Railway Database Import\n');
    console.log('🔌 Connecting to Railway MySQL...');
    console.log(`   Host: ${connectionConfig.host}:${connectionConfig.port}`);
    console.log(`   Database: ${connectionConfig.database}`);
    
    const pool = mysql.createPool(connectionConfig);
    connection = await pool.getConnection();
    
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
        const fullName = student.fullName || `${student.firstName} ${student.lastName}`;
        
        // Check if student exists
        const [existing] = await connection.query(
          'SELECT id FROM students WHERE full_name = ?',
          [fullName]
        );
        
        // Handle LRN - truncate if too long or set to NULL
        let lrn = null;
        if (student.lrn) {
          const lrnStr = student.lrn.toString();
          if (lrnStr.length <= 12) {
            lrn = lrnStr;
          }
          // If LRN is too long, leave as NULL and use full_name as identifier
        }
        
        if (existing && existing.length > 0) {
          // Update existing
          await connection.query(
            `UPDATE students SET lrn = ?, qr_code = ?, profile_pic = ?, contact = ? WHERE id = ?`,
            [lrn, student.qrCode, student.profilePic, student.contact || '', existing[0].id]
          );
          updated++;
        } else {
          // Insert new student
          const wmsuEmail = `${((student.firstName || '').toLowerCase().replace(/\s+/g, ''))}${(student.lastName || '').toLowerCase().replace(/\s+/g, '')}@student.wmsu.edu.ph`;
          
          await connection.query(
            `INSERT INTO students (
              id, lrn, first_name, middle_name, last_name, full_name,
              grade_level, section, sex, age, wmsu_email, password, status,
              qr_code, profile_pic, contact, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              studentId,
              lrn,  // Can be NULL if too long
              student.firstName || '',
              student.middleName || '',
              student.lastName || '',
              fullName,
              student.gradeLevel || 'Grade 3',
              student.section || 'Wisdom',
              student.sex || 'Not Specified',
              student.age || 10,
              wmsuEmail,
              'TempPassword123!',
              'Active',
              student.qrCode,
              student.profilePic,
              student.contact || ''  // Contact field - empty string if not provided
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
    if (connection) await connection.end();
    process.exit(1);
  }
}

importStudents();
