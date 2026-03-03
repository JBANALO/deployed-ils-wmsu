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
      subjects: cls.subjects ? cls.subjects.split(',') : [],
      adviser_id: cls.adviser_id,
      adviser_name: cls.adviser_name
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
      subjects: classData.subjects ? classData.subjects.split(',') : [],
      adviser_id: classData.adviser_id,
      adviser_name: classData.adviser_name
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

// Get classes where user is the adviser
router.get('/adviser/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const [classes] = await pool.query(`
      SELECT c.*, 
             GROUP_CONCAT(DISTINCT st.subject ORDER BY st.subject) as subjects,
             GROUP_CONCAT(DISTINCT CONCAT_WS(':', st.teacher_id, st.teacher_name, st.subject) SEPARATOR '|') as subject_teachers_list
      FROM classes c
      LEFT JOIN subject_teachers st ON c.id = st.class_id
      WHERE c.adviser_id = ?
      GROUP BY c.id
      ORDER BY c.grade, c.section
    `, [userId]);
    
    const classesWithDetails = classes.map(cls => {
      const subjects = cls.subjects ? cls.subjects.split(',') : [];
      const subjectTeachersList = cls.subject_teachers_list ? cls.subject_teachers_list.split('|').map(st => {
        const [teacher_id, teacher_name, subject] = st.split(':');
        return { teacher_id, teacher_name, subject };
      }) : [];
      
      return {
        ...cls,
        subjects,
        subject_teachers: subjectTeachersList
      };
    });
    
    res.json({ data: classesWithDetails });
  } catch (err) {
    console.error('Error fetching adviser classes:', err);
    res.status(500).json({ error: 'Failed to fetch adviser classes' });
  }
});

// Get classes where user is a subject teacher
router.get('/subject-teacher/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const [classes] = await pool.query(`
      SELECT DISTINCT c.*, 
             GROUP_CONCAT(DISTINCT st.subject ORDER BY st.subject) as subjects,
             GROUP_CONCAT(DISTINCT CONCAT_WS(':', st.teacher_id, st.teacher_name, st.subject) SEPARATOR '|') as subject_teachers_list
      FROM classes c
      INNER JOIN subject_teachers st ON c.id = st.class_id
      WHERE st.teacher_id = ?
      GROUP BY c.id
      ORDER BY c.grade, c.section
    `, [userId]);
    
    const classesWithDetails = classes.map(cls => {
      const subjects = cls.subjects ? cls.subjects.split(',') : [];
      const subjectTeachersList = cls.subject_teachers_list ? cls.subject_teachers_list.split('|').map(st => {
        const [teacher_id, teacher_name, subject] = st.split(':');
        return { teacher_id, teacher_name, subject };
      }) : [];
      
      return {
        ...cls,
        subjects,
        subject_teachers: subjectTeachersList
      };
    });
    
    res.json({ data: classesWithDetails });
  } catch (err) {
    console.error('Error fetching subject teacher classes:', err);
    res.status(500).json({ error: 'Failed to fetch subject teacher classes' });
  }
});

// Assign adviser to a class
router.put('/:classId/assign', async (req, res) => {
  try {
    const { classId } = req.params;
    const { adviser_id, adviser_name, grade, section } = req.body;

    console.log('Assigning adviser:', { classId, adviser_id, adviser_name, grade, section });

    if (!adviser_id || !adviser_name) {
      return res.status(400).json({ error: 'adviser_id and adviser_name are required' });
    }

    // 1. Update the class with adviser info
    const [classResult] = await pool.query(
      'UPDATE classes SET adviser_id = ?, adviser_name = ? WHERE id = ?',
      [adviser_id, adviser_name, classId]
    );

    if (classResult.affectedRows === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // 2. Also update the adviser's record with their assigned class
    try {
      await pool.query(
        'UPDATE users SET grade_level = ?, section = ? WHERE id = ?',
        [grade, section, adviser_id]
      );
      console.log('✅ Updated adviser record with class assignment');
    } catch (updateError) {
      console.log('Note: Could not update adviser record, but class assignment succeeded');
    }

    console.log('✅ Adviser assigned successfully');
    res.json({ 
      message: 'Adviser assigned successfully', 
      classId, 
      adviser_id, 
      adviser_name 
    });
  } catch (err) {
    console.error('Error assigning adviser:', err);
    res.status(500).json({ error: 'Failed to assign adviser', details: err.message });
  }
});

// Unassign adviser from a class
router.put('/:classId/unassign', async (req, res) => {
  try {
    const { classId } = req.params;

    console.log('Unassigning adviser from class:', classId);

    // 1. Get the class info first to find the adviser
    const [[classData]] = await pool.query(
      'SELECT adviser_id, grade, section FROM classes WHERE id = ?',
      [classId]
    );

    // 2. Unassign from the class
    const [classResult] = await pool.query(
      'UPDATE classes SET adviser_id = NULL, adviser_name = NULL WHERE id = ?',
      [classId]
    );

    if (classResult.affectedRows === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // 3. Clear the class info from the adviser's record
    if (classData && classData.adviser_id) {
      try {
        await pool.query(
          'UPDATE users SET grade_level = NULL, section = NULL WHERE id = ?',
          [classData.adviser_id]
        );
        console.log('✅ Cleared adviser record');
      } catch (updateError) {
        console.log('Note: Could not update adviser record, but unassignment succeeded');
      }
    }

    console.log('✅ Adviser unassigned successfully');
    res.json({ 
      message: 'Adviser unassigned successfully', 
      classId 
    });
  } catch (err) {
    console.error('Error unassigning adviser:', err);
    res.status(500).json({ error: 'Failed to unassign adviser', details: err.message });
  }
});

module.exports = router;
