#!/usr/bin/env node
/**
 * Diagnostic script to check database state for adviser assignment issues
 */
require('dotenv').config();
const pool = require('./backend/server/config/db');

async function diagnose() {
  try {
    console.log('\n=== DATABASE DIAGNOSTIC ===\n');

    // 1. Check classes tables
    console.log('1. CHECK CLASSES TABLE:');
    try {
      const [classes] = await pool.query('SELECT id, grade, section, adviser_id, adviser_name FROM classes ORDER BY grade, section');
      console.log(`   Found ${classes.length} classes:`);
      classes.forEach(c => console.log(`   - ${c.id}: ${c.grade} - ${c.section} (adviser: ${c.adviser_name || 'NONE'})`));
    } catch (err) {
      console.log(`   ❌ Error:`, err.message);
    }

    // 2. Check if users table has teachers/advisers
    console.log('\n2. CHECK TEACHERS/ADVISERS IN USERS TABLE:');
    try {
      const [advisers] = await pool.query('SELECT id, first_name, last_name, role FROM users WHERE role IN ("teacher", "adviser", "Teacher", "Adviser") LIMIT 5');
      console.log(`   Found ${advisers.length} adviser/teacher users:`);
      advisers.forEach(a => console.log(`   - ${a.id}: ${a.first_name} ${a.last_name} (role: ${a.role})`));
    } catch (err) {
      console.log(`   ❌ Error:`, err.message);
    }

    // 3. Check grades/sections from students table
    console.log('\n3. CHECK GRADES/SECTIONS FROM STUDENTS:');
    try {
      const [result] = await pool.query('SELECT DISTINCT grade_level, section, COUNT(*) as count FROM students GROUP BY grade_level, section ORDER BY grade_level, section');
      result.forEach(r => console.log(`   - ${r.grade_level} - ${r.section}: ${r.count} students`));
    } catch (err) {
      console.log(`   ❌ Error:`, err.message);
    }

    // 4. Check if there's a mismatch (students but no class)
    console.log('\n4. CHECK FOR MISMATCHED GRADES:');
    try {
      const [students] = await pool.query('SELECT DISTINCT grade_level, section FROM students ORDER BY grade_level, section');
      const [classesDb] = await pool.query('SELECT id, grade, section FROM classes');
      
      const studentGrades = students.map(s => ({ grade: s.grade_level, section: s.section }));
      const dbGrades = classesDb.map(c => ({ 
        grade: c.grade, 
        section: c.section, 
        id: c.id 
      }));
      
      console.log('\n   Students but NO class:');
      let found = false;
      studentGrades.forEach(sg => {
        const match = dbGrades.find(dg => dg.grade === sg.grade && dg.section === sg.section);
        if (!match) {
          console.log(`   ❌ ${sg.grade} - ${sg.section} (MISSING CLASS!)`);
          found = true;
        }
      });
      if (!found) console.log('   ✅ All student grades have matching classes');
    } catch (err) {
      console.log(`   ❌ Error:`, err.message);
    }

    // 5. Test the exact assignment flow
    console.log('\n5. TEST ASSIGNMENT FLOW:');
    console.log('   Testing what the frontend would send...');
    
    try {
      // Assume we're assigning to grade-3-wisdom  
      const testClassId = 'grade-3-wisdom';
      const [[testClass]] = await pool.query(
        'SELECT id, grade, section FROM classes WHERE id = ?',
        [testClassId]
      );
      
      if (testClass) {
        console.log(`   ✅ Class found: ${testClassId}`);
        console.log(`      Grade: ${testClass.grade}, Section: ${testClass.section}`);
      } else {
        console.log(`   ❌ Class NOT FOUND: ${testClassId}`);
      }
    } catch (err) {
      console.log(`   ❌ Error:`, err.message);
    }

    console.log('\n=== END DIAGNOSTIC ===\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

diagnose();
