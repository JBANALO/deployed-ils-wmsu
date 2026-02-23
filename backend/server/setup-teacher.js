// Setup script for teacher account and class assignments
const pool = require('./config/db');
const bcrypt = require('bcrypt');

const setup = async () => {
  try {
    console.log('Setting up teacher account and class assignments...');
    
    // Teacher ID to use (should match the sample user in auth.js)
    const teacherId = 'ba930204-ff2a-11f0-ac97-388d3d8f1ae5';
    const teacherEmail = 'Hz202305178@wmsu.edu.ph';
    const teacherName = 'Josie Banalo';
    
    // Hash password
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    // 1. Insert or update the teacher user
    console.log('1. Setting up teacher user account...');
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [teacherEmail]
    );
    
    if (existingUsers.length === 0) {
      await pool.query(
        `INSERT INTO users (id, email, username, first_name, last_name, full_name, password, role, approval_status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          teacherId,
          teacherEmail,
          'hz202305178',
          'Josie',
          'Banalo',
          teacherName,
          hashedPassword,
          'subject_teacher',
          'approved'
        ]
      );
      console.log('   ✓ Teacher user created');
    } else {
      await pool.query(
        `UPDATE users SET role = ?, password = ? WHERE email = ?`,
        ['subject_teacher', hashedPassword, teacherEmail]
      );
      console.log('   ✓ Teacher user updated');
    }
    
    // 2. Update classes to assign adviser role
    console.log('2. Assigning classes as adviser...');
    const [classes] = await pool.query('SELECT id FROM classes LIMIT 2');
    
    for (const cls of classes) {
      await pool.query(
        'UPDATE classes SET adviser_id = ?, adviser_name = ? WHERE id = ?',
        [teacherId, teacherName, cls.id]
      );
    }
    console.log(`   ✓ Assigned ${classes.length} classes as adviser`);
    
    // 3. Assign as subject teacher
    console.log('3. Assigning as subject teacher...');
    const [classesForSubject] = await pool.query('SELECT id FROM classes LIMIT 3');
    
    for (const cls of classesForSubject) {
      try {
        await pool.query(
          `INSERT INTO subject_teachers (class_id, teacher_id, teacher_name, subject)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE teacher_id = ?, teacher_name = ?`,
          [cls.id, teacherId, teacherName, 'English', teacherId, teacherName]
        );
      } catch (err) {
        // Ignore duplicate key errors
      }
    }
    console.log(`   ✓ Assigned as subject teacher for ${classesForSubject.length} classes`);
    
    console.log('\nSetup complete! Teacher account: Hz202305178@wmsu.edu.ph | Password: test123');
    process.exit(0);
  } catch (err) {
    console.error('Setup error:', err);
    process.exit(1);
  }
};

setup();
