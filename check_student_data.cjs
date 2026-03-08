const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection('mysql://root:SnBjHirVrIYZTNIPXZhmVMzOyqmsMznu@metro.proxy.rlwy.net:25385/railway');
  
  // Find kai sison lucas
  const [students] = await conn.execute(
    "SELECT id, first_name, last_name, grade_level, section FROM students WHERE first_name LIKE '%kai%' OR last_name LIKE '%lucas%' LIMIT 5"
  );
  console.log('Student data:');
  console.log(JSON.stringify(students, null, 2));
  
  // Get Heidi's adviser classes
  const [classes] = await conn.execute(
    "SELECT * FROM classes WHERE adviser_id = 'user-hz-1772699124173'"
  );
  console.log('\nHeidi adviser classes:');
  console.log(JSON.stringify(classes, null, 2));
  
  // Compare formats
  if (students.length > 0 && classes.length > 0) {
    console.log('\n--- FORMAT COMPARISON ---');
    console.log('Student grade_level:', JSON.stringify(students[0].grade_level));
    console.log('Student section:', JSON.stringify(students[0].section));
    console.log('Classes grade:', JSON.stringify(classes[0].grade));
    console.log('Classes section:', JSON.stringify(classes[0].section));
    console.log('Match:', students[0].grade_level === classes[0].grade && students[0].section === classes[0].section);
  }
  
  await conn.end();
}

main().catch(console.error);
