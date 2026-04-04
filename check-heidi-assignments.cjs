const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'metro.proxy.rlwy.net',
    port: 25385,
    user: 'root',
    password: 'REPLACE_ME_DB_PASSWORD',
    database: 'railway'
  });

  // Check all Heidi entries
  console.log('\n=== All Heidi users ===');
  const [users] = await conn.execute("SELECT id, firstName, lastName, email FROM users WHERE firstName LIKE '%Heidi%' OR lastName LIKE '%Heidi%'");
  console.table(users);

  // Check subject_teachers for Heidi
  console.log('\n=== Subject teacher assignments containing "Heidi" ===');
  const [st] = await conn.execute("SELECT * FROM subject_teachers WHERE teacher_name LIKE '%Heidi%'");
  console.table(st);

  // Check Kindergarten-Love class
  console.log('\n=== Kindergarten-Love class info ===');
  const [kclass] = await conn.execute("SELECT * FROM classes WHERE grade = 'Kindergarten' AND section = 'Love'");
  console.table(kclass);

  // Check subject_teachers for Kindergarten-Love
  console.log('\n=== Subject teachers for Kindergarten-Love ===');
  const [kst] = await conn.execute("SELECT * FROM subject_teachers WHERE class_id LIKE '%kindergarten%love%' OR class_id LIKE 'kinder%'");
  console.table(kst);

  await conn.end();
})();
