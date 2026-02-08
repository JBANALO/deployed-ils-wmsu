// Add Sample Teacher Data and Classes to Railway
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function addSampleData() {
  const dbUrl = process.env.DATABASE_URL || 'mysql://root:SnBjHirVrIYZTNIPXZhmVMzOyqmsMznu@metro.proxy.rlwy.net:25385/railway';
  const url = new URL(dbUrl);
  
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: parseInt(url.port),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1)
  });

  console.log('=== ADDING SAMPLE DATA ===\n');

  try {
    // 1. Add Josie as subject teacher
    console.log('Adding Josie as subject teacher...');
    const josiId = 'ba930204-ff2a-11f0-ac97-388d3d8f1ae5';
    const joshiPassword = await bcrypt.hash('Teacher123', 12);
    
    await connection.execute(`
      INSERT INTO users (id, firstName, lastName, username, email, password, role, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE email = email
    `, [
      josiId,
      'Josie',
      'Banalo',
      'josiebanalo',
      'josie.banalo@wmsu.edu.ph',
      joshiPassword,
      'teacher'
    ]);
    console.log('✅ Josie added as teacher');

    // 2. Create sample classes
    console.log('\nCreating sample classes...');
    const classes = [
      { grade: 'Grade 3', section: 'Wisdom' },
      { grade: 'Grade 3', section: 'Knowledge' },
      { grade: 'Grade 4', section: 'Excellence' },
      { grade: 'Grade 4', section: 'Leadership' }
    ];

    const classIds = [];
    for (const cls of classes) {
      const classId = uuidv4();
      await connection.execute(`
        INSERT INTO classes (id, grade, section, createdAt)
        VALUES (?, ?, ?, NOW())
      `, [classId, cls.grade, cls.section]);
      classIds.push(classId);
      console.log(`  ✅ Created class: ${cls.grade} - ${cls.section}`);
    }

    // 3. Assign Josie to classes as subject teacher
    console.log('\nAssigning Josie to classes...');
    const subjects = ['Mathematics', 'Science'];
    
    for (let i = 0; i < classIds.length; i++) {
      for (const subject of subjects) {
        await connection.execute(`
          INSERT INTO subject_teachers (class_id, teacher_id, teacher_name, subject, assignedAt)
          VALUES (?, ?, ?, ?, NOW())
        `, [classIds[i], josiId, 'Josie Banalo', subject]);
      }
      console.log(`  ✅ Assigned Josie to ${classes[i].grade} ${classes[i].section}`);
    }

    // 4. Add sample students
    console.log('\nAdding sample students...');
    const studentNames = [
      { first: 'Juan', last: 'Dela Cruz' },
      { first: 'Maria', last: 'Santos' },
      { first: 'Pedro', last: 'Garcia' },
      { first: 'Ana', last: 'Reyes' }
    ];

    for (const name of studentNames) {
      const studentId = uuidv4();
      const password = await bcrypt.hash('Student123', 12);
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
        'Grade 3',
        'Wisdom'
      ]);
    }
    console.log(`✅ Added ${studentNames.length} sample students`);

    // Verify
    console.log('\n=== VERIFICATION ===');
    
    const [teachers] = await connection.execute('SELECT COUNT(*) as count FROM users WHERE role = "teacher"');
    const [students] = await connection.execute('SELECT COUNT(*) as count FROM users WHERE role = "student"');
    const [classesList] = await connection.execute('SELECT COUNT(*) as count FROM classes');
    const [assignments] = await connection.execute('SELECT COUNT(*) as count FROM subject_teachers');

    console.log(`Teachers: ${teachers[0].count}`);
    console.log(`Students: ${students[0].count}`);
    console.log(`Classes: ${classesList[0].count}`);
    console.log(`Teacher Assignments: ${assignments[0].count}`);

    console.log('\n✅ SAMPLE DATA ADDED SUCCESSFULLY!');
    console.log('\nNow you can:');
    console.log('  - Login as Josie: josie.banalo@wmsu.edu.ph / Teacher123');
    console.log('  - See all assigned classes in Grade Level page');
    console.log('  - View student class lists');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

addSampleData().catch(console.error);
