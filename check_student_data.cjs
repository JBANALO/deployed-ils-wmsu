const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection('mysql://root:SnBjHirVrIYZTNIPXZhmVMzOyqmsMznu@metro.proxy.rlwy.net:25385/railway');
  
  // Check Heidi in teachers table
  const [teacher] = await conn.execute(
    "SELECT id, role, first_name, last_name FROM teachers WHERE id = 'user-hz-1772699124173'"
  );
  console.log('Heidi in teachers table:');
  console.log(JSON.stringify(teacher, null, 2));
  
  // Check Heidi in users table
  const [user] = await conn.execute(
    "SELECT id, role, first_name, last_name FROM users WHERE id = 'user-hz-1772699124173'"
  );
  console.log('\nHeidi in users table:');
  console.log(JSON.stringify(user, null, 2));
  
  await conn.end();
}

main().catch(console.error);
