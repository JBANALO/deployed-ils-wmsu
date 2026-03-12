// Check current sections and subjects in the database
const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  console.log('=== SECTIONS IN DB ===');
  const [sections] = await conn.execute('SELECT id, name FROM sections WHERE is_archived = FALSE ORDER BY id');
  sections.forEach(s => console.log(`  [${s.id}] ${s.name}`));

  console.log('\n=== SUBJECTS IN DB ===');
  const [subjects] = await conn.execute('SELECT id, name FROM subjects WHERE is_archived = FALSE ORDER BY id');
  subjects.forEach(s => console.log(`  [${s.id}] ${s.name}`));

  console.log('\n=== CHECK IF OLD SECTIONS ARE USED IN students ===');
  const oldSectionNames = ['Rizal','Mabini','Bonifacio','Luna','Del Pilar','Jacinto','Silang','Aguinaldo','Quezon','Burgos','Gomez','Zamora','Maharlika','Sampaguita','Narra'];
  for (const name of oldSectionNames) {
    const [r] = await conn.execute('SELECT COUNT(*) as c FROM students WHERE section = ?', [name]);
    if (r[0].c > 0) console.log(`  ⚠️  ${name} used by ${r[0].c} students`);
  }
  
  console.log('\n=== CHECK IF OLD SECTIONS ARE USED IN classes ===');
  for (const name of oldSectionNames) {
    const [r] = await conn.execute('SELECT COUNT(*) as c FROM classes WHERE section = ?', [name]);
    if (r[0].c > 0) console.log(`  ⚠️  ${name} used in ${r[0].c} classes`);
  }

  await conn.end();
})().catch(e => console.error(e.message));
