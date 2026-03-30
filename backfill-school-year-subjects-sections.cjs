require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || process.env.MYSQLHOST,
    port: process.env.DB_PORT || process.env.MYSQLPORT,
    user: process.env.DB_USER || process.env.MYSQLUSER,
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
    database: process.env.DB_NAME || process.env.MYSQLDATABASE,
    multipleStatements: true,
  });

  const run = async () => {
    console.log('➡️ Starting backfill for subjects/sections school_year_id');

    const [syRows] = await pool.query('SELECT id, label FROM school_years WHERE is_active = 1 AND is_archived = 0 LIMIT 1');
    if (!syRows.length) {
      console.error('❌ No active school year found. Aborting.');
      return;
    }
    const activeSy = syRows[0];
    console.log(`Using active school year ${activeSy.label} (id=${activeSy.id})`);

    const ensureColumn = async (table, column, indexName) => {
      const [cols] = await pool.query(`SHOW COLUMNS FROM ${table} LIKE ?`, [column]);
      if (!cols.length) {
        console.log(`Adding ${column} to ${table}...`);
        await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} INT NULL`);
        await pool.query(`CREATE INDEX ${indexName} ON ${table} (${column})`);
        console.log(`✅ Added ${column} to ${table}`);
      } else {
        console.log(`✓ ${table}.${column} already exists`);
      }
    };

    await ensureColumn('subjects', 'school_year_id', 'idx_subjects_school_year');
    await ensureColumn('sections', 'school_year_id', 'idx_sections_school_year');

    const backfill = async (table) => {
      const [res] = await pool.query(`UPDATE ${table} SET school_year_id = ? WHERE school_year_id IS NULL`, [activeSy.id]);
      console.log(`Backfilled ${table}: updated ${res.affectedRows} rows to school_year_id=${activeSy.id}`);
    };

    await backfill('subjects');
    await backfill('sections');

    console.log('✅ Backfill complete');
  };

  try {
    await run();
  } catch (err) {
    console.error('Error during backfill:', err.message);
  } finally {
    await pool.end();
  }
})();
