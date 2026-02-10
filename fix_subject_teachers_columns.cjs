#!/usr/bin/env node
/**
 * Migration: Add missing columns to subject_teachers table
 * This adds day, start_time, and end_time columns if they don't exist
 */

const mysql = require('mysql2/promise');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function runMigration() {
  let connection;
  
  try {
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║   Fix subject_teachers Table - Add Columns      ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    
    // Get Railway MySQL credentials
    const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_PUBLIC_URL;
    
    if (dbUrl) {
      console.log('📝 Using DATABASE_URL from environment\n');
      const url = new URL(dbUrl);
      
      console.log(`Host: ${url.hostname}`);
      console.log(`Port: ${url.port || 3306}`);
      console.log(`User: ${url.username}`);
      console.log(`Database: ${url.pathname.slice(1)}\n`);
      
      const proceed = await question('Connect to this database? (yes/no): ');
      if (proceed.toLowerCase() !== 'yes' && proceed.toLowerCase() !== 'y') {
        console.log('\n❌ Migration cancelled');
        process.exit(0);
      }
      
      connection = await mysql.createConnection({
        host: url.hostname,
        port: parseInt(url.port) || 3306,
        user: url.username,
        password: url.password,
        database: url.pathname.slice(1),
        connectTimeout: 60000
      });
    } else {
      console.log('❌ DATABASE_URL not found in environment');
      process.exit(1);
    }
    
    console.log('\n✅ Connected to database\n');
    console.log('📋 Current table structure:\n');
    
    // Check current structure
    const [columns] = await connection.execute(
      "SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'subject_teachers' AND TABLE_SCHEMA = DATABASE()"
    );
    
    if (columns.length === 0) {
      console.log('❌ subject_teachers table not found');
      process.exit(1);
    }
    
    columns.forEach(col => {
      console.log(`  • ${col.COLUMN_NAME} (${col.COLUMN_TYPE}) ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    const columnNames = columns.map(c => c.COLUMN_NAME);
    const missingColumns = [];
    
    console.log('\n🔍 Checking for missing columns:\n');
    
    // Check if columns exist
    if (!columnNames.includes('day')) {
      console.log('  ❌ Missing: day column');
      missingColumns.push('day');
    } else {
      console.log('  ✅ day column exists');
    }
    
    if (!columnNames.includes('start_time')) {
      console.log('  ❌ Missing: start_time column');
      missingColumns.push('start_time');
    } else {
      console.log('  ✅ start_time column exists');
    }
    
    if (!columnNames.includes('end_time')) {
      console.log('  ❌ Missing: end_time column');
      missingColumns.push('end_time');
    } else {
      console.log('  ✅ end_time column exists');
    }
    
    if (missingColumns.length === 0) {
      console.log('\n✨ All columns already exist! No migration needed.\n');
      process.exit(0);
    }
    
    console.log(`\n📝 Adding ${missingColumns.length} missing column(s)...\n`);
    
    // Add missing columns
    if (missingColumns.includes('day')) {
      console.log('1️⃣  Adding day column...');
      try {
        await connection.execute(
          "ALTER TABLE subject_teachers ADD COLUMN day VARCHAR(50) DEFAULT 'Monday - Friday'"
        );
        console.log('   ✅ day column added');
      } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME') {
          throw err;
        }
        console.log('   ⚠️  day column already exists');
      }
    }
    
    if (missingColumns.includes('start_time')) {
      console.log('2️⃣  Adding start_time column...');
      try {
        await connection.execute(
          "ALTER TABLE subject_teachers ADD COLUMN start_time TIME DEFAULT '08:00:00'"
        );
        console.log('   ✅ start_time column added');
      } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME') {
          throw err;
        }
        console.log('   ⚠️  start_time column already exists');
      }
    }
    
    if (missingColumns.includes('end_time')) {
      console.log('3️⃣  Adding end_time column...');
      try {
        await connection.execute(
          "ALTER TABLE subject_teachers ADD COLUMN end_time TIME DEFAULT '09:00:00'"
        );
        console.log('   ✅ end_time column added');
      } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME') {
          throw err;
        }
        console.log('   ⚠️  end_time column already exists');
      }
    }
    
    // Verify the changes
    console.log('\n🔍 Verifying table structure:\n');
    const [updatedColumns] = await connection.execute(
      "SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'subject_teachers' AND TABLE_SCHEMA = DATABASE() ORDER BY ORDINAL_POSITION"
    );
    
    updatedColumns.forEach(col => {
      const defaultVal = col.COLUMN_DEFAULT ? ` DEFAULT '${col.COLUMN_DEFAULT}'` : '';
      console.log(`  ✅ ${col.COLUMN_NAME} (${col.COLUMN_TYPE})${defaultVal}`);
    });
    
    console.log('\n✨ Migration Completed Successfully!\n');
    console.log('The subject_teachers table now has all required columns:');
    console.log('  • day (VARCHAR 50) - Day(s) the subject is taught');
    console.log('  • start_time (TIME) - Start time of the class');
    console.log('  • end_time (TIME) - End time of the class\n');
    console.log('You can now assign subject teachers successfully! 🎉\n');
    
  } catch (error) {
    console.error('\n❌ Migration Failed:', error.message);
    if (error.code) {
      console.error('Error Code:', error.code);
    }
    process.exit(1);
  } finally {
    rl.close();
    if (connection) {
      await connection.end();
    }
  }
}

// Run migration
runMigration();
