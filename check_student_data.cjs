const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection('mysql://root:SnBjHirVrIYZTNIPXZhmVMzOyqmsMznu@metro.proxy.rlwy.net:25385/railway');
  
  // Check grades for kai kai kai (student 275)
  const [grades] = await conn.execute(
    "SELECT * FROM grades WHERE student_id = 275"
  );
  console.log('Grades for student 275 (kai kai kai):');
  console.log(JSON.stringify(grades, null, 2));
  
  await conn.end();
}

main().catch(console.error);
