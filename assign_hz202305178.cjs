// Assign Hz202305178 to Classes with Students
require('dotenv').config();
const mysql = require('mysql2/promise');

async function assignHz202305178ToClasses() {
  const dbUrl = process.env.DATABASE_URL || 'mysql://root:SnBjHirVrIYZTNIPXZhmVMzOyqmsMznu@metro.proxy.rlwy.net:25385/railway';
  const url = new URL(dbUrl);
  
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: parseInt(url.port),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1)
  });

  console.log('=== ASSIGNING HZ202305178 TO CLASSES ===\n');

  try {
    // 1. Find Hz202305178
    console.log('Finding Hz202305178...');
    const [hz202305178] = await connection.execute(
      'SELECT id, firstName, lastName, email FROM users WHERE email = ? OR LOWER(username) = LOWER(?)',
      ['hz202305178@wmsu.edu.ph', 'hz202305178']
    );

    if (hz202305178.length === 0) {
      console.log('❌ User not found!');
      await connection.end();
      return;
    }

    const teacher = hz202305178[0];
    console.log(`✅ Found: ${teacher.firstName} ${teacher.lastName}`);
    console.log(`   ID: ${teacher.id}\n`);

    // 2. Get all classes
    console.log('Getting all classes...');
    const [classes] = await connection.execute('SELECT id, grade, section FROM classes ORDER BY grade ASC');
    console.log(`✅ Found ${classes.length} classes\n`);

    // 3. Count students per class
    console.log('Counting students per class...');
    for (const cls of classes) {
      const [studentCount] = await connection.execute(
        'SELECT COUNT(*) as count FROM users WHERE role = "student" AND gradeLevel = ? AND section = ?',
        [cls.grade, cls.section]
      );
      console.log(`  ${cls.grade} ${cls.section}: ${studentCount[0].count} students`);
    }

    // 4. Assign Hz202305178 to classes with students
    console.log('\nAssigning Hz202305178 to classes...');
    const subjects = ['Mathematics', 'Science', 'English', 'Filipino', 'Araling Panlipunan'];
    let assignmentCount = 0;

    for (const cls of classes) {
      // Check if class has students
      const [studentCount] = await connection.execute(
        'SELECT COUNT(*) as count FROM users WHERE role = "student" AND gradeLevel = ? AND section = ?',
        [cls.grade, cls.section]
      );

      if (studentCount[0].count > 0) {
        // Assign to multiple subjects
        for (const subject of subjects) {
          try {
            await connection.execute(`
              INSERT INTO subject_teachers (class_id, teacher_id, teacher_name, subject, assignedAt)
              VALUES (?, ?, ?, ?, NOW())
              ON DUPLICATE KEY UPDATE teacher_id = ?
            `, [cls.id, teacher.id, `${teacher.firstName} ${teacher.lastName}`, subject, teacher.id]);
            assignmentCount++;
          } catch (err) {
            // Ignore duplicates
          }
        }
        console.log(`  ✅ ${cls.grade} ${cls.section}: assigned (${studentCount[0].count} students)`);
      }
    }

    // 5. Verify assignments
    console.log('\n=== VERIFICATION ===');
    const [assignments] = await connection.execute(
      'SELECT COUNT(*) as count FROM subject_teachers WHERE teacher_id = ?',
      [teacher.id]
    );

    const [classesAssigned] = await connection.execute(
      'SELECT DISTINCT class_id FROM subject_teachers WHERE teacher_id = ?',
      [teacher.id]
    );

    console.log(`Total assignments: ${assignments[0].count}`);
    console.log(`Classes assigned: ${classesAssigned.length}`);

    console.log('\n✅ SETUP COMPLETE!');
    console.log(`\nHz202305178 can now view:\n`);
    
    for (const cls of classes) {
      const [count] = await connection.execute(
        'SELECT COUNT(*) as count FROM subject_teachers WHERE teacher_id = ? AND class_id = ?',
        [teacher.id, cls.id]
      );
      if (count[0].count > 0) {
        const [studentCount] = await connection.execute(
          'SELECT COUNT(*) as count FROM users WHERE role = "student" AND gradeLevel = ? AND section = ?',
          [cls.grade, cls.section]
        );
        console.log(`  - ${cls.grade} ${cls.section} (${studentCount[0].count} students)`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

assignHz202305178ToClasses().catch(console.error);
