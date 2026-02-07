const mysql = require('mysql2/promise');

// Parse DATABASE_URL if available (Railway MySQL public URL)
let poolConfig;

if (process.env.DATABASE_URL) {
  console.log('Using DATABASE_URL for connection');
  poolConfig = {
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 60000
  };
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