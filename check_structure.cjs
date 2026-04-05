// Check users table structure
const mysql = require('mysql2/promise');

async function checkStructure() {
  const connection = await mysql.createConnection({
    host: 'metro.proxy.rlwy.net',
    user: 'root',
    password: 'SnBjHirVrIYZTNIPXZhmVMzOyqmsMznu',
    database: 'railway',
    port: 25385
  });

  try {
    const [result] = await connection.query('DESCRIBE users');
    console.log('Users table structure:');
    console.table(result);
    
    const [result2] = await connection.query('DESCRIBE students');
    console.log('\nStudents table structure:');
    console.table(result2);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkStructure();
