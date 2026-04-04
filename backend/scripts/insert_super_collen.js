const pool = require('../server/config/db');

async function insert() {
  try {
    const id = 'super-collen-001';
    const firstName = 'Collen';
    const lastName = 'Super';
    const fullName = `${firstName} ${lastName}`;
    const username = 'collensuper';
    const email = 'collensuper@wmsu.edu.ph';
    const password = '$2b$12$Ysrdz/9QY1JRFq7nFW0YFO52PVmKqpPlFWHD3CMlPYNPp5I.8l4H.'; // bcrypt hash for collen123
    const role = 'super_admin';

    const insertQuery = `
      INSERT INTO users (id, first_name, last_name, full_name, username, email, password, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE password = VALUES(password), role = VALUES(role), updated_at = NOW()
    `;

    const [result] = await pool.query(insertQuery, [id, firstName, lastName, fullName, username, email, password, role]);
    console.log('Insert result:', result);
    console.log('Done');
    process.exit(0);
  } catch (err) {
    console.error('Insert failed:', err.message);
    process.exit(1);
  }
}

insert();
