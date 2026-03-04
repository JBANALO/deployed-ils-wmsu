#!/usr/bin/env node
/**
 * Sync all teachers/advisers from data/users.json to database users table
 * This fixes the FOREIGN KEY constraint issue where adviser_id must exist in users table
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./backend/server/config/db');

async function syncTeachersToDb() {
  try {
    console.log('\n=== SYNCING TEACHERS TO DATABASE ===\n');

    // 1. Read all users from users.json
    const usersPath = path.join(__dirname, './data/users.json');
    if (!fs.existsSync(usersPath)) {
      console.error('❌ data/users.json not found');
      process.exit(1);
    }

    const jsonUsers = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    
    // 2. Filter for teachers/advisers only
    const teachers = jsonUsers.filter(u => 
      u.role === 'adviser' || 
      u.role === 'teacher' || 
      u.role === 'subject_teacher' ||
      (u.position && u.position.includes('Adviser'))
    );

    console.log(`📖 Loaded ${jsonUsers.length} total users from users.json`);
    console.log(`👨‍🏫 Found ${teachers.length} teachers/advisers to sync\n`);

    if (teachers.length === 0) {
      console.warn('⚠️ No teachers found in users.json');
      process.exit(0);
    }

    // 3. Sync each teacher to database
    let inserted = 0;
    let updated = 0;
    let errors = 0;

    for (const teacher of teachers) {
      try {
        // Check if teacher already exists in database
        const [[existing]] = await pool.query(
          'SELECT id FROM users WHERE id = ?',
          [teacher.id]
        );

        if (existing) {
          // Update existing teacher
          await pool.query(
            `UPDATE users SET 
              first_name = ?, 
              last_name = ?,
              email = ?,
              role = ?
            WHERE id = ?`,
            [
              teacher.firstName || '',
              teacher.lastName || '',
              teacher.email || '',
              teacher.role || 'teacher',
              teacher.id
            ]
          );
          updated++;
          console.log(`  ✓ Updated: ${teacher.firstName} ${teacher.lastName}`);
        } else {
          // Insert new teacher - use only columns that exist in database
          await pool.query(
            `INSERT INTO users (
              id, first_name, last_name, email, username, password, role, created_at, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
            [
              teacher.id,
              teacher.firstName || '',
              teacher.lastName || '',
              teacher.email || `${(teacher.firstName || '').toLowerCase()}.${(teacher.lastName || '').toLowerCase()}@wmsu.edu.ph`,
              teacher.username || teacher.id.substring(0, 8),
              teacher.password || '$2a$12$placeholder',
              teacher.role || 'teacher',
              'active'
            ]
          );
          inserted++;
          console.log(`  ✓ Inserted: ${teacher.firstName} ${teacher.lastName}`);
        }
      } catch (err) {
        errors++;
        console.error(`  ❌ Error syncing ${teacher.firstName} ${teacher.lastName}:`, err.message);
      }
    }

    console.log(`\n✅ SYNC COMPLETE!`);
    console.log(`   ➕ Inserted: ${inserted} new teachers`);
    console.log(`   📝 Updated: ${updated} existing teachers`);
    console.log(`   ⚠️  Errors: ${errors}`);

    if (errors === 0) {
      console.log(`\n✨ All ${teachers.length} teachers are now in the database!`);
      console.log(`ℹ️  Adviser assignments will now work correctly.\n`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    process.exit(1);
  }
}

syncTeachersToDb();
