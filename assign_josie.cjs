// Assign Josie to existing classes
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function assignJosieToClasses() {
  const dbUrl = process.env.DATABASE_URL || 'mysql://root:SnBjHirVrIYZTNIPXZhmVMzOyqmsMznu@metro.proxy.rlwy.net:25385/railway';
  const url = new URL(dbUrl);
  
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: parseInt(url.port),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1)
  });

  console.log('=== ASSIGNING JOSIE TO CLASSES ===\n');

  try {
    // 1. Add Josie as subject teacher (if not exists)
    console.log('Adding Josie as subject teacher...');
    const josiId = 'ba930204-ff2a-11f0-ac97-388d3d8f1ae5';
    const joshiPassword = await bcrypt.hash('Teacher123', 12);
    
    await connection.execute(`
      INSERT INTO users (id, firstName, lastName, username, email, password, role, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE role = 'teacher'
    `, [
      josiId,
      'Josie',
      'Banalo',
      'josiebanalo',
      'josie.banalo@wmsu.edu.ph',
      joshiPassword,
      'teacher'
    ]);
    console.log('✅ Josie added/updated as teacher\n');

    // 2. Get all existing classes
    console.log('Getting all existing classes...');
    const [classes] = await connection.execute('SELECT id, grade, section FROM classes LIMIT 10');
    
    if (classes.length === 0) {
      console.log('❌ No classes found!');
      console.log('Create classes first in admin panel');
      await connection.end();
      return;
    }

    console.log(`Found ${classes.length} classes:\n`);
    classes.forEach(cls => console.log(`  - ${cls.grade} ${cls.section}`));

    // 3. Assign Josie to each class as subject teacher for multiple subjects
    console.log('\nAssigning Josie to all classes...');
    const subjects = ['Mathematics', 'Science', 'English', 'Filipino'];
    let count = 0;

    for (const cls of classes) {
      for (const subject of subjects) {
        try {
          await connection.execute(`
            INSERT INTO subject_teachers (class_id, teacher_id, teacher_name, subject, assignedAt)
            VALUES (?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE teacher_id = teacher_id
          `, [cls.id, josiId, 'Josie Banalo', subject]);
          count++;
        } catch (err) {
          // Duplicate - that's ok
        }
      }
      console.log(`  ✅ ${cls.grade} ${cls.section}: ${subjects.length} subjects assigned`);
    }

    // 4. Add sample students if none exist
    console.log('\nChecking for students...');
    const [studentCount] = await connection.execute('SELECT COUNT(*) as count FROM users WHERE role = "student"');
    
    if (studentCount[0].count === 0) {
      console.log('Adding sample students...');
      const studentNames = [
        { first: 'Juan', last: 'Dela Cruz' },
        { first: 'Maria', last: 'Santos' },
        { first: 'Pedro', last: 'Garcia' },
        { first: 'Ana', last: 'Reyes' },
        { first: 'Carlos', last: 'Lopez' }
      ];

      for (const name of studentNames) {
        const studentId = uuidv4();
        const password = await bcrypt.hash('Student123', 12);
        
        // Assign to first class found
        const classId = classes[0].id;
        const gradeLevel = classes[0].grade;
        const section = classes[0].section;

        await connection.execute(`
          INSERT INTO users (id, firstName, lastName, username, email, password, role, gradeLevel, section, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
          studentId,
          name.first,
          name.last,
          `${name.first.toLowerCase()}.${name.last.toLowerCase()}`,
          `${name.first.toLowerCase()}.${name.last.toLowerCase()}@wmsu.edu.ph`,
          password,
          'student',
          gradeLevel,
          section
        ]);
      }
      console.log(`✅ Added ${studentNames.length} sample students to ${classes[0].grade} ${classes[0].section}`);
    }

    // Verify
    console.log('\n=== VERIFICATION ===');
    const [allTeachers] = await connection.execute('SELECT COUNT(*) as count FROM users WHERE role = "teacher"');
    const [allStudents] = await connection.execute('SELECT COUNT(*) as count FROM users WHERE role = "student"');
    const [allAssignments] = await connection.execute('SELECT COUNT(*) as count FROM subject_teachers');

    console.log(`Teachers: ${allTeachers[0].count}`);
    console.log(`Students: ${allStudents[0].count}`);
    console.log(`Classes: ${classes.length}`);
    console.log(`Teacher Assignments: ${allAssignments[0].count}`);

    console.log('\n✅ SETUP COMPLETE!');
    console.log('\nLogin as Josie to see assigned classes:');
    console.log('  Email: josie.banalo@wmsu.edu.ph');
    console.log('  Password: Teacher123');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

assignJosieToClasses().catch(console.error);
