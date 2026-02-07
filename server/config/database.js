const mysql = require('mysql2/promise');

// Parse DATABASE_URL or MYSQL_PUBLIC_URL (Railway MySQL)
let poolConfig;
const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL;

if (dbUrl) {
  console.log('Using connection URL:', dbUrl.replace(/:[^:@]+@/, ':****@')); // Hide password
  try {
    // Parse mysql://user:pass@host:port/database
    const url = new URL(dbUrl);
    poolConfig = {
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1), // remove leading /
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 60000
    };
    console.log('Connecting to:', url.hostname + ':' + (url.port || 3306));
  } catch (err) {
    console.error('Failed to parse DATABASE_URL:', err.message);
    throw err;
  }
} else {
  console.log('Using individual DB_* variables for connection');
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'wmsu_ed',
    port: parseInt(process.env.DB_PORT || '3306'),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 60000
  };
}

const pool = mysql.createPool(poolConfig);

pool.getConnection()
  .then(connection => {
    console.log('✅ Database connected successfully!');
    connection.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
  });

async function query(sql, params) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('Query error:', error.message);
    throw error;
  }
}

module.exports = { pool, query };