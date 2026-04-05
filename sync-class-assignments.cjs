const mysql = require('mysql2/promise');

const url = 'mysql://root:SnBjHirVrIYZTNIPXZhmVMzOyqmsMznu@metro.proxy.rlwy.net:25385/railway';

(async () => {
  try {
    const c = await mysql.createConnection(url);
    
    console.log('\n🔄 Syncing class_assignments to classes table...\n');
    
    // Get all class_assignments
    const [assignments] = await c.query('SELECT * FROM class_assignments');
    console.log(`Found ${assignments.length} assignments to sync\n`);
    
    for (const a of assignments) {
      const classId = `${a.grade_level.toLowerCase().replace(' ', '-')}-${a.section.toLowerCase()}`;
      
      console.log(`Updating: ${a.grade_level} - ${a.section}`);
      console.log(`  Class ID: ${classId}`);
      console.log(`  Adviser: ${a.adviser_name} (${a.adviser_id})`);
      
      // Update classes table
      const [result] = await c.query(
        `UPDATE classes SET adviser_id = ?, adviser_name = ? WHERE grade = ? AND section = ?`,
        [a.adviser_id, a.adviser_name, a.grade_level, a.section]
      );
      
      if (result.affectedRows > 0) {
        console.log(`  ✅ Updated ${result.affectedRows} row(s)\n`);
      } else {
        console.log(`  ⚠️ No matching class found\n`);
      }
    }
    
    console.log('\n✅ Sync complete!\n');
    
    // Verify
    console.log('=== Updated classes table ===');
    const [classes] = await c.query('SELECT id, grade, section, adviser_id, adviser_name FROM classes');
    console.table(classes);
    
    await c.end();
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
