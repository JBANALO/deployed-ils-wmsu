const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'metro.proxy.rlwy.net',
    port: 25385,
    user: 'root',
    password: 'SnBjHirVrIYZTNIPXZhmVMzOyqmsMznu',
    database: 'railway'
  });

  // Check users table for teachers/advisers
  console.log('=== Teachers/Advisers in USERS table ===');
  const [users] = await conn.execute(`
    SELECT id, firstName, lastName, email, role 
    FROM users 
    WHERE role IN ('teacher', 'adviser', 'subject_teacher')
    ORDER BY firstName
  `);
  console.table(users);

  // Find Heidi specifically
  console.log('\n=== Heidi records in USERS table ===');
  const [heidi] = await conn.execute(`
    SELECT id, firstName, lastName, email, role 
    FROM users 
    WHERE firstName LIKE '%Heidi%' OR lastName LIKE '%Heidi%'
  `);
  console.table(heidi);

  await conn.end();
})();
