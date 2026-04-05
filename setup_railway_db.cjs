// Setup Railway MySQL Database
// Run this locally with: node setup_railway_db.js

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  console.log('🚀 Starting Railway MySQL Database Setup...\n');

  // Railway MySQL connection (public URL from Railway)
  const connection = await mysql.createConnection({
    host: 'metro.proxy.rlwy.net',
    user: 'root',
    password: 'SnBjHirVrIYZTNIPXZhmVMzOyqmsMznu',
    database: 'railway',
    port: 25385,
    multipleStatements: true
  });

  try {
    console.log('✅ Connected to Railway MySQL\n');

    // Read SQL file
    const sqlFile = fs.readFileSync(
      path.join(__dirname, 'railway_db_setup.sql'),
      'utf8'
    );

    console.log('📝 Executing SQL commands...\n');

    // Execute SQL
    await connection.query(sqlFile);

    console.log('✅ Database setup completed successfully!\n');
    console.log('📊 Tables created:');
    console.log('   - users (with admin account)');
    console.log('   - students');
    console.log('   - classes');
    console.log('   - subject_teachers');
    console.log('   - attendance');
    console.log('   - grades');
    console.log('\n🎉 Your Railway database is ready!');
    console.log('\n👤 Default Admin Login:');
    console.log('   Email: adminjossie@wmsu.edu.ph');
    console.log('   Password: Admin123!');

  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    console.error(error);
  } finally {
    await connection.end();
  }
}

setupDatabase();
