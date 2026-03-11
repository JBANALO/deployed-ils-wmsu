const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Get all unique grade/section from students
  const [fromStudents] = await conn.execute(
    'SELECT DISTINCT grade_level, section FROM students WHERE grade_level IS NOT NULL AND section IS NOT NULL'
  );
  
  // Get existing classes
  const [existingClasses] = await conn.execute('SELECT id FROM classes');
  const existingIds = existingClasses.map(c => c.id);
  
  console.log('Existing classes:', existingIds.length);
  console.log('Unique student classes:', fromStudents.length);
  
  let added = 0;
  
  for (const student of fromStudents) {
    const grade = student.grade_level;
    const section = student.section;
    const classId = `${grade.toLowerCase().replace(/\s+/g, '-')}-${section.toLowerCase()}`;
    
    if (!existingIds.includes(classId)) {
      console.log(`Adding missing class: ${classId} (${grade} - ${section})`);
      
      await conn.execute(
        `INSERT INTO classes (id, grade, section, adviser_id, adviser_name, createdAt, updatedAt)
         VALUES (?, ?, ?, NULL, NULL, NOW(), NOW())`,
        [classId, grade, section]
      );
      added++;
    }
  }
  
  console.log(`\n✅ Added ${added} missing classes`);
  
  // Show all classes now
  const [allClasses] = await conn.execute('SELECT id, grade, section FROM classes ORDER BY grade, section');
  console.log(`\nTotal classes now: ${allClasses.length}`);
  allClasses.forEach(c => console.log(`  - ${c.grade} - ${c.section}`));
  
  await conn.end();
})();
