// server/routes/classes.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyUser } = require('../middleware/auth');

// Fallback class data when MySQL is unavailable
const FALLBACK_CLASSES = [
  {
    id: 'grade-1-kindness',
    grade: 'Grade 1',
    section: 'Kindness',
    subjects: ['Math', 'English', 'Filipino', 'Science', 'Physical Education']
  },
  {
    id: 'grade-1-respect',
    grade: 'Grade 1',
    section: 'Respect',
    subjects: ['Math', 'English', 'Filipino', 'Science', 'Physical Education']
  },
  {
    id: 'grade-2-kindness',
    grade: 'Grade 2',
    section: 'Kindness',
    subjects: ['Math', 'Science', 'English']
  },
  {
    id: 'grade-2-respect',
    grade: 'Grade 2',
    section: 'Respect',
    subjects: ['Math', 'Science', 'English', 'Filipino']
  },
  {
    id: 'grade-3-kindness',
    grade: 'Grade 3',
    section: 'Kindness',
    subjects: ['Math', 'English', 'Science', 'Social Studies']
  },
  {
    id: 'grade-3-respect',
    grade: 'Grade 3',
    section: 'Respect',
    subjects: ['Math', 'English', 'Science', 'Social Studies', 'Health']
  }
];

// Get all classes with their subjects
router.get('/', async (req, res) => {
  try {
    const [classes] = await pool.query(`
      SELECT DISTINCT c.*, 
             GROUP_CONCAT(DISTINCT st.subject ORDER BY st.subject) as subjects
      FROM classes c
      LEFT JOIN subject_teachers st ON c.id = st.class_id
      GROUP BY c.id
      ORDER BY c.grade, c.section
    `);
    
    // Parse subjects into arrays
    const classesWithSubjects = classes.map(cls => ({
      ...cls,
      subjects: cls.subjects ? cls.subjects.split(',') : []
    }));
    
    res.json(classesWithSubjects);
  } catch (err) {
    console.error('Error fetching classes:', err);
    // Return fallback data
    res.json(FALLBACK_CLASSES);
  }
});

// Get subjects for a specific class
router.get('/:classId/subjects', async (req, res) => {
  try {
    const { classId } = req.params;
    
    const [subjects] = await pool.query(`
      SELECT DISTINCT subject
      FROM subject_teachers
      WHERE class_id = ?
      ORDER BY subject
    `, [classId]);
    
    const subjectList = subjects.map(s => s.subject);
    
    res.json({
      classId,
      subjects: subjectList
    });
  } catch (err) {
    console.error('Error fetching class subjects:', err);
    // Return fallback data for the class
    const fallbackClass = FALLBACK_CLASSES.find(c => c.id === req.params.classId);
    if (fallbackClass) {
      res.json({
        classId: req.params.classId,
        subjects: fallbackClass.subjects
      });
    } else {
      res.status(404).json({ error: 'Class not found' });
    }
  }
});

// Get class with full details and subjects
router.get('/:classId', async (req, res) => {
  try {
    const { classId } = req.params;
    
    const [[classData]] = await pool.query(`
      SELECT c.*, 
             GROUP_CONCAT(DISTINCT st.subject ORDER BY st.subject) as subjects
      FROM classes c
      LEFT JOIN subject_teachers st ON c.id = st.class_id
      WHERE c.id = ?
      GROUP BY c.id
    `, [classId]);
    
    if (!classData) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    const classWithSubjects = {
      ...classData,
      subjects: classData.subjects ? classData.subjects.split(',') : []
    };
    
    res.json(classWithSubjects);
  } catch (err) {
    console.error('Error fetching class:', err);
    // Return fallback data
    const fallbackClass = FALLBACK_CLASSES.find(c => c.id === req.params.classId);
    if (fallbackClass) {
      res.json(fallbackClass);
    } else {
      res.status(404).json({ error: 'Class not found' });
    }
  }
});

module.exports = router;
