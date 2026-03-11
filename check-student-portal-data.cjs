const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // List all tables
  const [tables] = await conn.execute('SHOW TABLES');
  console.log('TABLES:', tables.map(t => Object.values(t)[0]).join(', '));
  
  // Grades schema
  console.log('\n=== GRADES TABLE ===');
  const [gr] = await conn.execute('DESCRIBE grades');
  gr.forEach(r => console.log(`  ${r.Field}: ${r.Type}`));
  
  // Attendance schema
  console.log('\n=== ATTENDANCE TABLE ===');
  const [att] = await conn.execute('DESCRIBE attendance');
  att.forEach(r => console.log(`  ${r.Field}: ${r.Type}`));
  
  // Find Kai
  console.log('\n=== LOOKING FOR KAI SISON LUCAS ===');
  const [kai] = await conn.execute(
    "SELECT id, lrn, first_name, last_name, grade_level, section FROM students WHERE first_name LIKE '%kai%' OR last_name LIKE '%lucas%' LIMIT 5"
  );
  console.log('Students found:', kai);
  
  if (kai.length > 0) {
    const studentId = kai[0].id;
    console.log('\n=== KAI GRADES ===');
    const [grades] = await conn.execute('SELECT * FROM grades WHERE student_id = ?', [studentId]);
    console.log('Grades count:', grades.length);
    if (grades.length > 0) {
      console.log('Sample grades:', grades.slice(0, 5));
    } else {
      console.log('NO GRADES YET for this student');
    }
    
    console.log('\n=== KAI ATTENDANCE ===');
    const [attendance] = await conn.execute('SELECT * FROM attendance WHERE studentId = ? LIMIT 10', [studentId]);
    console.log('Attendance records:', attendance.length);
    if (attendance.length > 0) {
      console.log('Sample:', attendance.slice(0, 3));
    }
  }
  
  // Check if schedule table exists
  console.log('\n=== SCHEDULE TABLE ===');
  try {
    const [sch] = await conn.execute('DESCRIBE schedule');
    sch.forEach(r => console.log(`  ${r.Field}: ${r.Type}`));
  } catch (e) {
    console.log('No schedule table found. Will need to use classes table.');
  }
  
  // Classes table
  console.log('\n=== CLASSES TABLE ===');
  const [cls] = await conn.execute('DESCRIBE classes');
  cls.forEach(r => console.log(`  ${r.Field}: ${r.Type}`));
  
  // Sample class
  const [sampleClass] = await conn.execute("SELECT * FROM classes WHERE grade = 'Grade 3' LIMIT 1");
  console.log('\nSample Grade 3 class:', sampleClass);
  
  // Subject teachers for Grade 3
  console.log('\n=== SUBJECT TEACHERS ===');
  const [stSchema] = await conn.execute('DESCRIBE subject_teachers');
  stSchema.forEach(r => console.log(`  ${r.Field}: ${r.Type}`));
  
  const [subjectTeachers] = await conn.execute("SELECT * FROM subject_teachers WHERE class_id LIKE '%grade-3%' LIMIT 10");
  console.log('\nGrade 3 subject teachers:', subjectTeachers);
  
  await conn.end();
})();
