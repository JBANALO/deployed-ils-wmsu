const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection('REPLACE_ME_DATABASE_URL');
  
  // Find Heidi's user account
  console.log('=== Heidi User Account ===');
  const [users] = await c.query("SELECT id, email, firstName, lastName, role FROM users WHERE email LIKE '%hz202%' OR firstName LIKE '%heidi%'");
  console.table(users);
  
  // Check classes table for adviser assignments
  console.log('\n=== Classes with Heidi as Adviser ===');
  const [classes] = await c.query("SELECT id, grade, section, adviser_id, adviser_name FROM classes WHERE adviser_name LIKE '%heidi%' OR adviser_name LIKE '%Rubia%'");
  console.table(classes);
  
  // Check subject_teachers table
  console.log('\n=== Subject Teacher Assignments for Heidi ===');
  const [st] = await c.query("SELECT * FROM subject_teachers WHERE teacher_name LIKE '%heidi%' OR teacher_name LIKE '%Rubia%'");
  console.table(st);
  
  // Check class_assignments table
  console.log('\n=== Class Assignments for Heidi ===');
  const [ca] = await c.query("SELECT * FROM class_assignments WHERE adviser_name LIKE '%heidi%' OR adviser_name LIKE '%Rubia%'");
  console.table(ca);
  
  await c.end();
})();
