const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [cols] = await conn.execute('DESCRIBE students');
  const hasStatus = cols.some(c => c.Field === 'status');
  console.log('has status column:', hasStatus);
  if (!hasStatus) {
    await conn.execute("ALTER TABLE students ADD COLUMN status VARCHAR(20) DEFAULT 'active'");
    console.log('Added status column to students');
  } else {
    console.log('status column already exists');
  }
  await conn.end();
})().catch(console.error);
