// server/routes/studentRoutes.js
const express = require('express');
const studentController = require('../controllers/studentController');
const { query } = require('../config/database');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Middleware to verify user for grades
const verifyUserForGrades = (req, res, next) => {
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

// Check if teacher can enter grades
const canEnterGrade = async (user, student, subject) => {
  if (!user || !user.role) return false;
  if (user.role === 'admin') return true;
  
  if (user.role === 'teacher' || user.role === 'adviser' || user.role === 'subject_teacher') {
    const studentGrade = student.grade_level || student.gradeLevel;
    const studentSection = student.section;
    
    // Check if user is adviser for this class
    const adviserClasses = await query(
      'SELECT * FROM classes WHERE adviser_id = ? AND grade_level = ? AND section = ?',
      [user.id, studentGrade, studentSection]
    );
    if (adviserClasses && adviserClasses.length > 0) return true;
    
    // Check if user is subject teacher for this class and subject
    const classId = `${studentGrade.toLowerCase().replace(/\\s+/g, '-')}-${studentSection.toLowerCase()}`;
    const subjectTeacherRecords = await query(
      'SELECT * FROM subject_teachers WHERE teacher_id = ? AND class_id = ?',
      [user.id, classId]
    );
    
    if (subjectTeacherRecords && subjectTeacherRecords.length > 0) {
      for (const record of subjectTeacherRecords) {
        const subjects = record.subjects ? record.subjects.split(',').map(s => s.trim()) : [];
        if (subjects.includes(subject)) return true;
      }
    }
  }
  return false;
};

// PUT /:id/grades - Update grades for a student - MUST be before /:id route
router.put('/:id/grades', verifyUserForGrades, async (req, res) => {
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

      if (existingGrades && existingGrades.length > 0) {
        if (typeof gradeValue === 'object') {
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

// GET /:id/grades - Get grades for a student - MUST be before /:id route
router.get('/:id/grades', verifyUserForGrades, async (req, res) => {
  try {
    const { id } = req.params;
    const grades = await query('SELECT * FROM grades WHERE student_id = ?', [id]);

    const result = {};
    if (grades) {
      grades.forEach(r => {
        result[r.subject] = { q1: r.q1, q2: r.q2, q3: r.q3, q4: r.q4, average: parseFloat(r.average || 0) };
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

// Public routes
router.post('/', studentController.createStudent);
router.get('/', studentController.getStudents);
router.get('/pending', studentController.getPendingStudents);
router.get('/declined', studentController.getDeclinedStudents);
router.post('/regenerate-qr', studentController.regenerateQRCodes); // fix all QR codes to JSON format
router.get('/portal', studentController.getStudent); // Alias for student portal dashboard
router.get('/:id', studentController.getStudent);

// Protected routes (require authentication)
router.post('/:id/approve', studentController.approveStudent);
router.post('/:id/decline', studentController.declineStudent);
router.post('/:id/restore', studentController.restoreStudent);

module.exports = router;
