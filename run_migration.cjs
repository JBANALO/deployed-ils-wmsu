#!/usr/bin/env node
/**
 * Subject Teachers Migration Runner
 * Adds missing columns: day, start_time, end_time to subject_teachers table
 */

const mysql = require('mysql2/promise');

async function runMigration() {
  let connection;
  
  try {
    console.log('🔄 Connecting to Railway MySQL...\n');

    // Create connection using direct properties (same as other working scripts)
    connection = await mysql.createConnection({
      host: 'metro.proxy.rlwy.net',
      port: 25385,
      user: 'root',
      password: 'SnBjHirVrIYZTNIPXZhmVMzOyqmsMznu',
      database: 'railway',
      waitForConnections: true,
      connectionLimit: 1,
      queueLimit: 0,
    });

    console.log('✅ Connected Successfully!\n');

    // Check current table structure
    console.log('📋 Checking current table structure...');
    const [columns] = await connection.query(
      'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = "subject_teachers" AND TABLE_SCHEMA = ?',
      ['railway']
    );

    const existingColumns = columns.map(c => c.COLUMN_NAME);
    console.log('Current columns:', existingColumns.join(', '), '\n');

    const requiredColumns = ['day', 'start_time', 'end_time'];
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

    if (missingColumns.length === 0) {
      console.log('✅ All required columns already exist!\n');
      console.log('Columns present:');
      console.log('  ✓ day');
      console.log('  ✓ start_time');
      console.log('  ✓ end_time\n');
      process.exit(0);
    }

    console.log('⚠️  Missing columns:', missingColumns.join(', '), '\n');
    console.log('🔧 Adding missing columns...\n');

    // Add each missing column
    for (const col of missingColumns) {
      try {
        if (col === 'day') {
          await connection.query(
            'ALTER TABLE subject_teachers ADD COLUMN day VARCHAR(50) DEFAULT "Monday - Friday"'
          );
          console.log('  ✅ Added: day (VARCHAR(50), default "Monday - Friday")');
        } else if (col === 'start_time') {
          await connection.query(
            'ALTER TABLE subject_teachers ADD COLUMN start_time VARCHAR(5) DEFAULT "08:00"'
          );
          console.log('  ✅ Added: start_time (VARCHAR(5), default "08:00")');
        } else if (col === 'end_time') {
          await connection.query(
            'ALTER TABLE subject_teachers ADD COLUMN end_time VARCHAR(5) DEFAULT "09:00"'
          );
          console.log('  ✅ Added: end_time (VARCHAR(5), default "09:00")');
        }
      } catch (err) {
        console.error(`  ❌ Error adding ${col}:`, err.message);
        throw err;
      }
    }

    console.log('\n📋 Verifying new structure...');
    const [newColumns] = await connection.query(
      'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = "subject_teachers" AND TABLE_SCHEMA = ? ORDER BY ORDINAL_POSITION',
      ['railway']
    );

    console.log('Final columns:', newColumns.map(c => c.COLUMN_NAME).join(', '), '\n');

    console.log('✅ Migration completed successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Next steps:');
    console.log('  1. Redeploy your application (git push deployed main)');
    console.log('  2. Test subject teacher assignment with different days');
    console.log('  3. Verify "Monday" saves as "Monday" (not "Monday - Friday")');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (err) {
    console.error('\n❌ Migration failed!');
    console.error('Error:', err.message, '\n');
    
    if (err.code === 'ER_ACCESS_DENIED_FOR_USER') {
      console.error('🔑 Access Denied - Check your password!');
      console.error('Make sure you copied the PASSWORD correctly from Railway.\n');
    } else if (err.code === 'ER_BAD_HOST_ERROR') {
      console.error('🌐 Cannot reach host - Check your host and port!\n');
    } else if (err.code === 'ER_NO_DB_ERROR') {
      console.error('📦 Database does not exist - Check database name!\n');
    }
    
    console.error('Troubleshooting:');
    console.error('  1. Verify DATABASE_URL is correct');
    console.error('  2. Check Railway Dashboard for current credentials');
    console.error('  3. Make sure MySQL service is running on Railway\n');

    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();
