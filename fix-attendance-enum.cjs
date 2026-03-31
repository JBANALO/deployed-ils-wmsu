#!/usr/bin/env node
/**
 * Fix duplicate ENUM values in attendance.status column
 * This script will:
 * 1. Normalize all lowercase status values to uppercase
 * 2. Recreate the status ENUM with only valid values: Present, Absent, Late
 */

const { query } = require('./server/config/database');

async function fixAttendanceEnum() {
  try {
    console.log('Starting attendance status ENUM fix...\n');

    // Step 1: Normalize existing data to uppercase
    console.log('Step 1: Normalizing status values to uppercase...');
    await query(`UPDATE attendance SET status = 'Present' WHERE LOWER(status) = 'present'`);
    await query(`UPDATE attendance SET status = 'Absent' WHERE LOWER(status) = 'absent'`);
    await query(`UPDATE attendance SET status = 'Late' WHERE LOWER(status) = 'late'`);
    const [normalized] = await query(`SELECT COUNT(*) as count FROM attendance`);
    console.log(`✅ Normalized ${normalized.count} rows\n`);

    // Step 2: Drop and recreate the ENUM column
    console.log('Step 2: Recreating status ENUM column with valid values only...');
    
    // Create a temporary column with the correct ENUM
    await query(`
      ALTER TABLE attendance 
      ADD COLUMN status_new ENUM('Present', 'Absent', 'Late') NOT NULL DEFAULT 'Present'
    `);
    console.log('✅ Created temporary column\n');

    // Copy data from old column to new column
    console.log('Step 3: Copying data to new column...');
    await query(`UPDATE attendance SET status_new = status`);
    console.log('✅ Data copied\n');

    // Drop old column and rename new one
    console.log('Step 4: Replacing old column with new column...');
    await query(`ALTER TABLE attendance DROP COLUMN status`);
    await query(`ALTER TABLE attendance CHANGE COLUMN status_new status ENUM('Present', 'Absent', 'Late') NOT NULL`);
    console.log('✅ Column replaced\n');

    // Verify the fix
    const [result] = await query(`
      SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'attendance' AND COLUMN_NAME = 'status' AND TABLE_SCHEMA = DATABASE()
    `);
    
    if (result) {
      console.log(`✅ FINAL RESULT: status column type is now: ${result.COLUMN_TYPE}\n`);
    }

    // Show sample data
    const [samples] = await query(`SELECT id, studentName, status, date FROM attendance LIMIT 5`);
    console.log('Sample records:');
    samples.forEach(row => {
      console.log(`  - ${row.studentName}: ${row.status} (${row.date})`);
    });

    console.log('\n✅ Attendance ENUM fix completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error fixing attendance ENUM:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    // Close database connection
    try {
      const { pool } = require('./server/config/database');
      if (pool) {
        await pool.end();
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

fixAttendanceEnum();
