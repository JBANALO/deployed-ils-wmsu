// Fix Hz202305178 Teacher Account - Link Students Properly
require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixHz202305178() {
  const dbUrl = process.env.DATABASE_URL || 'mysql://root:SnBjHirVrIYZTNIPXZhmVMzOyqmsMznu@metro.proxy.rlwy.net:25385/railway';
  const url = new URL(dbUrl);
  
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: parseInt(url.port),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1)
  });

  console.log('=== FIXING HZ202305178 ACCOUNT ===\n');

  try {
    // 1. Find Hz202305178 user
    console.log('Looking for Hz202305178 account...');
    const [hz202305178] = await connection.execute(
      'SELECT id, firstName, lastName, email, username, role FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) LIKE LOWER(?)',
      ['hz202305178', '%hz202305178%']
    );

    if (hz202305178.length === 0) {
      console.log('❌ User Hz202305178 not found!');
      await connection.end();
      return;
    }

    const teacher = hz202305178[0];
    console.log(`✅ Found teacher:`);
    console.log(`  ID: ${teacher.id}`);
    console.log(`  Name: ${teacher.firstName} ${teacher.lastName}`);
    console.log(`  Email: ${teacher.email}`);
    console.log(`  Role: ${teacher.role}\n`);

    // 2. Check if teacher has any classes assigned
    console.log('Checking teacher assignments...');
    const [assignments] = await connection.execute(
      'SELECT id, class_id, subject FROM subject_teachers WHERE teacher_id = ?',
      [teacher.id]
    );

    if (assignments.length === 0) {
      console.log('⚠️  No class assignments found for this teacher!');
      console.log('Need to assign classes first...\n');
      
      // Get first class and assign teacher to it
      const [classes] = await connection.execute('SELECT id, grade, section FROM classes LIMIT 1');
      if (classes.length > 0) {
        const classId = classes[0].id;
        await connection.execute(`
          INSERT INTO subject_teachers (class_id, teacher_id, teacher_name, subject, assignedAt)
          VALUES (?, ?, ?, ?, NOW())
        `, [classId, teacher.id, `${teacher.firstName} ${teacher.lastName}`, 'All Subjects']);
        console.log(`✅ Assigned teacher to class: ${classes[0].grade} ${classes[0].section}\n`);
      }
    } else {
      console.log(`✅ Teacher has ${assignments.length} subject assignments`);
      for (const assignment of assignments.slice(0, 3)) {
        console.log(`  - Subject: ${assignment.subject} (Class ID: ${assignment.class_id})`);
      }
      console.log();
    }

    // 3. Get all students
    console.log('Checking students in database...');
    const [allStudents] = await connection.execute('SELECT COUNT(*) as count FROM users WHERE role = "student"');
    console.log(`✅ Total students: ${allStudents[0].count}\n`);

    // 4. Get students for this teacher's classes
    console.log('Getting students for teacher\'s classes...');
    const [studentsByClass] = await connection.execute(`
      SELECT DISTINCT u.id, u.firstName, u.lastName, u.gradeLevel, u.section
      FROM users u
      INNER JOIN subject_teachers st ON u.gradeLevel = st.* OR (u.section IS NOT NULL)
      WHERE st.teacher_id = ?
      LIMIT 20
    `, [teacher.id]);

    // Alternative: Get students by matching grade level and section with teacher's classes
    const [teacherClasses] = await connection.execute(`
      SELECT DISTINCT c.grade, c.section 
      FROM classes c
      INNER JOIN subject_teachers st ON c.id = st.class_id
      WHERE st.teacher_id = ?
    `, [teacher.id]);

    if (teacherClasses.length === 0) {
      console.log('❌ No classes found for this teacher!');
    } else {
      console.log(`✅ Teacher's classes: ${teacherClasses.length}`);
      for (const cls of teacherClasses) {
        console.log(`  - ${cls.grade} ${cls.section}`);
      }

      // Get students matching teacher's grade levels
      console.log('\nGetting students in teacher\'s grade levels...');
      const gradeFilter = teacherClasses.map(c => `'${c.grade}'`).join(',');
      const [matchingStudents] = await connection.execute(`
        SELECT id, firstName, lastName, gradeLevel, section
        FROM users 
        WHERE role = 'student' AND gradeLevel IN (${gradeFilter})
        LIMIT 10
      `);

      console.log(`✅ Found ${matchingStudents.length} matching students`);
      for (const student of matchingStudents) {
        console.log(`  - ${student.firstName} ${student.lastName} (${student.gradeLevel} ${student.section})`);
      }
    }

    // 5. Verify the relationship
    console.log('\n=== VERIFICATION ===');
    console.log(`Teacher ID: ${teacher.id}`);
    console.log(`Teacher Email: ${teacher.email}`);
    console.log(`Students assigned via class:  ${studentsByClass.length}`);
    console.log(`Teacher's classes count: ${teacherClasses.length}`);

    console.log('\n✅ ACCOUNT CHECK COMPLETE!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await connection.end();
  }
}

fixHz202305178().catch(console.error);
