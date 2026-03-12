const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [grades] = await conn.execute('SELECT DISTINCT grade_level, COUNT(*) as c FROM students GROUP BY grade_level ORDER BY grade_level');
  console.log('GRADE LEVELS IN STUDENTS:');
  grades.forEach(g => console.log('  [' + g.c + '] ' + JSON.stringify(g.grade_level)));

  // Check grades table
  const [t] = await conn.execute("SHOW TABLES LIKE 'grades'");
  if (t.length) {
    const [gcols] = await conn.execute('DESCRIBE grades');
    console.log('\nGRADES TABLE COLUMNS:', gcols.map(c => c.Field).join(', '));
    const [sample] = await conn.execute('SELECT student_id, subject, grade FROM grades LIMIT 5');
    console.log('SAMPLE GRADES:', JSON.stringify(sample));
  } else {
    console.log('\nNo grades table found');
  }
  await conn.end();
})().catch(console.error);
