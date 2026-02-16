// server/config/db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3307,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'wmsu_ed',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to MySQL');
    connection.release();
  } catch (err) {
    console.error('MySQL connection failed:', err.message);
  }
})();

const createTables = async () => {
  try {
    const queries = [
      // Users Table (for teachers/admins)
      `CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        full_name VARCHAR(300),
        username VARCHAR(100) UNIQUE,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'teacher',
        profile_pic LONGTEXT,
        approval_status VARCHAR(50) DEFAULT 'approved',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,

      // Students Table
      `CREATE TABLE IF NOT EXISTS students (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lrn VARCHAR(12) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        middle_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        full_name VARCHAR(300) NOT NULL,
        age INT NOT NULL,
        sex VARCHAR(10) NOT NULL,
        grade_level VARCHAR(50) NOT NULL,
        section VARCHAR(50) NOT NULL,
        contact VARCHAR(20) NOT NULL,
        wmsu_email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        profile_pic LONGTEXT,
        qr_code LONGTEXT,
        status VARCHAR(20) DEFAULT 'Active',
        attendance VARCHAR(10) DEFAULT '0%',
        average INT DEFAULT 0,
        created_by VARCHAR(50) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,

      // Delete Requests Table
      `CREATE TABLE IF NOT EXISTS delete_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT,
        student_name VARCHAR(200) NOT NULL,
        student_lrn VARCHAR(12) NOT NULL,
        requested_by VARCHAR(100) NOT NULL,
        request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reason TEXT,
        status VARCHAR(20) DEFAULT 'Pending',
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      )`,

      // Grades Table
      `CREATE TABLE IF NOT EXISTS grades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        subject VARCHAR(100) NOT NULL,
        q1 INT DEFAULT 0,
        q2 INT DEFAULT 0,
        q3 INT DEFAULT 0,
        q4 INT DEFAULT 0,
        average DECIMAL(5,2) GENERATED ALWAYS AS ((q1 + q2 + q3 + q4) / 4) STORED,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        UNIQUE KEY unique_student_subject (student_id, subject)
      )`
    ];

    for (const query of queries) {
      await pool.query(query);
    }
    console.log('All tables ready');
  } catch (err) {
    console.log('MySQL not available, using JSON file storage only');
  }
};

createTables();

module.exports = pool;