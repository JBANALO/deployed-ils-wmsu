const filteredClasses = classesArray.filter(
  c => String(c.school_year_id) === String(schoolYearId)
);
setClasses(filteredClasses);// Sync sections table with distinct gradeLevel/section combos from students for the active school year
const mysql = require('mysql2/promise');
require('dotenv').config();

async function ensureSectionColumns(connection) {
  try {
    await connection.execute('ALTER TABLE sections ADD COLUMN grade_level VARCHAR(50) NULL AFTER description');
  } catch (err) {
    /* already exists */
  }
  try {
    await connection.execute('ALTER TABLE sections ADD COLUMN school_year_id INT NULL');
  } catch (err) {
    /* already exists */
  }
  try {
    await connection.execute('CREATE INDEX idx_sections_school_year ON sections (school_year_id)');
  } catch (err) {
    /* already exists */
  }
  // enforce uniqueness per school year + name
  try {
    const [indexes] = await connection.execute('SHOW INDEX FROM sections');
    const hasGlobalUnique = indexes.some((idx) => idx.Key_name === 'name' && idx.Non_unique === 0);
    if (hasGlobalUnique) {
      await connection.execute('ALTER TABLE sections DROP INDEX name');
    }
  } catch (err) {
    /* ignore */
  }
  try {
    await connection.execute('CREATE UNIQUE INDEX idx_sections_sy_name ON sections (school_year_id, name)');
  } catch (err) {
    /* already exists */
  }
}

async function getActiveSchoolYear(connection) {
  const [rows] = await connection.execute(
    'SELECT id, label FROM school_years WHERE is_active = 1 AND is_archived = 0 LIMIT 1'
  );
  if (!rows.length) throw new Error('No active school year found');
  return rows[0];
}

async function main() {
  let connection;
  try {
    console.log('Connecting to MySQL...');
    connection = await mysql.createConnection(process.env.DATABASE_URL);
    console.log('Connected');

    await ensureSectionColumns(connection);
    const activeSy = await getActiveSchoolYear(connection);
    console.log(`Active SY: ${activeSy.label} (id=${activeSy.id})`);

    const [rows] = await connection.execute(
      "SELECT DISTINCT TRIM(gradeLevel) AS gradeLevel, TRIM(section) AS section FROM students WHERE gradeLevel IS NOT NULL AND section IS NOT NULL AND gradeLevel <> '' AND section <> ''"
    );

    let inserted = 0;
    let skipped = 0;
    for (const row of rows) {
      const gradeLevel = row.gradeLevel;
      const section = row.section;
      const [existing] = await connection.execute(
        'SELECT id FROM sections WHERE school_year_id = ? AND name = ? LIMIT 1',
        [activeSy.id, section]
      );
      if (existing.length) {
        skipped += 1;
        continue;
      }
      await connection.execute(
        'INSERT INTO sections (name, description, grade_level, school_year_id, is_archived) VALUES (?, NULL, ?, ?, FALSE)',
        [section, gradeLevel, activeSy.id]
      );
      inserted += 1;
      console.log(`  ✓ Added section ${section} (${gradeLevel})`);
    }

    console.log(`Done. Inserted ${inserted}, skipped ${skipped}.`);
  } catch (err) {
    console.error('Error syncing sections:', err.message);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
