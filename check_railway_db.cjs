// Check Railway MySQL Database
const mysql = require('mysql2/promise');

async function checkDatabase() {
  const connection = await mysql.createConnection({
    host: 'metro.proxy.rlwy.net',
    user: 'root',
    password: 'SnBjHirVrIYZTNIPXZhmVMzOyqmsMznu',
    database: 'railway',
    port: 25385
  });

  try {
    console.log('✅ Connected to Railway MySQL\n');
    
    // Show all tables
    const [tables] = await connection.query('SHOW TABLES');
    console.log('📊 Tables in database:');
    tables.forEach(table => {
      console.log(`   - ${Object.values(table)[0]}`);
    });
    
    // Check users table
    const [users] = await connection.query('SELECT id, username, email, role FROM users LIMIT 5');
    console.log(`\n👥 Users table (${users.length} rows):`);
    users.forEach(user => {
      console.log(`   - ${user.username} (${user.role}) - ${user.email}`);
    });
    
    // Check classes table
    const [classes] = await connection.query('SELECT id, grade, section, adviser_name FROM classes');
    console.log(`\n🏫 Classes table (${classes.length} rows):`);
    classes.forEach(cls => {
      console.log(`   - ${cls.grade} - ${cls.section} ${cls.adviser_name ? '(Adviser: ' + cls.adviser_name + ')' : ''}`);
    });
    
    console.log('\n✅ Database is ready!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkDatabase();
