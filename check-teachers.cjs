const pool = require('./backend/server/config/db');
require('dotenv').config();

(async () => {
  try {
    console.log('\n=== CHECKING TEACHERS IN DATABASE ===\n');
    
    const [teachers] = await pool.query(
      `SELECT id, first_name, last_name, email, role FROM users 
       WHERE role IN ('teacher', 'adviser', 'subject_teacher')
       ORDER BY first_name, last_name`
    );
    
    console.log(`Found ${teachers.length} teachers:`, teachers.length === 0 ? '(NONE!)' : '');
    teachers.forEach((t, i) => {
      console.log(`  ${i+1}. ${t.first_name} ${t.last_name} - role: ${t.role}`);
    });
    
    console.log('\n=== ALL USERS BY ROLE ===\n');
    const [roles] = await pool.query(`SELECT role, COUNT(*) as count FROM users GROUP BY role ORDER BY count DESC`);
    roles.forEach(r => console.log(`  ${r.role}: ${r.count}`));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit();
})();
