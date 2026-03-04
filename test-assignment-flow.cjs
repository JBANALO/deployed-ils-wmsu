#!/usr/bin/env node
/**
 * Test the full assignment flow exactly as the frontend would do it
 */
require('dotenv').config();
const pool = require('./backend/server/config/db');

async function testAssignmentFlow() {
  try {
    console.log('\n=== TESTING FULL ASSIGNMENT FLOW ===\n');

    // 1. Fetch classes (like frontend does with GET /api/classes)
    console.log('1. Fetching classes...');
    const [classes] = await pool.query(
      `SELECT DISTINCT c.*, 
              GROUP_CONCAT(DISTINCT st.subject ORDER BY st.subject) as subjects
       FROM classes c
       LEFT JOIN subject_teachers st ON c.id = st.class_id
       GROUP BY c.id
       ORDER BY c.grade, c.section`
    );
    
    const grade3Wisdom = classes.find(c => c.id === 'grade-3-wisdom');
    console.log(`   Found Grade 3 - Wisdom: ${grade3Wisdom ? '✅' : '❌'}`);
    console.log(`   Current adviser_name: ${grade3Wisdom?.adviser_name || 'NONE'}`);

    // 2. Fetch teachers (like frontend does with GET /api/teachers)
    console.log('\n2. Fetching teachers...');
    const [teachers] = await pool.query(
      `SELECT id, first_name, last_name, email, role FROM users 
       WHERE role IN ('teacher', 'adviser', 'subject_teacher') 
       ORDER BY first_name, last_name`
    );
    
    const heidi = teachers.find(t => t.first_name === 'Heidi Lynn');
    console.log(`   Found Heidi: ${heidi ? '✅' : '❌'}`);
    console.log(`   Heidi ID: ${heidi?.id}`);

    // 3. Prepare assignment data (what frontend sends)
    console.log('\n3. Preparing assignment request...');
    const assignmentData = {
      classId: 'grade-3-wisdom',
      adviser_id: heidi.id,
      adviser_name: `${heidi.first_name} ${heidi.last_name}`,
      grade: grade3Wisdom.grade,
      section: grade3Wisdom.section
    };
    console.log('   Request body:', JSON.stringify(assignmentData, null, 2));

    // 4. Simulate the PUT endpoint (what happens on backend)
    console.log('\n4. Executing assignment (PUT /classes/:classId/assign)...');
    
    // Check if class exists
    const [[existingClass]] = await pool.query(
      'SELECT id, grade, section FROM classes WHERE id = ?',
      [assignmentData.classId]
    );

    if (!existingClass) {
      console.log('   ❌ Class not found');
      return;
    }

    console.log(`   ✓ Class exists: ${existingClass.grade} - ${existingClass.section}`);

    // Update the class
    const [classResult] = await pool.query(
      'UPDATE classes SET adviser_id = ?, adviser_name = ? WHERE id = ?',
      [assignmentData.adviser_id, assignmentData.adviser_name, assignmentData.classId]
    );

    console.log(`   ✓ Database UPDATE result: ${classResult.affectedRows} rows affected`);

    if (classResult.affectedRows === 0) {
      console.log('   ❌ Update failed!');
      return;
    }

    // Try to update adviser's record too
    try {
      const [userResult] = await pool.query(
        'UPDATE users SET grade_level = ?, section = ? WHERE id = ?',
        [assignmentData.grade, assignmentData.section, assignmentData.adviser_id]
      );
      console.log(`   ✓ Adviser record updated: ${userResult.affectedRows} rows affected`);
    } catch (err) {
      console.log(`   ℹ️  Adviser record update failed (non-critical): ${err.message}`);
    }

    // Verify the update
    const [[verifyClass]] = await pool.query(
      'SELECT adviser_id, adviser_name FROM classes WHERE id = ?',
      [assignmentData.classId]
    );

    console.log(`\n5. Verification (what frontend would fetch with GET /api/classes):`);
    console.log(`   adviser_id: ${verifyClass.adviser_id}`);
    console.log(`   adviser_name: ${verifyClass.adviser_name}`);

    if (verifyClass.adviser_name === assignmentData.adviser_name) {
      console.log('\n✅ SUCCESS! Assignment persisted correctly');
      console.log(`   Heidi is now adviser for Grade 3 - Wisdom`);
    } else {
      console.log('\n❌ FAILED! Assignment did not persist');
    }

    console.log('\n=== END TEST ===\n');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testAssignmentFlow();
