const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [a] = await conn.execute("SHOW FULL COLUMNS FROM sections WHERE Field='name'");
  const [b] = await conn.execute("SHOW FULL COLUMNS FROM classes WHERE Field='section'");
  console.log('sections.name collation:', a[0]?.Collation);
  console.log('classes.section collation:', b[0]?.Collation);
  await conn.end();
})();
