#!/usr/bin/env node
/**
 * Interactive Migration Script: Add Account Approval System
 * This script prompts for Railway MySQL credentials and runs the migration
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
    console.log('║   Account Approval System Migration - Railway   ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    
    // Get Railway MySQL credentials from environment or prompt
    let dbHost, dbUser, dbPassword, dbName, dbPort;
    
    // Try to get from DATABASE_URL first
    const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_PUBLIC_URL;
    
    if (dbUrl) {
      console.log('📝 Found DATABASE_URL in environment variables\n');
      const url = new URL(dbUrl);
      dbHost = url.hostname;
      dbUser = url.username;
      dbPassword = url.password;
      dbName = url.pathname.slice(1);
      dbPort = parseInt(url.port) || 3306;
      
      console.log(`Host: ${dbHost}`);
      console.log(`User: ${dbUser}`);
      console.log(`Database: ${dbName}`);
      console.log(`Port: ${dbPort}\n`);
      
      const proceed = await question('Use these credentials? (yes/no): ');
      if (proceed.toLowerCase() !== 'yes' && proceed.toLowerCase() !== 'y') {
        console.log('\n❌ Migration cancelled');
        process.exit(0);
      }
    } else {
      console.log('Please enter your Railway MySQL credentials:\n');
      dbHost = await question('Host (e.g., metro.proxy.rlwy.net): ');
      dbPort = parseInt(await question('Port (default 3306): ')) || 3306;
      dbUser = await question('Username (default root): ') || 'root';
      dbPassword = await question('Password: ');
      dbName = await question('Database name (default railway): ') || 'railway';
    }
    
    console.log('\n🔗 Connecting to Railway MySQL...');
    
    // Create connection
    connection = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      connectTimeout: 60000
    });
    
    console.log('✅ Connected successfully!\n');
    console.log('📋 Running Migration: Add Account Approval System\n');
    
    // Migration 1: Add status column
    console.log('1️⃣  Adding status column to users table...');
    try {
      await connection.execute(
        'ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `status` VARCHAR(20) DEFAULT "pending"'
      );
      console.log('   ✅ Status column added successfully');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('   ⚠️  Status column already exists (skipped)');
      } else {
        throw err;
      }
    }
    
    // Migration 2: Update existing admin users
    console.log('\n2️⃣  Setting existing admin users to approved...');
    const [updateResult] = await connection.execute(
      'UPDATE `users` SET `status` = "approved" WHERE `role` = "admin" AND `status` IS NULL'
    );
    console.log(`   ✅ Updated ${updateResult.affectedRows} admin user(s)`);
    
    // Migration 3: Create index
    console.log('\n3️⃣  Creating index on status column...');
    try {
      await connection.execute(
        'CREATE INDEX IF NOT EXISTS idx_user_status ON `users` (`status`)'
      );
      console.log('   ✅ Index created successfully');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('   ⚠️  Index already exists (skipped)');
      } else {
        throw err;
      }
    }
    
    // Verify the changes
    console.log('\n🔍 Verifying migration...');
    const [verifyStatus] = await connection.execute(
      'SELECT DISTINCT `status` FROM `users` ORDER BY `status`'
    );
    console.log('   Status values in database:', verifyStatus.map(r => r.status).join(', '));
    
    // Check column info
    const [columnInfo] = await connection.execute(
      'SHOW COLUMNS FROM `users` WHERE Field = "status"'
    );
    if (columnInfo.length > 0) {
      console.log('   Status column details:', columnInfo[0].Type, 'Default:', columnInfo[0].Default);
    }
    
    console.log('\n✨ Migration Completed Successfully!\n');
    console.log('Account approval system is now active:');
    console.log('  • New users will have status = "pending"');
    console.log('  • Users must be approved before they can log in');
    console.log('  • Admins can approve/decline accounts in the Admin Approvals page\n');
    
  } catch (error) {
    console.error('\n❌ Migration Failed:', error.message);
    if (error.code) {
      console.error('Error Code:', error.code);
    }
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Tip: Check your Railway MySQL credentials:');
      console.error('   1. Go to Railway Dashboard → Your Project → MySQL service');
      console.error('   2. Click "Variables" tab to see the connection details');
      console.error('   3. Copy the correct password (it\'s generated by Railway)');
    }
    process.exit(1);
  } finally {
    rl.close();
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run migration
runMigration();
