// Populate classes and subject teacher assignments
const pool = require('./config/db');

const populate = async () => {
  try {
    console.log('Populating classes and subject teacher assignments...');
    
    const teacherId = 'ba930204-ff2a-11f0-ac97-388d3d8f1ae5';
    const teacherName = 'Josie Banalo';
    
    // Check if classes already exist
    const [existingClasses] = await pool.query('SELECT id FROM classes LIMIT 1');
    
    if (existingClasses.length === 0) {
      console.log('1. Inserting sample classes...');
      
      const classes = [
        { id: 'grade-1-kindness', grade: 'Grade 1', section: 'Kindness' },
        { id: 'grade-2-kindness', grade: 'Grade 2', section: 'Kindness' },
        { id: 'grade-3-diligence', grade: 'Grade 3', section: 'Diligence' },
        { id: 'grade-1-humility', grade: 'Grade 1', section: 'Humility' },
        { id: 'grade-3-wisdom', grade: 'Grade 3', section: 'Wisdom' }
      ];
      
      for (const cls of classes) {
        await pool.query(
          'INSERT INTO classes (id, grade, section) VALUES (?, ?, ?)',
          [cls.id, cls.grade, cls.section]
        );
      }
      console.log(`   ✓ Inserted ${classes.length} classes`);
    } else {
      console.log('   Classes already exist');
    }
    
    // Assign teacher as adviser to some classes
    console.log('2. Assigning teacher as adviser...');
    await pool.query(
      'UPDATE classes SET adviser_id = ?, adviser_name = ? WHERE id IN (?, ?)',
      [teacherId, teacherName, 'grade-1-kindness', 'grade-2-kindness']
    );
    console.log('   ✓ Assigned as adviser to 2 classes');
    
    // Assign as subject teacher
    console.log('3. Assigning as subject teacher...');
    const [classes] = await pool.query('SELECT id FROM classes LIMIT 3');
    
    for (const cls of classes) {
      for (const subject of ['English', 'Filipino', 'Mathematics']) {
        try {
          await pool.query(
            `INSERT INTO subject_teachers (class_id, teacher_id, teacher_name, subject)
             VALUES (?, ?, ?, ?)`,
            [cls.id, teacherId, teacherName, subject]
          );
        } catch (err) {
          // Ignore duplicate key errors
        }
      }
    }
    console.log(`   ✓ Assigned as subject teacher for ${classes.length} classes`);
    
    console.log('\n✓ Setup complete!');
    process.exit(0);
  } catch (err) {
    console.error('Population error:', err);
    process.exit(1);
  }
};

populate();
