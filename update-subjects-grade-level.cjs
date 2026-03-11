// Update subjects with grade levels based on DepEd K-6 curriculum
const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateSubjects() {
  let connection;
  
  try {
    console.log('🔗 Connecting to Railway MySQL...');
    connection = await mysql.createConnection(process.env.DATABASE_URL);
    console.log('✅ Connected to database\n');

    // Add grade_levels column if it doesn't exist
    try {
      await connection.execute('ALTER TABLE subjects ADD COLUMN grade_levels VARCHAR(100) DEFAULT NULL AFTER description');
      console.log('✅ Added grade_levels column');
    } catch (err) {
      console.log('ℹ️ grade_levels column already exists');
    }

    // Clear existing subjects
    console.log('\n🗑️ Clearing existing subjects...');
    await connection.execute('DELETE FROM subjects');

    // Insert subjects per grade level based on DepEd K-6 curriculum
    console.log('\n📝 Inserting subjects per grade level...\n');
    
    const subjects = [
      // Grade 1 subjects
      { name: 'GMRC (Grade 1)', description: 'Good Manners and Right Conduct', grade_levels: '1' },
      { name: 'Reading (Grade 1)', description: 'Reading and Literacy', grade_levels: '1' },
      { name: 'Math (Grade 1)', description: 'Mathematics', grade_levels: '1' },
      { name: 'Makabansa (Grade 1)', description: 'Nationalism/Civics', grade_levels: '1' },
      { name: 'Language (Grade 1)', description: 'Language Arts', grade_levels: '1' },
      
      // Grade 2 subjects
      { name: 'GMRC (Grade 2)', description: 'Good Manners and Right Conduct', grade_levels: '2' },
      { name: 'Filipino (Grade 2)', description: 'Filipino Language', grade_levels: '2' },
      { name: 'Makabansa (Grade 2)', description: 'Nationalism/Civics', grade_levels: '2' },
      { name: 'Math (Grade 2)', description: 'Mathematics', grade_levels: '2' },
      { name: 'English (Grade 2)', description: 'English Language', grade_levels: '2' },
      
      // Grade 3 subjects
      { name: 'GMRC (Grade 3)', description: 'Good Manners and Right Conduct', grade_levels: '3' },
      { name: 'Filipino (Grade 3)', description: 'Filipino Language', grade_levels: '3' },
      { name: 'Math (Grade 3)', description: 'Mathematics', grade_levels: '3' },
      { name: 'Makabansa (Grade 3)', description: 'Nationalism/Civics', grade_levels: '3' },
      { name: 'English (Grade 3)', description: 'English Language', grade_levels: '3' },
      { name: 'Science (Grade 3)', description: 'Science', grade_levels: '3' },
      
      // Grade 4-6 subjects (shared)
      { name: 'GMRC', description: 'Good Manners and Right Conduct', grade_levels: '4,5,6' },
      { name: 'English', description: 'English Language', grade_levels: '4,5,6' },
      { name: 'Araling Panlipunan', description: 'Social Studies (AP)', grade_levels: '4,5,6' },
      { name: 'Mathematics', description: 'Mathematics', grade_levels: '4,5,6' },
      { name: 'Filipino', description: 'Filipino Language', grade_levels: '4,5,6' },
      { name: 'EPP', description: 'Edukasyong Pantahanan at Pangkabuhayan', grade_levels: '4,5,6' },
      { name: 'Science', description: 'Science and Technology', grade_levels: '4,5,6' },
      { name: 'MAPEH', description: 'Music, Arts, Physical Education, Health', grade_levels: '4,5,6' },
    ];

    for (const subject of subjects) {
      await connection.execute(
        'INSERT INTO subjects (name, description, grade_levels) VALUES (?, ?, ?)',
        [subject.name, subject.description, subject.grade_levels]
      );
      console.log(`  ✓ ${subject.name} (Grade ${subject.grade_levels})`);
    }

    // Show summary per grade level
    console.log('\n📊 Summary per Grade Level:');
    for (let grade = 1; grade <= 6; grade++) {
      const [rows] = await connection.execute(
        'SELECT name FROM subjects WHERE FIND_IN_SET(?, grade_levels) ORDER BY name',
        [grade.toString()]
      );
      console.log(`\n  Grade ${grade}: ${rows.length} subjects`);
      rows.forEach(r => console.log(`    - ${r.name}`));
    }

    console.log('\n✅ Subjects updated successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connection closed');
    }
  }
}

updateSubjects();
