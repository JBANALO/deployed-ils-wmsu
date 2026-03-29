const express = require('express');
const router = express.Router();
const gradeController = require('../controllers/gradeControllerMySQL');
const { query } = require('../config/database');
const jwt = require('jsonwebtoken');

// Middleware to verify user
const verifyUser = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ status: 'error', message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-fallback', (err, user) => {
    if (err) {
      return res.status(403).json({ status: 'error', message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Check if teacher can enter grades for this student and subject
const canEnterGrade = async (user, student, subject) => {
  if (!user || !user.role) return false;
  
  if (user.role === 'admin') return true;
  
  if (user.role === 'teacher' || user.role === 'adviser' || user.role === 'subject_teacher') {
    const studentGrade = student.grade_level || student.gradeLevel;
    const studentSection = student.section;
    
    // Check if user is adviser for this class (classes table uses 'grade' not 'grade_level')
    const adviserClasses = await query(
      'SELECT * FROM classes WHERE adviser_id = ? AND grade = ? AND section = ?',
      [user.id, studentGrade, studentSection]
    );
    
    if (adviserClasses.length > 0) return true;
    
    // Check if user is subject teacher for this class and subject
    const classId = `${studentGrade.toLowerCase().replace(/\s+/g, '-')}-${studentSection.toLowerCase()}`;
    const subjectTeacherRecords = await query(
      'SELECT * FROM subject_teachers WHERE teacher_id = ? AND class_id = ?',
      [user.id, classId]
    );
    
    if (subjectTeacherRecords.length > 0) {
      for (const record of subjectTeacherRecords) {
        // Each record has a single subject in 'subject' column (not 'subjects')
        if (record.subject === subject) return true;
      }
    }
  }
  
  return false;
};

// GET /progress - Grade entry progress for the logged-in teacher (by class/subject)
router.get('/progress', verifyUser, async (req, res) => {
  try {
    const user = req.user;
    if (!user?.id) {
      return res.status(401).json({ success: false, message: 'User not found in token' });
    }

    // Allow only teaching roles
    if (!['teacher', 'adviser', 'subject_teacher', 'admin'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Unauthorized role' });
    }

    const allowedQuarters = ['q1', 'q2', 'q3', 'q4'];
    const quarter = allowedQuarters.includes((req.query.quarter || '').toLowerCase())
      ? req.query.quarter.toLowerCase()
      : 'q1';

    // Classes where the user is subject teacher
    const subjectClasses = await query(
      `SELECT st.class_id, st.subject, c.grade, c.section
       FROM subject_teachers st
       JOIN classes c ON c.id = st.class_id
       WHERE st.teacher_id = ?`,
      [user.id]
    );

    // If adviser, also include their advisory classes for all subjects (progress will be aggregated across subjects)
    let adviserClasses = [];
    if (user.role === 'adviser' || user.role === 'admin') {
      adviserClasses = await query(
        'SELECT id as class_id, grade, section FROM classes WHERE adviser_id = ?',
        [user.id]
      );
    }

    const classSubjectPairs = [];

    // Subject teacher assignments (explicit subjects)
    subjectClasses.forEach(row => {
      classSubjectPairs.push({
        classId: row.class_id,
        grade: row.grade,
        section: row.section,
        subject: row.subject
      });
    });

    // Adviser classes — treat each subject as "All Subjects" bucket if no explicit subject
    adviserClasses.forEach(row => {
      classSubjectPairs.push({
        classId: row.class_id,
        grade: row.grade,
        section: row.section,
        subject: 'All Subjects'
      });
    });

    // Deduplicate class/subject pairs
    const seen = new Set();
    const uniquePairs = classSubjectPairs.filter(pair => {
      const key = `${pair.classId}|${pair.subject}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const items = [];
    let totalStudentsAll = 0;
    let gradedAll = 0;

    for (const pair of uniquePairs) {
      const { grade, section, subject } = pair;

      // Total students in the class
      const totalRows = await query(
        'SELECT COUNT(*) as cnt FROM students WHERE grade_level = ? AND section = ?',
        [grade, section]
      );
      const total = totalRows?.[0]?.cnt || 0;

      // Graded students (quarter column not null/empty) for this subject
      let graded = 0;
      if (subject === 'All Subjects') {
        const gradedRows = await query(
          `SELECT COUNT(DISTINCT s.id) as cnt
           FROM students s
           LEFT JOIN grades g ON g.student_id = s.id
           WHERE s.grade_level = ? AND s.section = ? AND (
             g.${quarter} IS NOT NULL AND g.${quarter} != ''
           )`,
          [grade, section]
        );
        graded = gradedRows?.[0]?.cnt || 0;
      } else {
        const gradedRows = await query(
          `SELECT COUNT(DISTINCT s.id) as cnt
           FROM students s
           LEFT JOIN grades g ON g.student_id = s.id AND g.subject = ?
           WHERE s.grade_level = ? AND s.section = ? AND (
             g.${quarter} IS NOT NULL AND g.${quarter} != ''
           )`,
          [subject, grade, section]
        );
        graded = gradedRows?.[0]?.cnt || 0;
      }

      const percent = total > 0 ? Math.round((graded / total) * 100) : 0;
      totalStudentsAll += total;
      gradedAll += graded;

      items.push({
        classId: pair.classId,
        grade,
        section,
        subject,
        totalStudents: total,
        gradedStudents: graded,
        percent,
        quarter
      });
    }

    const overallPercent = totalStudentsAll > 0 ? Math.round((gradedAll / totalStudentsAll) * 100) : 0;

    res.json({
      success: true,
      data: {
        quarter,
        items,
        summary: {
          totalStudents: totalStudentsAll,
          gradedStudents: gradedAll,
          percent: overallPercent
        }
      }
    });
  } catch (err) {
    console.error('Error computing grade progress:', err);
    res.status(500).json({ success: false, message: 'Failed to compute progress', error: err.message });
  }
});

// PUT /:id/grades - Update grades for a student (used by EditGrades page)
router.put('/:id/grades', verifyUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { grades, average, quarter } = req.body;
    const user = req.user;

    const students = await query('SELECT * FROM students WHERE id = ?', [id]);
    if (!students || students.length === 0) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }
    const student = students[0];

    // Check authorization for each subject
    for (const subject of Object.keys(grades)) {
      const canEdit = await canEnterGrade(user, student, subject);
      if (!canEdit) {
        return res.status(403).json({ 
          success: false,
          error: 'Unauthorized', 
          message: `You are not authorized to enter grades for ${subject}` 
        });
      }
    }

    // Update grades
    for (const [subject, gradeValue] of Object.entries(grades)) {
      const quarterCol = quarter || 'q1';
      
      const existingGrades = await query(
        'SELECT id FROM grades WHERE student_id = ? AND subject = ?',
        [id, subject]
      );

      if (existingGrades.length > 0) {
        if (typeof gradeValue === 'object') {
          // Multiple quarters
          const updates = [];
          const values = [];
          for (const [q, val] of Object.entries(gradeValue)) {
            updates.push(`${q} = ?`);
            values.push(val || 0);
          }
          values.push(id, subject);
          await query(`UPDATE grades SET ${updates.join(', ')} WHERE student_id = ? AND subject = ?`, values);
        } else {
          await query(`UPDATE grades SET ${quarterCol} = ? WHERE student_id = ? AND subject = ?`, [gradeValue, id, subject]);
        }
      } else {
        const newGrade = { q1: 0, q2: 0, q3: 0, q4: 0 };
        if (typeof gradeValue === 'object') {
          Object.assign(newGrade, gradeValue);
        } else {
          newGrade[quarterCol] = gradeValue;
        }
        await query(
          'INSERT INTO grades (student_id, subject, q1, q2, q3, q4) VALUES (?, ?, ?, ?, ?, ?)',
          [id, subject, newGrade.q1, newGrade.q2, newGrade.q3, newGrade.q4]
        );
      }
    }

    await query('UPDATE students SET average = ? WHERE id = ?', [average || 0, id]);

    res.json({ success: true, message: `${quarter || 'Q1'} grades updated`, average });
  } catch (err) {
    console.error('Error saving grades:', err);
    res.status(500).json({ success: false, error: 'Failed', message: err.message });
  }
});

// GET /:id/grades - Get grades for a student
router.get('/:id/grades', verifyUser, async (req, res) => {
  try {
    const { id } = req.params;
    const grades = await query('SELECT * FROM grades WHERE student_id = ?', [id]);

    const result = {};
    grades.forEach(r => {
      result[r.subject] = { q1: r.q1, q2: r.q2, q3: r.q3, q4: r.q4, average: parseFloat(r.average || 0) };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

// Get all grades (for dashboard stats)
router.get('/', gradeController.getAllGrades);

// Create a new grade
router.post('/', gradeController.createGrade);

// Get grades for a student (old format)
router.get('/student/:studentId', gradeController.getGradesByStudent);

// Update a grade
router.put('/:id', gradeController.updateGrade);

// Delete a grade
router.delete('/:id', gradeController.deleteGrade);

module.exports = router;
