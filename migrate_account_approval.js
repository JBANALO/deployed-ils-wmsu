#!/usr/bin/env node
/**
 * Migration Script: Add Account Approval System
 * This script adds the status column and index to the users table
 */

const mysql = require('mysql2/promise');

async function runMigration() {
  let connection;
  
  try {
    // Parse DATABASE_URL
    const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_PUBLIC_URL;
    
    if (!dbUrl) {
      console.error('❌ ERROR: DATABASE_URL or MYSQL_PUBLIC_URL environment variable not set');
      process.exit(1);
    }
    
    console.log('🔗 Connecting to Railway MySQL...');
    const url = new URL(dbUrl);
    
    // Create connection
    connection = await mysql.createConnection({
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      connectTimeout: 60000
    });
    
    console.log('✅ Connected to Database:', url.hostname);
    console.log('\n📋 Running Migration: Add Account Approval System\n');
    
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
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run migration
runMigration();
