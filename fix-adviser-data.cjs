#!/usr/bin/env node
/**
 * Fix Corrupted Adviser Data
 * Cleans up invalid class/section data for advisers
 * 
 * Run: node fix-adviser-data.cjs
 */

require('dotenv').config();
const { query } = require('./server/config/database');

async function fixAdviserData() {
  try {
    console.log('\n🔧 Cleaning up corrupted adviser data\n');

    // 1. Find advisers with corrupted class/section data
    const advisers = await query(
      `SELECT id, first_name, last_name, grade_level, section, role FROM users WHERE role IN ('adviser', 'teacher') AND (grade_level LIKE '%{%' OR section LIKE '%{%' OR section LIKE '"%')`
    );

    console.log(`Found ${advisers.length} advisers with corrupted data`);

    // 2. For each corrupted adviser, clear their grade_level and section
    for (const adviser of advisers) {
      await query(
        'UPDATE users SET grade_level = NULL, section = NULL WHERE id = ?',
        [adviser.id]
      );
      console.log(`✓ Cleared data for ${adviser.first_name} ${adviser.last_name}`);
    }

    // 3. Rebuild adviser class assignments from the classes table
    console.log('\nRebuilding adviser assignments from classes table...\n');

    const classes = await query(
      'SELECT adviser_id, grade, section FROM classes WHERE adviser_id IS NOT NULL'
    );

    for (const cls of classes) {
      await query(
        'UPDATE users SET grade_level = ?, section = ? WHERE id = ?',
        [cls.grade, cls.section, cls.adviser_id]
      );
      console.log(`✓ Assigned ${cls.grade} - ${cls.section}`);
    }

    console.log(`\n✅ Fixed ${advisers.length} advisers with corrupted data`);
    console.log(`✅ Rebuilt ${classes.length} class assignments from database`);
    console.log('\nDone! Adviser data is now clean and consistent.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing adviser data:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixAdviserData();
