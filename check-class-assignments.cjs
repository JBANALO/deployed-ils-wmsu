const mysql = require('mysql2/promise');

const url = 'REPLACE_ME_DATABASE_URL';

(async () => {
  try {
    const c = await mysql.createConnection(url);
    
    console.log('\n=== class_assignments table ===');
    const [r1] = await c.query('SELECT * FROM class_assignments');
    console.table(r1);
    
    console.log('\n=== classes table (with adviser info) ===');
    const [r2] = await c.query('SELECT id, grade, section, adviser_id, adviser_name FROM classes');
    console.table(r2);
    
    await c.end();
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
