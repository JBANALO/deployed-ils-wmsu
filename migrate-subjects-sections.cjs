// Migration script for subjects and sections tables
const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  let connection;
  
  try {
    console.log('🔗 Connecting to Railway MySQL...');
    connection = await mysql.createConnection(process.env.DATABASE_URL);
    console.log('✅ Connected to database\n');

    // Create subjects table
    console.log('📦 Creating subjects table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS subjects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description VARCHAR(255),
        is_archived BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ subjects table created');

    // Create sections table (master list of section names)
    console.log('📦 Creating sections table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description VARCHAR(255),
        is_archived BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ sections table created');

    // Insert default subjects based on K-6 DepEd curriculum
    console.log('\n📝 Inserting default subjects...');
    const defaultSubjects = [
      ['Filipino', 'National Language'],
      ['English', 'English Language'],
      ['Mathematics', 'Math and Problem Solving'],
      ['Science', 'Science and Technology'],
      ['Araling Panlipunan', 'Social Studies'],
      ['EPP/TLE', 'Edukasyong Pantahanan at Pangkabuhayan'],
      ['MAPEH', 'Music, Arts, Physical Education, Health'],
      ['Music', 'Music Education'],
      ['Arts', 'Art Education'],
      ['Physical Education', 'PE'],
      ['Health', 'Health Education'],
      ['ESP', 'Edukasyon sa Pagpapakatao'],
      ['Computer', 'ICT / Computer Education'],
      ['Mother Tongue', 'Mother Tongue-Based Multilingual Education']
    ];

    for (const [name, description] of defaultSubjects) {
      try {
        await connection.execute(
          'INSERT IGNORE INTO subjects (name, description) VALUES (?, ?)',
          [name, description]
        );
      } catch (err) {
        // Ignore duplicates
      }
    }
    console.log('✅ Default subjects inserted');

    // Insert default sections (creative Filipino names)
    console.log('\n📝 Inserting default sections...');
    const defaultSections = [
      ['Rizal', 'Named after Jose Rizal'],
      ['Mabini', 'Named after Apolinario Mabini'],
      ['Bonifacio', 'Named after Andres Bonifacio'],
      ['Luna', 'Named after Antonio Luna'],
      ['Del Pilar', 'Named after Marcelo H. del Pilar'],
      ['Jacinto', 'Named after Emilio Jacinto'],
      ['Silang', 'Named after Diego Silang'],
      ['Aguinaldo', 'Named after Emilio Aguinaldo'],
      ['Quezon', 'Named after Manuel Quezon'],
      ['Burgos', 'Named after Jose Burgos'],
      ['Gomez', 'Named after Mariano Gomez'],
      ['Zamora', 'Named after Jacinto Zamora'],
      ['Maharlika', 'Nobility'],
      ['Sampaguita', 'National Flower'],
      ['Narra', 'National Tree']
    ];

    for (const [name, description] of defaultSections) {
      try {
        await connection.execute(
          'INSERT IGNORE INTO sections (name, description) VALUES (?, ?)',
          [name, description]
        );
      } catch (err) {
        // Ignore duplicates
      }
    }
    console.log('✅ Default sections inserted');

    // Show what was created
    console.log('\n📋 Subjects in database:');
    const [subjects] = await connection.execute('SELECT * FROM subjects ORDER BY name');
    subjects.forEach(s => {
      console.log(`  📚 ${s.name} - ${s.description || 'No description'}`);
    });

    console.log('\n📋 Sections in database:');
    const [sections] = await connection.execute('SELECT * FROM sections ORDER BY name');
    sections.forEach(s => {
      console.log(`  🏫 ${s.name} - ${s.description || 'No description'}`);
    });

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connection closed');
    }
  }
}

migrate();
