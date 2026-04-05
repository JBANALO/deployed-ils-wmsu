// server/routes/studentRoutes.js
const express = require('express');
const studentController = require('../controllers/studentController');
const { query } = require('../config/database');
const jwt = require('jsonwebtoken');
const { readUsers } = require('../utils/fileStorage');
const { sendGradeReportEmail } = require('../utils/emailService');

// Ensure grades and students are school-year scoped
let gradesSyEnsured = false;
let studentSyEnsured = false;

const ensureGradesSchoolYearColumn = async () => {
  if (gradesSyEnsured) return;
  const cols = await query('SHOW COLUMNS FROM grades');
  const hasSy = cols.some(c => c.Field === 'school_year_id');
  if (!hasSy) {
    await query('ALTER TABLE grades ADD COLUMN school_year_id INT NULL');
    await query('CREATE INDEX idx_grades_school_year ON grades (school_year_id)');
  }
  gradesSyEnsured = true;
};

const ensureStudentSchoolYearColumn = async () => {
  if (studentSyEnsured) return;
  const cols = await query('SHOW COLUMNS FROM students');
  const hasSy = cols.some(c => c.Field === 'school_year_id');
  if (!hasSy) {
    await query('ALTER TABLE students ADD COLUMN school_year_id INT NULL');
    await query('CREATE INDEX idx_students_school_year ON students (school_year_id)');
  }
  studentSyEnsured = true;
};

const getActiveSchoolYear = async () => {
  const rows = await query('SELECT id, label FROM school_years WHERE is_active = 1 AND is_archived = 0 LIMIT 1');
  return rows[0] || null;
};

const router = express.Router();

// Middleware to verify user for grades - checks DB and JSON file
const verifyUserForGrades = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ status: 'error', message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-fallback');
    
    // JWT token has id field
    const userId = decoded.userId || decoded.id;
    console.log('verifyUserForGrades - Looking for user with ID:', userId);
    
    // Fetch user from database to get role (check users table first, then teachers)
    let users = await query('SELECT id, role FROM users WHERE id = ?', [userId]);
    
    if (!users || users.length === 0) {
      users = await query('SELECT id, role FROM teachers WHERE id = ?', [userId]);
    }
    
    // If not found in DB, check JSON file (where teachers/advisers may be stored)
    if (!users || users.length === 0) {
      try {
        const jsonUsers = readUsers();
        const jsonUser = jsonUsers.find(u => u.id === userId);
        if (jsonUser) {
          console.log('verifyUserForGrades - Found user in JSON file:', jsonUser.firstName, jsonUser.lastName, jsonUser.role);
          users = [{ id: jsonUser.id, role: jsonUser.role }];
        }
      } catch (jsonError) {
        console.log('verifyUserForGrades - Error reading JSON file:', jsonError.message);
      }
    }
    
    if (!users || users.length === 0) {
      console.log('verifyUserForGrades - User not found in any storage for ID:', userId);
      return res.status(401).json({ status: 'error', message: 'User not found' });
    }
    
    console.log('verifyUserForGrades - User found:', users[0]);
    req.user = users[0];
    next();
  } catch (err) {
    console.log('verifyUserForGrades - Token verification error:', err.message);
    return res.status(403).json({ status: 'error', message: 'Invalid or expired token' });
  }
};

// Check if teacher can enter grades
const canEnterGrade = async (user, student, subject, schoolYearId) => {
  console.log('canEnterGrade check:', { userId: user?.id, userRole: user?.role, subject });
  
  if (!user || !user.role) return false;
  if (user.role === 'admin') return true;
  
  // Allow adviser, teacher, or subject_teacher roles
  if (user.role === 'teacher' || user.role === 'adviser' || user.role === 'subject_teacher') {
    const studentGrade = student.grade_level || student.gradeLevel;
    const studentSection = student.section;
    const normalizeClassId = (value = '') => String(value || '').trim().toLowerCase().replace(/\s+/g, '-');
    const normalizeSubject = (value = '') => String(value || '').trim().toLowerCase();
    
    // Check if user is adviser for this class (classes table uses 'grade' not 'grade_level')
    const adviserClasses = await query(
      'SELECT * FROM classes WHERE adviser_id = ? AND grade = ? AND section = ? AND school_year_id = ?',
      [user.id, studentGrade, studentSection, schoolYearId]
    );
    console.log('Adviser check:', { userId: user.id, studentGrade, studentSection, found: adviserClasses?.length });
    if (adviserClasses && adviserClasses.length > 0) return true;
    
    // Check if user is subject teacher for this class and subject.
    // class_id may be stored as DB class.id OR as grade-section slug.
    const classSlug = `${String(studentGrade || '').toLowerCase().replace(/\s+/g, '-')}-${String(studentSection || '').toLowerCase().replace(/\s+/g, '-')}`;
    const classRows = await query(
      'SELECT id FROM classes WHERE grade = ? AND section = ? AND school_year_id = ?',
      [studentGrade, studentSection, schoolYearId]
    );
    const classIdentifiers = [normalizeClassId(classSlug), ...classRows.map((row) => normalizeClassId(row.id))]
      .filter(Boolean);
    const classPlaceholders = classIdentifiers.map(() => '?').join(', ');

    let teacherName = '';
    try {
      const userRows = await query(
        `SELECT firstName, lastName, first_name, last_name
         FROM users
         WHERE id = ?
         LIMIT 1`,
        [user.id]
      );
      if (userRows?.length) {
        const row = userRows[0];
        teacherName = `${row.firstName || row.first_name || ''} ${row.lastName || row.last_name || ''}`.trim();
      }
      if (!teacherName) {
        const teacherRows = await query(
          'SELECT first_name, last_name FROM teachers WHERE id = ? LIMIT 1',
          [user.id]
        );
        if (teacherRows?.length) {
          teacherName = `${teacherRows[0].first_name || ''} ${teacherRows[0].last_name || ''}`.trim();
        }
      }
    } catch (nameLookupError) {
      console.log('Subject teacher name lookup skipped:', nameLookupError.message);
    }

    console.log('Subject teacher check - class identifiers:', classIdentifiers, 'subject:', subject, 'teacherName:', teacherName);

    const subjectTeacherRecords = classIdentifiers.length > 0
      ? await query(
          `SELECT subject
           FROM subject_teachers
           WHERE LOWER(REPLACE(TRIM(class_id), ' ', '-')) IN (${classPlaceholders})
             AND school_year_id = ?
             AND (
               LOWER(TRIM(CAST(teacher_id AS CHAR))) = LOWER(TRIM(?))
               OR (? <> '' AND LOWER(TRIM(teacher_name)) = LOWER(TRIM(?)))
             )`,
          [...classIdentifiers, schoolYearId, String(user.id), teacherName, teacherName]
        )
      : [];
    console.log('Subject teacher records:', subjectTeacherRecords);
    
    if (subjectTeacherRecords && subjectTeacherRecords.length > 0) {
      for (const record of subjectTeacherRecords) {
        console.log('Comparing:', record.subject, 'vs', subject);
        if (normalizeSubject(record.subject) === normalizeSubject(subject)) return true;
      }
    }
  }
  console.log('canEnterGrade - Not authorized');
  return false;
};

// PUT /:id/grades - Update grades for a student - MUST be before /:id route
router.put('/:id/grades', verifyUserForGrades, async (req, res) => {
  try {
    await ensureStudentSchoolYearColumn();
    await ensureGradesSchoolYearColumn();
    const { id } = req.params;
    const { grades, average, quarter } = req.body;
    const user = req.user;

    const students = await query('SELECT * FROM students WHERE id = ?', [id]);
    if (!students || students.length === 0) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }
    const student = students[0];
    const targetSyId = student.school_year_id || (await getActiveSchoolYear())?.id;
    if (!targetSyId) {
      return res.status(400).json({ success: false, error: 'No active school year found for grading' });
    }

    // Filter out subjects that don't have any actual grades (skip 0, null, undefined)
    const subjectsWithGrades = Object.entries(grades).filter(([subject, gradeValue]) => {
      if (typeof gradeValue === 'object') {
        // Check if any quarter has a non-zero grade
        return Object.values(gradeValue).some(v => v && v > 0);
      }
      return gradeValue && gradeValue > 0;
    }).map(([subject]) => subject);
    
    console.log('Subjects with actual grades:', subjectsWithGrades);

    // Check authorization only for subjects that have actual grades
    for (const subject of subjectsWithGrades) {
      const canEdit = await canEnterGrade(user, student, subject, targetSyId);
      if (!canEdit) {
        return res.status(403).json({ 
          success: false,
          error: 'Unauthorized', 
          message: `You are not authorized to enter grades for ${subject}` 
        });
      }
    }

    // Update grades - grades table uses: student_id, subject, quarter, grade (one row per quarter)
    // Frontend sends grades like: { "Filipino": { q1: 90 }, "English": { q1: 85, q2: 88 }, ... }
    // Only process subjects that have actual grades
    for (const [subject, gradeValue] of Object.entries(grades)) {
      // gradeValue is an object like { q1: 90 } or { q1: 90, q2: 85, ... }
      if (typeof gradeValue === 'object') {
        for (const [qKey, gValue] of Object.entries(gradeValue)) {
          // Skip empty/zero grades
          if (!gValue || gValue <= 0) continue;
          
          // qKey is like "q1", convert to "Q1" for storage
          const quarterName = qKey.toUpperCase();
          
          const existingGrade = await query(
            'SELECT id FROM grades WHERE student_id = ? AND subject = ? AND quarter = ? AND school_year_id = ?',
            [id, subject, quarterName, targetSyId]
          );

          if (existingGrade && existingGrade.length > 0) {
            await query(
              'UPDATE grades SET grade = ?, teacher_id = ?, updated_at = NOW() WHERE student_id = ? AND subject = ? AND quarter = ? AND school_year_id = ?',
              [gValue, user.id, id, subject, quarterName, targetSyId]
            );
          } else {
            await query(
              'INSERT INTO grades (student_id, subject, quarter, grade, teacher_id, school_year_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
              [id, subject, quarterName, gValue, user.id, targetSyId]
            );
          }
        }
      } else {
        // Skip empty/zero grades
        if (!gradeValue || gradeValue <= 0) continue;
        
        // Fallback: single value with quarter from request body
        const quarterName = (quarter || 'q1').toUpperCase();
        
        const existingGrade = await query(
          'SELECT id FROM grades WHERE student_id = ? AND subject = ? AND quarter = ? AND school_year_id = ?',
          [id, subject, quarterName, targetSyId]
        );

        if (existingGrade && existingGrade.length > 0) {
          await query(
            'UPDATE grades SET grade = ?, teacher_id = ?, updated_at = NOW() WHERE student_id = ? AND subject = ? AND quarter = ? AND school_year_id = ?',
            [gradeValue, user.id, id, subject, quarterName, targetSyId]
          );
        } else {
          await query(
            'INSERT INTO grades (student_id, subject, quarter, grade, teacher_id, school_year_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
            [id, subject, quarterName, gradeValue, user.id, targetSyId]
          );
        }
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
    await ensureStudentSchoolYearColumn();
    await ensureGradesSchoolYearColumn();
    const { id } = req.params;
    const { schoolYearId } = req.query;
    const [studentRow] = await query('SELECT school_year_id FROM students WHERE id = ?', [id]);
    const targetSyId = schoolYearId || studentRow?.school_year_id || (await getActiveSchoolYear())?.id;
    const grades = await query('SELECT * FROM grades WHERE student_id = ? AND (school_year_id = ? OR school_year_id IS NULL)', [id, targetSyId]);

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

// POST /:id/send-grade-report — email parent a full grade breakdown (adviser only)
router.post('/:id/send-grade-report', verifyUserForGrades, async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherName } = req.body;

    const students = await query('SELECT * FROM students WHERE id = ?', [id]);
    if (!students?.length) return res.status(404).json({ success: false, error: 'Student not found' });
    const student = students[0];

    if (!student.parent_email) {
      return res.status(400).json({ success: false, error: 'No parent email on file for this student' });
    }

    const gradesRaw = await query(
      'SELECT subject, quarter, grade FROM grades WHERE student_id = ? ORDER BY subject, quarter',
      [id]
    );
    const gradesMap = {};
    for (const g of gradesRaw) {
      if (!gradesMap[g.subject]) gradesMap[g.subject] = { q1: null, q2: null, q3: null, q4: null };
      gradesMap[g.subject][g.quarter.toLowerCase()] = parseFloat(g.grade);
    }

    const studentName = [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ');
    const result = await sendGradeReportEmail({
      parentEmail: student.parent_email,
      studentName,
      gradeLevel: student.grade_level,
      section: student.section,
      gradesMap,
      teacherName
    });

    if (result.success) {
      res.json({ success: true, message: `Grade report sent to ${student.parent_email}` });
    } else {
      res.status(500).json({ success: false, error: result.error || 'Failed to send email' });
    }
  } catch (err) {
    console.error('Error sending grade report email:', err);
    res.status(500).json({ success: false, error: err.message });
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
router.put('/:id', studentController.updateStudent); // Update student
router.delete('/:id', studentController.deleteStudent); // Delete student

/**
 * Get student credentials (email, password)
 */
router.get('/:id/credentials', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get student details including password from database
    const [student] = await query(
      `SELECT id, lrn, password, 
       first_name as firstName, last_name as lastName, grade_level as gradeLevel, section,
       parent_email as parentEmail, student_email as studentEmail
       FROM students 
       WHERE id = ?`,
      [id]
    );

    if (!student || student.length === 0) {
      console.log(`Student not found with id: ${id}`);
      return res.status(404).json({ error: 'Student not found' });
    }

    const studentData = student[0];
    
    console.log('Student data from database:', studentData);
    
    // Check if required fields exist
    if (!studentData || !studentData.firstName || !studentData.lastName) {
      console.log(`Student missing required fields:`, studentData);
      return res.status(400).json({ error: 'Student data incomplete' });
    }
    
    // Determine which password to use
    let passwordToShow;
    
    if (studentData.password) {
      // Use stored password field
      passwordToShow = studentData.password;
      console.log(`Using stored password for student: ${studentData.lrn}`);
    } else {
      // Generate password using AdminCreateK6 pattern: WMSU{last4LRN}0000
      const last4LRN = studentData.lrn ? studentData.lrn.slice(-4).padStart(4, '0') : '0000';
      passwordToShow = `WMSU${last4LRN}0000`;
      console.log(`Generated password for student: ${studentData.lrn}, password: ${passwordToShow}`);
    }

    const credentials = {
      id: studentData.id,
      lrn: studentData.lrn,
      email: studentData.studentEmail || `${studentData.lrn}@wmsu.edu.ph`, // Use LRN-based email
      password: passwordToShow,
      firstName: studentData.firstName,
      lastName: studentData.lastName,
      gradeLevel: studentData.gradeLevel,
      section: studentData.section,
      username: studentData.lrn // Use LRN as username for login
    };

    console.log(`Returning credentials for student: ${studentData.lrn}`);
    res.json(credentials);
    
  } catch (err) {
    console.error('Error fetching student credentials:', err);
    res.status(500).json({ error: 'Failed to fetch student credentials' });
  }
});

// Protected routes (require authentication)
router.post('/:id/approve', studentController.approveStudent);
router.post('/:id/decline', studentController.declineStudent);
router.post('/:id/restore', studentController.restoreStudent);

module.exports = router;
