#!/usr/bin/env node
/**
 * Create all missing classes in the database
 * Matches all grade levels from students.json
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./backend/server/config/db');

async function createMissingClasses() {
  try {
    console.log('\n=== CREATING MISSING CLASSES ===\n');

    // 1. Read students to find all grade/section combinations
    const studentsPath = path.join(__dirname, './data/students.json');
    const jsonStudents = JSON.parse(fs.readFileSync(studentsPath, 'utf8'));
    
    // Get unique grade/section combinations
    const grades = {};
    jsonStudents.forEach(s => {
      const key = `${s.gradeLevel} - ${s.section}`;
      if (!grades[key]) grades[key] = { grade: s.gradeLevel, section: s.section };
    });

    const uniqueGrades = Object.values(grades);
    console.log(`📖 Found ${uniqueGrades.length} grade/section combinations in students:\n`);

    // 2. Check which classes already exist
    const [existingClasses] = await pool.query('SELECT grade, section FROM classes');
    const existing = new Set(
      existingClasses.map(c => `${c.grade} - ${c.section}`)
    );

    console.log(`✓ Existing classes in database: ${existing.size}`);

    // 3. Insert missing classes
    let created = 0;
    let skipped = 0;

    for (const grade of uniqueGrades) {
      const key = `${grade.grade} - ${grade.section}`;
      
      if (existing.has(key)) {
        console.log(`  ✓ Already exists: ${key}`);
        skipped++;
      } else {
        const classId = `${grade.grade.toLowerCase().replace(/\s+/g, '-')}-${grade.section.toLowerCase().replace(/\s+/g, '-')}`;
        
        try {
          await pool.query(
            'INSERT INTO classes (id, grade, section, createdAt) VALUES (?, ?, ?, NOW())',
            [classId, grade.grade, grade.section]
          );
          console.log(`  ✓ Created: ${key}`);
          created++;
        } catch (err) {
          console.error(`  ❌ Error creating ${key}:`, err.message);
        }
      }
    }

    console.log(`\n✅ CLASS CREATION COMPLETE!`);
    console.log(`   ➕ Created: ${created} new classes`);
    console.log(`   ✓ Already existed: ${skipped} classes`);
    console.log(`   📊 Total classes now: ${existing.size + created}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createMissingClasses();
