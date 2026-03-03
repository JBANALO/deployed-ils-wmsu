const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: 'metro.proxy.rlwy.net', user: 'root',
    password: 'SnBjHirVrIYZTNIPXZhmVMzOyqmsMznu', database: 'railway', port: 25385
  });
  
  // Check exact id lookup for admin
  const [rows] = await conn.execute(
    'SELECT id, first_name, last_name, email, role FROM users WHERE id = ?',
    ['22cf3394-a516-4080-8736-c9a56ee56a88']
  );
  console.log('Admin id lookup result:', rows);
  
  // Check column type
  const [cols] = await conn.execute("SHOW COLUMNS FROM users WHERE Field = 'id'");
  console.log('id column type:', cols[0].Type, '| Key:', cols[0].Key);
  
  // Check what hz202305178 email maps to
  const [byEmail] = await conn.execute(
    'SELECT id, first_name, last_name, email, role FROM users WHERE email = ?',
    ['hz202305178@wmsu.edu.ph']
  );
  console.log('By email lookup:', byEmail);
  
  await conn.end();
}
run().catch(console.error);
