#!/usr/bin/env node
require('dotenv').config();
const pool = require('./backend/server/config/db');

async function verify() {
  try {
    console.log('\n=== VERIFYING ADVISER ASSIGNMENT FIX ===\n');

    // Check if Heidi is in database
    console.log('1. Checking if Heidi Lynn Rubia is in database...');
    const [[heidi]] = await pool.query(
      'SELECT id, first_name, last_name FROM users WHERE first_name LIKE "%Heidi%"'
    );
    
    if (heidi) {
      console.log(`   ✅ Found: ${heidi.first_name} ${heidi.last_name}`);
      console.log(`   ID: ${heidi.id}`);
    } else {
      console.log('   ❌ Heidi NOT found in database');
    }

    // Check total teachers
    console.log('\n2. Checking total teachers/advisers in database...');
    const [[countResult]] = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE role IN ("adviser", "teacher")'
    );
    console.log(`   Found: ${countResult.count} teachers/advisers`);

    // List all teachers
    if (countResult.count > 0) {
      const [teachers] = await pool.query(
        'SELECT id, first_name, last_name, role FROM users WHERE role IN ("adviser", "teacher") ORDER BY first_name'
      );
      console.log('\n3. All teachers in database:');
      teachers.forEach(t => console.log(`   - ${t.first_name} ${t.last_name} (${t.role})`));
    }

    // Check Grade 3 Wisdom class
    console.log('\n4. Checking Grade 3 - Wisdom class...');
    const [[classData]] = await pool.query(
      'SELECT id, grade, section, adviser_id, adviser_name FROM classes WHERE id = "grade-3-wisdom"'
    );
    
    if (classData) {
      console.log(`   ✅ Class found: ${classData.grade} - ${classData.section}`);
      console.log(`   Current adviser_id: ${classData.adviser_id || 'NONE'}`);
      console.log(`   Current adviser_name: ${classData.adviser_name || 'NONE'}`);
    } else {
      console.log('   ❌ Grade 3 - Wisdom not found');
    }

    // Test assignment to database
    if (heidi && classData) {
      console.log('\n5. Testing assignment...');
      console.log(`   Would assign: ${heidi.first_name} ${heidi.last_name} to ${classData.grade} - ${classData.section}`);
      
      const [result] = await pool.query(
        'UPDATE classes SET adviser_id = ?, adviser_name = ? WHERE id = ?',
        [heidi.id, `${heidi.first_name} ${heidi.last_name}`, 'grade-3-wisdom']
      );
      
      if (result.affectedRows > 0) {
        console.log('   ✅ UPDATE successful - adviser assigned!');
        
        // Verify it was saved
        const [[verify]] = await pool.query(
          'SELECT adviser_id, adviser_name FROM classes WHERE id = "grade-3-wisdom"'
        );
        console.log(`   Verification: adviser_name = ${verify.adviser_name}`);
      } else {
        console.log('   ❌ UPDATE failed - no rows affected');
      }
    }

    console.log('\n=== END VERIFICATION ===\n');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

verify();
