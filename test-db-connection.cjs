const mysql = require('mysql2/promise');

(async () => {
  try {
    console.log('Attempting to connect to Railway MySQL...');
    console.log('Host:', process.env.DB_HOST || 'metro.proxy.rlwy.net');
    console.log('Port:', process.env.DB_PORT || 25385);
    console.log('User:', process.env.DB_USER || 'root');
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'metro.proxy.rlwy.net',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'SnBjHirVrIYZTNIPXZhmVMzOyqmsMznu',
      database: process.env.DB_NAME || 'railway',
      port: parseInt(process.env.DB_PORT || '25385')
    });
    
    console.log('\n✅ Connected successfully!');
    
    const [users] = await connection.query(
      `SELECT id, first_name, last_name, role FROM users 
       WHERE role IN ('teacher', 'adviser', 'subject_teacher') LIMIT 5`
    );
    
    console.log(`\nFound ${users.length} teachers:`);
    users.forEach(u => {
      console.log(`  - ${u.first_name} ${u.last_name} (${u.role})`);
    });
    
    await connection.end();
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
  }
  process.exit();
})();
