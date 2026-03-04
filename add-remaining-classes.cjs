#!/usr/bin/env node
require('dotenv').config();
const pool = require('./backend/server/config/db');

async function addMissingClasses() {
  try {
    console.log('\n=== ADDING REMAINING MISSING CLASSES ===\n');

    const missingClasses = [
      { id: 'grade-4-courage', grade: 'Grade 4', section: 'Courage' },
      { id: 'grade-5-respect', grade: 'Grade 5', section: 'Respect' },
      { id: 'grade-5-responsibility', grade: 'Grade 5', section: 'Responsibility' },
      { id: 'grade-6-excellence', grade: 'Grade 6', section: 'Excellence' }
    ];

    let created = 0;

    for (const cls of missingClasses) {
      try {
        await pool.query(
          'INSERT INTO classes (id, grade, section, createdAt) VALUES (?, ?, ?, NOW())',
          [cls.id, cls.grade, cls.section]
        );
        console.log(`  ✓ Created: ${cls.grade} - ${cls.section}`);
        created++;
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          console.log(`  ✓ Already exists: ${cls.grade} - ${cls.section}`);
        } else {
          console.error(`  ❌ Error: ${err.message}`);
        }
      }
    }

    console.log(`\n✅ Complete! Created ${created} new classes`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

addMissingClasses();
