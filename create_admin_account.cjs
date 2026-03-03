#!/usr/bin/env node
/**
 * Create Admin Account
 * Creates a new admin account in the users table
 * 
 * Run: node create_admin_account.cjs
 */

require('dotenv').config();
const { query } = require('./server/config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function createAdminAccount() {
  try {
    console.log('\n🔐 Creating Admin Account\n');
    
    // Default admin details (you can modify these)
    const email = 'adminjossie@wmsu.edu.ph';
    const username = 'adminjossie';
    const password = 'Admin123';
    const firstName = 'Josie';
    const lastName = 'Banalo';
    const fullName = `${firstName} ${lastName}`;
    
    // Check if admin already exists
    const existing = await query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (existing && existing.length > 0) {
      console.log('ℹ️ Admin account already exists:');
      console.table(existing);
      console.log('\n💡 To update password, use: node fix_admin_password.cjs');
      process.exit(0);
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    const adminId = uuidv4();
    
    // Insert admin account
    await query(
      `INSERT INTO users (
        id, first_name, last_name, full_name, email, username, password, role, approval_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [adminId, firstName, lastName, fullName, email, username, hashedPassword, 'admin', 'approved']
    );
    
    console.log('✅ Admin account created successfully!\n');
    console.log('📋 Account Details:');
    console.log(`   Email: ${email}`);
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: admin`);
    console.log(`   Status: approved\n`);
    console.log('🔒 Keep these credentials secure!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin account:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

createAdminAccount();
