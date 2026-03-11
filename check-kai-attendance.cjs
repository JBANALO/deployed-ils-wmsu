const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  console.log('=== KAI ATTENDANCE RECORDS ===');
  const [rows] = await conn.execute(
    "SELECT * FROM attendance WHERE studentName LIKE '%kai%' ORDER BY timestamp DESC LIMIT 10"
  );
  
  rows.forEach(r => {
    console.log(`\n📅 Date: ${r.date}`);
    console.log(`   Student: ${r.studentName} (ID: ${r.studentId})`);
    console.log(`   Status: ${r.status}`);
    console.log(`   Period: ${r.period}`);
    console.log(`   Time: ${r.time}`);
    console.log(`   Timestamp: ${r.timestamp}`);
  });
  
  if (rows.length === 0) {
    console.log('No attendance records found for kai');
  }
  
  await conn.end();
})();
