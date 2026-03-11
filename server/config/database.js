// server/config/database.js
const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;
let dbAvailable = false;

const dbUrl = process.env.DATABASE_URL;

if (dbUrl) {
  // Production / Railway
  console.log('Using Railway DATABASE_URL configuration');
  pool = mysql.createPool({
    uri: dbUrl,
    dateStrings: true,  // Return DATE/DATETIME as strings, not JS Date objects
    waitForConnections: true,
    connectionLimit: 10,
  });
} else {
  // Local XAMPP
  console.log('Using local XAMPP database configuration');
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'wmsu_ed',
    port: parseInt(process.env.DB_PORT || '3307'),
    dateStrings: true,  // Return DATE/DATETIME as strings, not JS Date objects
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

// Test connection
pool.getConnection()
  .then(async connection => {
    console.log('✅ Database connected successfully!');
    connection.release();
    dbAvailable = true;

    const [rows] = await pool.query('SELECT DATABASE(), @@port AS port');
    console.log('Connected DB:', rows[0]['DATABASE()']);
    console.log('Connected PORT:', rows[0].port);
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    dbAvailable = false;
  });

// Query helper - don't check dbAvailable, let the pool handle connection
async function query(sql, params) {
  try {
    const [rows] = await pool.execute(sql, params);
    dbAvailable = true; // Mark as available on successful query
    return rows;
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  }
}

// Export
function isDatabaseAvailable() {
  return dbAvailable;
}

module.exports = { pool, query, isDatabaseAvailable };