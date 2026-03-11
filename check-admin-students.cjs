require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  
  const [rows] = await pool.query(
    `SELECT lrn, first_name, last_name, student_email, 
     LEFT(password, 15) as pw_start, status, created_by 
     FROM students WHERE created_by = 'admin' LIMIT 5`
  );
  console.log('Admin-created students:');
  console.table(rows);
  
  const [nullPw] = await pool.query(
    `SELECT COUNT(*) as cnt FROM students WHERE password IS NULL OR password = ''`
  );
  console.log('Students with null/empty password:', nullPw[0].cnt);
  
  await pool.end();
})();
