// migrate-school-years.cjs
// Run: node migrate-school-years.cjs

require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'autorack.proxy.rlwy.net',
  port: parseInt(process.env.DB_PORT) || 47541,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'ELWrNoKggzYSMBOuHotVbMikeIBMxnxy',
  database: process.env.DB_NAME || 'railway',
  connectTimeout: 30000,
  ssl: { rejectUnauthorized: false }
};

async function migrate() {
  let connection;
  try {
    console.log('🔗 Connecting to Railway MySQL...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Create school_years table
    console.log('\n📦 Creating school_years table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS school_years (
        id INT AUTO_INCREMENT PRIMARY KEY,
        label VARCHAR(50) NOT NULL COMMENT 'e.g., 2025-2026',
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_active TINYINT(1) DEFAULT 0 COMMENT '1 = active, 0 = inactive',
        is_archived TINYINT(1) DEFAULT 0 COMMENT '1 = archived, 0 = not archived',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_label (label)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ school_years table created');

    // Check if default school year exists
    const [existing] = await connection.execute(
      'SELECT * FROM school_years WHERE label = ?',
      ['2025-2026']
    );

    if (existing.length === 0) {
      console.log('\n📝 Inserting default school year 2025-2026...');
      await connection.execute(`
        INSERT INTO school_years (label, start_date, end_date, is_active) 
        VALUES ('2025-2026', '2025-06-01', '2026-03-31', 1)
      `);
      console.log('✅ Default school year inserted');
    } else {
      console.log('✅ Default school year already exists');
    }

    // Show all school years
    const [rows] = await connection.execute('SELECT * FROM school_years');
    console.log('\n📋 School Years in database:');
    rows.forEach(row => {
      const status = row.is_active ? '🟢 ACTIVE' : (row.is_archived ? '📦 ARCHIVED' : '⚪');
      console.log(`  ${status} ${row.label} (${row.start_date} - ${row.end_date})`);
    });

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connection closed');
    }
  }
}

migrate();
