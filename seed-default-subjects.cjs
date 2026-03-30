// Seed default K-6 subjects into the active school year without touching existing rows
const mysql = require('mysql2/promise');
require('dotenv').config();

async function ensureColumns(connection) {
  try {
    await connection.execute('ALTER TABLE subjects ADD COLUMN grade_levels VARCHAR(100) DEFAULT NULL AFTER description');
    console.log('Added grade_levels column');
  } catch (err) {
    // ignore if already exists
  }

  try {
    await connection.execute('ALTER TABLE subjects ADD COLUMN school_year_id INT NULL AFTER grade_levels');
    console.log('Added school_year_id column');
  } catch (err) {
    // ignore if already exists
  }

  try {
    await connection.execute('CREATE INDEX idx_subjects_sy_name_grade ON subjects (school_year_id, name, grade_levels)');
    console.log('Created subjects index');
  } catch (err) {
    // ignore if already exists
  }
}

async function getActiveSchoolYear(connection) {
  const [rows] = await connection.execute(
    'SELECT id, label FROM school_years WHERE is_active = 1 AND is_archived = 0 LIMIT 1'
  );
  if (!rows.length) {
    throw new Error('No active school year found');
  }
  return rows[0];
}

async function seedSubjects() {
  let connection;
  try {
    console.log('Connecting to MySQL...');
    connection = await mysql.createConnection(process.env.DATABASE_URL);
    console.log('Connected.');

    await ensureColumns(connection);
    const activeSy = await getActiveSchoolYear(connection);
    console.log(`Active SY: ${activeSy.label} (id=${activeSy.id})`);

    const catalog = [
      { name: 'Filipino', description: 'Filipino Language', grades: ['1', '2', '3', '4', '5', '6'] },
      { name: 'English', description: 'English Language', grades: ['1', '2', '3', '4', '5', '6'] },
      { name: 'Mathematics', description: 'Mathematics', grades: ['1', '2', '3', '4', '5', '6'] },
      { name: 'Science', description: 'Science', grades: ['1', '2', '3', '4', '5', '6'] },
      { name: 'Araling Panlipunan', description: 'Social Studies', grades: ['1', '2', '3', '4', '5', '6'] },
      { name: 'MAPEH', description: 'Music, Arts, Physical Education, Health', grades: ['1', '2', '3', '4', '5', '6'] },
      { name: 'EsP/GMRC', description: 'Edukasyon sa Pagpapakatao / GMRC', grades: ['1', '2', '3', '4', '5', '6'] },
      { name: 'Mother Tongue', description: 'Mother Tongue-Based Education', grades: ['1', '2', '3'] },
      { name: 'EPP/TLE', description: 'Edukasyong Pantahanan at Pangkabuhayan / TLE', grades: ['4', '5', '6'] },
      { name: 'Computer/ICT', description: 'Information and Communications Technology', grades: ['4', '5', '6'] },
    ];

    let inserted = 0;
    let skipped = 0;

    for (const subject of catalog) {
      for (const grade of subject.grades) {
        const gradeLevels = grade; // single-grade entry for clarity in AdminSubjects tabs
        const [existing] = await connection.execute(
          'SELECT id FROM subjects WHERE name = ? AND grade_levels = ? AND school_year_id = ? LIMIT 1',
          [subject.name, gradeLevels, activeSy.id]
        );
        if (existing.length) {
          skipped += 1;
          continue;
        }

        await connection.execute(
          'INSERT INTO subjects (name, description, grade_levels, school_year_id, is_archived) VALUES (?, ?, ?, ?, FALSE)',
          [subject.name, subject.description, gradeLevels, activeSy.id]
        );
        inserted += 1;
        console.log(`  ✓ Added ${subject.name} (Grade ${grade})`);
      }
    }

    console.log(`Done. Inserted ${inserted}, skipped ${skipped} (already exist).`);

    for (const grade of ['1', '2', '3', '4', '5', '6']) {
      const [rows] = await connection.execute(
        'SELECT COUNT(*) as cnt FROM subjects WHERE school_year_id = ? AND FIND_IN_SET(?, grade_levels) AND is_archived = FALSE',
        [activeSy.id, grade]
      );
      console.log(`Grade ${grade}: ${rows[0].cnt} subjects`);
    }
  } catch (err) {
    console.error('Error seeding subjects:', err.message);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seedSubjects();
