// Clean up: delete old generic/pre-seeded subjects (IDs 31-38) that are duplicates
const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // Old generic subjects to delete (IDs 31-38)
  const toDelete = [31, 32, 33, 34, 35, 36, 37, 38];

  console.log('=== CHECKING IF GENERIC SUBJECTS ARE USED ===');

  // Check subject_teachers table
  try {
    const [t1] = await conn.execute("SHOW TABLES LIKE 'subject_teachers'");
    if (t1.length > 0) {
      const [r] = await conn.execute(
        `SELECT subject_name, COUNT(*) as c FROM subject_teachers WHERE subject_name IN ('GMRC','English','Araling Panlipunan','Mathematics','Filipino','EPP','Science','MAPEH') GROUP BY subject_name`
      );
      if (r.length > 0) { console.log('subject_teachers refs:', r); }
      else { console.log('subject_teachers: no refs to generic subjects'); }
    }
  } catch(e) { console.log('subject_teachers check:', e.message); }

  // Check class_assignments or similar
  try {
    const [t2] = await conn.execute("SHOW TABLES LIKE 'class_assignments'");
    if (t2.length > 0) {
      const [r] = await conn.execute("SELECT COUNT(*) as c FROM class_assignments WHERE subject IN ('GMRC','English','Araling Panlipunan','Mathematics','Filipino','EPP','Science','MAPEH')");
      console.log('class_assignments refs:', r[0].c);
    }
  } catch(e) { console.log('class_assignments check:', e.message); }

  console.log('\n=== CURRENT SUBJECTS THAT WILL BE DELETED ===');
  const [rows] = await conn.execute(`SELECT id, name FROM subjects WHERE id IN (${toDelete.join(',')})`);
  rows.forEach(r => console.log(`  [${r.id}] ${r.name}`));

  console.log('\n=== DELETING GENERIC/DUPLICATE SUBJECTS ===');
  const [result] = await conn.execute(`DELETE FROM subjects WHERE id IN (${toDelete.join(',')})`);
  console.log(`✅ Deleted ${result.affectedRows} subjects`);

  console.log('\n=== REMAINING SUBJECTS ===');
  const [remaining] = await conn.execute('SELECT id, name FROM subjects ORDER BY id');
  remaining.forEach(r => console.log(`  [${r.id}] ${r.name}`));

  console.log('\n=== REMAINING SECTIONS ===');
  const [sections] = await conn.execute('SELECT id, name FROM sections WHERE is_archived = FALSE ORDER BY id');
  sections.forEach(r => console.log(`  [${r.id}] ${r.name}`));

  await conn.end();
})().catch(e => console.error('ERROR:', e.message));
