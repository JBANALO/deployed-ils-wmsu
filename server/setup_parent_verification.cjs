require('dotenv').config({ path: '../.env.development' });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupParentVerification() {
  let connection;
  
  try {
    // Database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'wmsu_ed',
      port: process.env.DB_PORT || 3307
    });

    console.log('✅ Connected to database');

    // Read and execute SQL file
    const sqlFile = path.join(__dirname, 'sql', 'create_parent_verifications.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Split SQL file into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await connection.execute(statement);
        console.log('✅ Executed:', statement.trim().substring(0, 50) + '...');
      }
    }

    console.log('🎉 Parent verification tables created successfully!');

    // Verify tables were created
    const [tables] = await connection.execute("SHOW TABLES LIKE 'parent_verifications'");
    if (tables.length > 0) {
      console.log('✅ parent_verifications table exists');
    }

    const [columns] = await connection.execute("SHOW COLUMNS FROM students LIKE 'parent_verified'");
    if (columns.length > 0) {
      console.log('✅ parent_verified column exists in students table');
    }

  } catch (error) {
    console.error('❌ Setup error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

setupParentVerification();
