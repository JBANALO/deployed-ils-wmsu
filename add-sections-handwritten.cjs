// Script to add sections from handwritten list
const mysql = require('mysql2/promise');
require('dotenv').config();

async function addSections() {
  let connection;

  try {
    console.log('🔗 Connecting to Railway MySQL...');
    connection = await mysql.createConnection(process.env.DATABASE_URL);
    console.log('✅ Connected to database\n');

    // Sections from the handwritten image: Grade - Section Name
    const sections = [
      ['Love',           'Kinder - Love'],
      ['Humility',       'Grade I - Humility'],
      ['Kindness',       'Grade II - Kindness'],
      ['Wisdom',         'Grade III - Wisdom'],
      ['Diligence',      'Grade III - Diligence'],
      ['Prudence',       'Grade IV - Prudence'],
      ['Generosity',     'Grade IV - Generosity'],
      ['Courage',        'Grade V - Courage'],
      ['Justice',        'Grade V - Justice'],
      ['Honesty',        'Grade VI - Honesty'],
      ['Loyalty',        'Grade VI - Loyalty'],
      ['Industry',       'Grade VI - Industry'],
      ['Responsibility', 'MG - Responsibility'],
    ];

    console.log('📝 Adding sections...\n');
    let added = 0;
    let skipped = 0;

    for (const [name, description] of sections) {
      // Check if already exists
      const [existing] = await connection.execute(
        'SELECT id FROM sections WHERE name = ?',
        [name]
      );

      if (existing.length > 0) {
        console.log(`⚠️  Skipped (already exists): ${name}`);
        skipped++;
      } else {
        await connection.execute(
          'INSERT INTO sections (name, description, is_archived) VALUES (?, ?, FALSE)',
          [name, description]
        );
        console.log(`✅ Added: ${name} - ${description}`);
        added++;
      }
    }

    console.log(`\n🎉 Done! Added: ${added}, Skipped: ${skipped}`);

    // Show all active sections
    const [allSections] = await connection.execute(
      'SELECT id, name, description FROM sections WHERE is_archived = FALSE ORDER BY id'
    );
    console.log('\n📋 All active sections in database:');
    allSections.forEach(s => {
      console.log(`  [${s.id}] ${s.name} - ${s.description || ''}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

addSections();
