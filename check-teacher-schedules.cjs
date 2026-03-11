const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Get all subject teacher assignments
  console.log('=== SUBJECT TEACHERS IN DATABASE ===');
  const [subjectTeachers] = await conn.execute(`
    SELECT * FROM subject_teachers ORDER BY teacher_name, class_id
  `);
  
  // Group by teacher
  const byTeacher = {};
  for (const st of subjectTeachers) {
    const key = st.teacher_name || 'Unknown';
    if (!byTeacher[key]) byTeacher[key] = [];
    byTeacher[key].push({
      class_id: st.class_id,
      subject: st.subject,
      day: st.day || 'NOT SET',
      start_time: st.start_time || 'NOT SET',
      end_time: st.end_time || 'NOT SET',
      teacher_id: st.teacher_id
    });
  }
  
  console.log('\nSchedules by Teacher:');
  for (const [teacher, schedules] of Object.entries(byTeacher)) {
    console.log(`\n📚 ${teacher} (ID: ${schedules[0]?.teacher_id}):`);
    schedules.forEach(s => {
      console.log(`   - ${s.class_id}: ${s.subject} | ${s.day} ${s.start_time}-${s.end_time}`);
    });
  }
  
  // Check the classes table to see adviser assignments
  console.log('\n\n=== ADVISER ASSIGNMENTS ===');
  const [classes] = await conn.execute(`
    SELECT * FROM classes
    ORDER BY grade, section
  `);
  
  classes.forEach(c => {
    console.log(`${c.grade} - ${c.section}: Adviser = ${c.adviser_name || 'None'} (ID: ${c.adviser_id || 'None'})`);
  });
  
  await conn.end();
})();
