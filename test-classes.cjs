const pool = require('./backend/server/config/db');
require('dotenv').config();

(async () => {
  try {
    console.log('\n=== SIMULATING /api/classes GET ===\n');
    
    const [classes] = await pool.query(
      `SELECT id, grade, section, adviser_id, adviser_name FROM classes ORDER BY grade, section`
    );
    
    console.log(`Found ${classes.length} classes`);
    classes.forEach(c => {
      console.log(`  - ${c.grade} - ${c.section} (adviser: ${c.adviser_name || 'NONE'})`);
    });
    
    // Now get subject teachers for each class
    console.log('\n=== CLASSES WITH SUBJECT TEACHERS ===\n');
    for (const cls of classes.slice(0, 2)) {
      const [subjects] = await pool.query(
        `SELECT id, class_id, teacher_id, teacher_name, subject, day, start_time, end_time 
         FROM subject_teachers WHERE class_id = ?`,
        [cls.id]
      );
      console.log(`\n${cls.grade} - ${cls.section}:`);
      if (subjects.length === 0) {
        console.log('  (no subject teachers assigned)');
      } else {
        subjects.forEach(s => {
          console.log(`  - ${s.teacher_name}: ${s.subject} (${s.day} ${s.start_time}-${s.end_time})`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit();
})();
