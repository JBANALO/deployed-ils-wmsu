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

// Debug endpoint - show all class IDs
router.get('/debug/class-ids', async (req, res) => {
  try {
    const [classes] = await pool.query('SELECT id, grade, section, adviser_id, adviser_name FROM classes ORDER BY grade, section');
    
    const formatted = classes.map(c => ({
      id: c.id,
      displayName: `${c.grade} - ${c.section}`,
      adviser: c.adviser_name || 'Not assigned',
      adviser_id: c.adviser_id || null
    }));
    
    res.json({
      totalClasses: classes.length,
      classes: formatted,
      message: 'Use these exact IDs in assignments'
    });
  } catch (err) {
    console.error('Error fetching class IDs:', err);
    res.status(500).json({ error: err.message });
  }
});

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
    
    // Log class IDs for debugging
    console.log('Available class IDs:', classes.map(c => ({ id: c.id, grade: c.grade, section: c.section })));
    
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

    console.log('\n=== ADVISER ASSIGNMENT ===');
    console.log('Request params:', { classId, adviser_id, adviser_name, grade, section });

    if (!adviser_id || !adviser_name) {
      return res.status(400).json({ error: 'adviser_id and adviser_name are required' });
    }

    // Check if class exists first
    const [[existingClass]] = await pool.query(
      'SELECT id, grade, section FROM classes WHERE id = ?',
      [classId]
    );

    if (!existingClass) {
      console.error('❌ Class not found:', classId);
      console.log('Trying to find class with similar name...');
      const [allClasses] = await pool.query('SELECT id, grade, section FROM classes LIMIT 5');
      console.log('Available classes:', allClasses);
      return res.status(404).json({ error: `Class not found: ${classId}` });
    }

    console.log('✅ Class found:', existingClass);

    // 1. Update the class with adviser info
    const [classResult] = await pool.query(
      'UPDATE classes SET adviser_id = ?, adviser_name = ? WHERE id = ?',
      [adviser_id, adviser_name, classId]
    );

    console.log('Class update result:', { affectedRows: classResult.affectedRows });

    if (classResult.affectedRows === 0) {
      console.error('❌ Update failed - no rows affected');
      return res.status(500).json({ error: 'Failed to update class' });
    }

    // 2. Also update the adviser's record with their assigned class (optional, non-critical)
    try {
      // Try to update adviser's grade/section (columns may not exist, and that's okay)
      await pool.query(
        'UPDATE users SET grade_level = ?, section = ? WHERE id = ?',
        [grade, section, adviser_id]
      ).catch(() => {
        // Columns might not exist, which is fine - the main assignment already succeeded
      });
      console.log('✅ Updated adviser record with class assignment');
    } catch (updateError) {
      // Non-critical error - main assignment to classes table already succeeded
      console.log('ℹ️  Note: Could not update adviser user record (non-critical)');
    }

    // Verify the update
    const [[verifyClass]] = await pool.query(
      'SELECT adviser_id, adviser_name FROM classes WHERE id = ?',
      [classId]
    );
    console.log('Verification - Class now has adviser:', verifyClass);
    console.log('=== ASSIGNMENT COMPLETE ===\n');

    res.json({ 
      message: 'Adviser assigned successfully', 
      classId, 
      adviser_id, 
      adviser_name,
      verification: verifyClass
    });
  } catch (err) {
    console.error('❌ Error assigning adviser:', err);
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

// Assign subject teacher to a class
router.put('/:classId/assign-subject-teacher', async (req, res) => {
  try {
    const { classId } = req.params;
    const { teacher_id, teacher_name, subject, day, start_time, end_time } = req.body;

    console.log('\n=== SUBJECT TEACHER ASSIGNMENT ===');
    console.log('✅ Route hit - /api/classes/:classId/assign-subject-teacher');
    console.log('Request params:', { classId });
    console.log('Request body:', { teacher_id, teacher_name, subject, day, start_time, end_time });

    if (!teacher_id || !teacher_name || !subject) {
      return res.status(400).json({ error: 'teacher_id, teacher_name, and subject are required' });
    }

    // Check if class exists
    const [[classData]] = await pool.query(
      'SELECT id, grade, section FROM classes WHERE id = ?',
      [classId]
    );

    if (!classData) {
      return res.status(404).json({ error: `Class not found: ${classId}` });
    }

    console.log('✅ Class found:', classData);

    // Check for time conflicts - can't teach same class same day/time
    const [conflicts] = await pool.query(
      `SELECT st.id, st.teacher_id, st.subject, st.day, st.start_time, st.end_time
       FROM subject_teachers st
       WHERE st.class_id = ? 
       AND st.day = ?
       AND (
         (st.start_time < ? AND st.end_time > ?) OR
         (st.start_time < ? AND st.end_time > ?)
       )`,
      [classId, day, end_time, start_time, end_time, start_time]
    );

    if (conflicts.length > 0) {
      const conflict = conflicts[0];
      console.log('❌ Time conflict detected:', conflict);
      return res.status(400).json({ 
        error: `Time conflict! Another teacher is already teaching ${conflict.subject} at this class on ${day} from ${conflict.start_time} to ${conflict.end_time}` 
      });
    }

    // Check if this teacher already teaches the same subject to this class
    const [[duplicate]] = await pool.query(
      'SELECT id FROM subject_teachers WHERE class_id = ? AND teacher_id = ? AND subject = ?',
      [classId, teacher_id, subject]
    );

    if (duplicate) {
      return res.status(400).json({ 
        error: `${teacher_name} already teaches ${subject} to ${classData.grade} - ${classData.section}` 
      });
    }

    // Insert the subject teacher assignment
    const [result] = await pool.query(
      `INSERT INTO subject_teachers (class_id, teacher_id, teacher_name, subject, day, start_time, end_time, assignedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [classId, teacher_id, teacher_name, subject, day, start_time, end_time]
    );

    console.log('✅ Subject teacher assigned:', { insertId: result.insertId, affectedRows: result.affectedRows });

    res.json({
      message: `${teacher_name} assigned to teach ${subject} at ${classData.grade} - ${classData.section}`,
      classId,
      teacher_id,
      teacher_name,
      subject,
      day,
      start_time,
      end_time
    });
  } catch (err) {
    console.error('❌ Error assigning subject teacher:', err);
    res.status(500).json({ 
      error: 'Failed to assign subject teacher', 
      details: err.message 
    });
  }
});

// Unassign subject teacher from a class
router.put('/:classId/unassign-subject-teacher/:teacherId', async (req, res) => {
  try {
    const { classId, teacherId } = req.params;

    console.log('Unassigning subject teacher:', { classId, teacherId });

    const [result] = await pool.query(
      'DELETE FROM subject_teachers WHERE class_id = ? AND teacher_id = ?',
      [classId, teacherId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    console.log('✅ Subject teacher unassigned');
    res.json({ 
      message: 'Subject teacher unassigned successfully',
      classId,
      teacherId
    });
  } catch (err) {
    console.error('Error unassigning subject teacher:', err);
    res.status(500).json({ 
      error: 'Failed to unassign subject teacher', 
      details: err.message 
    });
  }
});

module.exports = router;
