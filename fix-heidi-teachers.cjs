const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'metro.proxy.rlwy.net',
    port: 25385,
    user: 'root',
    password: 'REPLACE_ME_DB_PASSWORD',
    database: 'railway'
  });

  const oldId = 'ff3e8a38-7cba-4372-ba48-bfc530544150';
  const newId = 'user-hz-1772699124173';

  // Check teachers table structure
  console.log('=== Teachers table structure ===');
  const [cols] = await conn.execute("DESCRIBE teachers");
  console.table(cols);

  // Check current record
  console.log('\n=== Heidi in teachers table ===');
  const [rows] = await conn.execute("SELECT * FROM teachers WHERE id = ?", [oldId]);
  console.log(rows[0]);

  // Try update with explicit casting
  console.log('\n=== Updating ID ===');
  try {
    await conn.execute(`UPDATE teachers SET id = '${newId}' WHERE id = '${oldId}'`);
    console.log('✅ Updated Heidi ID in teachers table');
  } catch (e) {
    console.log('Error:', e.message);
  }

  // Verify
  console.log('\n=== After update ===');
  const [verify] = await conn.execute("SELECT id, firstName, lastName FROM teachers WHERE firstName LIKE '%Heidi%'");
  console.table(verify);

  await conn.end();
})();
