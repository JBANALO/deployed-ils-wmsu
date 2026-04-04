const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection('REPLACE_ME_DATABASE_URL');
  
  // Update Heidi's name
  await c.query("UPDATE users SET firstName = 'Heidi', lastName = 'Rubia' WHERE id = 'user-hz-1772699124173'");
  console.log('Updated Heidi name in users table');
  
  // Verify
  const [users] = await c.query("SELECT id, email, firstName, lastName, role FROM users WHERE id = 'user-hz-1772699124173'");
  console.table(users);
  
  await c.end();
})();
