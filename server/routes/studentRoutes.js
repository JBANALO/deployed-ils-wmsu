// server/routes/studentRoutes.js
const express = require('express');
const studentController = require('../controllers/studentController');
const { query } = require('../config/database');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Middleware to verify user for grades - MUST fetch user from DB to get role
const verifyUserForGrades = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ status: 'error', message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-fallback');
    
    // Fetch user from database to get role (check users table first, then teachers)
    let users = await query('SELECT id, role FROM users WHERE id = ?', [decoded.id]);
    
    if (!users || users.length === 0) {
      users = await query('SELECT id, role FROM teachers WHERE id = ?', [decoded.id]);
    }
    
    if (!users || users.length === 0) {
      return res.status(401).json({ status: 'error', message: 'User not found' });
    }
    
    req.user = users[0];
    next();
  } catch (err) {
    return res.status(403).json({ status: 'error', message: 'Invalid or expired token' });
  }
};

// Check if teacher can enter grades
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
    if (adviserClasses && adviserClasses.length > 0) return true;
    
    // Check if user is subject teacher for this class and subject
    const classId = `${studentGrade.toLowerCase().replace(/\s+/g, '-')}-${studentSection.toLowerCase()}`;
    const subjectTeacherRecords = await query(
      'SELECT * FROM subject_teachers WHERE teacher_id = ? AND class_id = ?',
      [user.id, classId]
    );
    
    if (subjectTeacherRecords && subjectTeacherRecords.length > 0) {
      for (const record of subjectTeacherRecords) {
        // Each record has a single subject in 'subject' column (not 'subjects')
        if (record.subject === subject) return true;
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

    // Update grades - grades table uses: student_id, subject, quarter, grade (one row per quarter)
    for (const [subject, gradeValue] of Object.entries(grades)) {
      const quarterName = quarter || 'Q1';  // e.g., "Q1", "Q2", etc.
      
      const existingGrade = await query(
        'SELECT id FROM grades WHERE student_id = ? AND subject = ? AND quarter = ?',
        [id, subject, quarterName]
      );

      if (existingGrade && existingGrade.length > 0) {
        // Update existing grade
        await query(
          'UPDATE grades SET grade = ?, teacher_id = ?, updated_at = NOW() WHERE student_id = ? AND subject = ? AND quarter = ?',
          [gradeValue, user.id, id, subject, quarterName]
        );
      } else {
        // Insert new grade
        await query(
          'INSERT INTO grades (student_id, subject, quarter, grade, teacher_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
          [id, subject, quarterName, gradeValue, user.id]
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

    // grades table: each row is one subject + quarter combo
    // Need to restructure: { "Filipino": { q1: 90, q2: 85, ... }, "English": { q1: 88, ... } }
    const result = {};
    if (grades) {
      grades.forEach(r => {
        if (!result[r.subject]) {
          result[r.subject] = { q1: 0, q2: 0, q3: 0, q4: 0, average: 0 };
        }
        // Map quarter name to key (Q1 -> q1, etc.)
        const quarterKey = r.quarter.toLowerCase();
        result[r.subject][quarterKey] = parseFloat(r.grade) || 0;
      });
      // Calculate averages
      for (const subject of Object.keys(result)) {
        const g = result[subject];
        const vals = [g.q1, g.q2, g.q3, g.q4].filter(v => v > 0);
        g.average = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      }
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
