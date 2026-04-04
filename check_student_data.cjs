const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection('REPLACE_ME_DATABASE_URL');
  
  // Check attendance records count
  const [count] = await conn.execute('SELECT COUNT(*) as count FROM attendance');
  console.log('Total attendance records:', count[0].count);
  
  // Check sample records
  const [sample] = await conn.execute('SELECT studentId, studentName, gradeLevel, section, date, status FROM attendance LIMIT 5');
  console.log('\nSample attendance records:');
  console.log(JSON.stringify(sample, null, 2));
  
  await conn.end();
}

main().catch(console.error);
