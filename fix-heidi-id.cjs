const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection('REPLACE_ME_DATABASE_URL');
  
  const oldId = 'ff3e8a38-7cba-4372-ba48-bfc530544150';
  const newId = 'user-hz-1772699124173';
  const adviserName = 'Heidi Rubia';
  
  console.log(`\n🔄 Updating Heidi's assignments from ${oldId} to ${newId}...\n`);
  
  // Update classes table
  const [r1] = await c.query(
    "UPDATE classes SET adviser_id = ? WHERE adviser_id = ?",
    [newId, oldId]
  );
  console.log(`✅ Updated ${r1.affectedRows} rows in classes table`);
  
  // Update class_assignments table
  const [r2] = await c.query(
    "UPDATE class_assignments SET adviser_id = ? WHERE adviser_id = ?",
    [newId, oldId]
  );
  console.log(`✅ Updated ${r2.affectedRows} rows in class_assignments table`);
  
  // Update subject_teachers table
  const [r3] = await c.query(
    "UPDATE subject_teachers SET teacher_id = ? WHERE teacher_id = ?",
    [newId, oldId]
  );
  console.log(`✅ Updated ${r3.affectedRows} rows in subject_teachers table`);
  
  console.log('\n=== Verifying updates ===');
  
  // Verify classes
  const [classes] = await c.query(
    "SELECT id, grade, section, adviser_id, adviser_name FROM classes WHERE adviser_id = ?",
    [newId]
  );
  console.log(`\nClasses with Heidi as adviser (ID: ${newId}):`);
  console.table(classes);
  
  // Verify subject_teachers
  const [st] = await c.query(
    "SELECT class_id, teacher_id, teacher_name, subject FROM subject_teachers WHERE teacher_id = ?",
    [newId]
  );
  console.log(`\nSubject teacher assignments for Heidi:`);
  console.table(st);
  
  await c.end();
  console.log('\n✅ Done!');
})();
