// server/routes/studentRoutes.js
const express = require('express');
const studentController = require('../controllers/studentController');
const { query } = require('../config/database');
const jwt = require('jsonwebtoken');
const { readUsers } = require('../utils/fileStorage');
const { sendGradeReportEmail, sendAdviserGradeSubmissionEmail } = require('../utils/emailService');

// Ensure grades and students are school-year scoped
let gradesSyEnsured = false;
let studentSyEnsured = false;
let notificationsEnsured = false;
let schoolYearQuarterColumnsEnsured = false;
let rankingPublicationsEnsured = false;

const normalizeRole = (value = '') => String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');

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

const ensureNotificationsTable = async () => {
  if (notificationsEnsured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(100) NOT NULL,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      meta_json JSON NULL,
      is_read TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_notifications_user_created (user_id, created_at),
      INDEX idx_notifications_user_unread (user_id, is_read)
    )
  `);
  notificationsEnsured = true;
};

const ensureSchoolYearQuarterColumns = async () => {
  if (schoolYearQuarterColumnsEnsured) return;

  const cols = await query('SHOW COLUMNS FROM school_years');
  const hasQ1 = cols.some(c => c.Field === 'q1_end_date');
  const hasQ2 = cols.some(c => c.Field === 'q2_end_date');
  const hasQ3 = cols.some(c => c.Field === 'q3_end_date');
  const hasQ4 = cols.some(c => c.Field === 'q4_end_date');

  if (!hasQ1) await query('ALTER TABLE school_years ADD COLUMN q1_end_date DATE NULL');
  if (!hasQ2) await query('ALTER TABLE school_years ADD COLUMN q2_end_date DATE NULL');
  if (!hasQ3) await query('ALTER TABLE school_years ADD COLUMN q3_end_date DATE NULL');
  if (!hasQ4) await query('ALTER TABLE school_years ADD COLUMN q4_end_date DATE NULL');

  schoolYearQuarterColumnsEnsured = true;
};

const ensureRankingPublicationsTable = async () => {
  if (rankingPublicationsEnsured) return;

  await query(`
    CREATE TABLE IF NOT EXISTS ranking_publications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      school_year_id INT NOT NULL,
      grade_level VARCHAR(60) NOT NULL,
      section VARCHAR(120) NOT NULL,
      ranking_type ENUM('overall', 'quarter', 'subject') NOT NULL,
      quarter_key VARCHAR(16) NOT NULL DEFAULT '',
      subject_name VARCHAR(255) NOT NULL DEFAULT '',
      student_id VARCHAR(100) NOT NULL,
      student_name VARCHAR(255) NULL,
      rank_position INT NOT NULL,
      score DECIMAL(7,2) NULL,
      total_students INT NOT NULL,
      published_by VARCHAR(100) NULL,
      published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_ranking_publication_entry (
        school_year_id,
        grade_level,
        section,
        ranking_type,
        quarter_key,
        subject_name,
        student_id
      ),
      INDEX idx_ranking_publication_lookup (
        school_year_id,
        grade_level,
        section,
        ranking_type,
        quarter_key,
        subject_name
      ),
      INDEX idx_ranking_publication_student (student_id, school_year_id)
    )
  `);

  rankingPublicationsEnsured = true;
};

const quarterLabel = (qKey = '') => {
  const map = { q1: 'Quarter 1', q2: 'Quarter 2', q3: 'Quarter 3', q4: 'Quarter 4' };
  return map[String(qKey || '').toLowerCase()] || String(qKey || '').toUpperCase();
};

const normalizeQuarterKey = (value = '') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'q1' || normalized === 'q2' || normalized === 'q3' || normalized === 'q4') return normalized;
  return '';
};

const EDIT_WINDOW_HOURS = 24;
const EDIT_WINDOW_MS = EDIT_WINDOW_HOURS * 60 * 60 * 1000;

const getEditWindowExpiry = (gradeRow) => {
  const baseRaw = gradeRow?.updated_at || gradeRow?.created_at;
  if (!baseRaw) return null;
  const baseDate = new Date(baseRaw);
  if (Number.isNaN(baseDate.getTime())) return null;
  return new Date(baseDate.getTime() + EDIT_WINDOW_MS);
};

const isEditWindowExpired = (gradeRow, now = new Date()) => {
  const expiry = getEditWindowExpiry(gradeRow);
  if (!expiry) return false;
  return now > expiry;
};

const sanitizeEmail = (value = '') => {
  const email = String(value || '').trim();
  if (!email) return '';
  return email.replace(/@wmsu\.edu\.ph@wmsu\.edu\.ph$/i, '@wmsu.edu.ph');
};

const isValidEmail = (value = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
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
  const normalizedRole = normalizeRole(user?.role);
  
  if (!user || !user.role) return false;
  if (normalizedRole === 'admin') return true;
  
  // Allow adviser, teacher, or subject_teacher roles
  if (normalizedRole === 'teacher' || normalizedRole === 'adviser' || normalizedRole === 'subject_teacher') {
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

    // Fallback: adviser assignment may still use older account ID; try adviser_name match.
    if (!adviserClasses || adviserClasses.length === 0) {
      try {
        const nameRows = await query(
          `SELECT first_name, last_name, firstName, lastName
           FROM users
           WHERE id = ?
           LIMIT 1`,
          [user.id]
        );
        const nameRow = nameRows?.[0];
        const first = String(nameRow?.first_name || nameRow?.firstName || '').trim();
        const last = String(nameRow?.last_name || nameRow?.lastName || '').trim();
        if (first && last) {
          const adviserByName = await query(
            `SELECT id
             FROM classes
             WHERE grade = ? AND section = ? AND school_year_id = ?
               AND adviser_name LIKE ? AND adviser_name LIKE ?
             LIMIT 1`,
            [studentGrade, studentSection, schoolYearId, `%${first}%`, `%${last}%`]
          );
          if (adviserByName?.length > 0) {
            return true;
          }
        }
      } catch (nameFallbackError) {
        console.log('Adviser name fallback skipped:', nameFallbackError.message);
      }
    }
    
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
    await ensureNotificationsTable();
    await ensureSchoolYearQuarterColumns();
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

    // Enforce per-quarter editing deadlines for non-admin users.
    const normalizedRoleForDeadline = normalizeRole(user?.role);
    if (normalizedRoleForDeadline !== 'admin') {
      const quarterKeysFromPayload = new Set();
      for (const [, gradeValue] of Object.entries(grades || {})) {
        if (typeof gradeValue === 'object' && gradeValue !== null) {
          Object.entries(gradeValue).forEach(([qKey, gValue]) => {
            if (gValue && Number(gValue) > 0) {
              quarterKeysFromPayload.add(String(qKey || '').toLowerCase());
            }
          });
        } else if (gradeValue && Number(gradeValue) > 0) {
          quarterKeysFromPayload.add(String(quarter || 'q1').toLowerCase());
        }
      }

      if (quarterKeysFromPayload.size > 0) {
        const syRows = await query(
          `SELECT q1_end_date, q2_end_date, q3_end_date, q4_end_date
           FROM school_years
           WHERE id = ?
           LIMIT 1`,
          [targetSyId]
        );
        const syRow = syRows?.[0] || null;

        if (syRow) {
          const now = new Date();
          for (const qKey of quarterKeysFromPayload) {
            if (!['q1', 'q2', 'q3', 'q4'].includes(qKey)) continue;
            const deadlineRaw = syRow[`${qKey}_end_date`];
            if (!deadlineRaw) continue;

            const deadline = new Date(deadlineRaw);
            deadline.setHours(23, 59, 59, 999);

            if (now > deadline) {
              return res.status(403).json({
                success: false,
                error: 'Quarter deadline passed',
                message: `${quarterLabel(qKey)} is already closed for editing.`
              });
            }
          }
        }
      }
    }

    const attemptedGradeEntries = [];
    for (const [subject, gradeValue] of Object.entries(grades || {})) {
      if (typeof gradeValue === 'object' && gradeValue !== null) {
        Object.entries(gradeValue).forEach(([qKey, gValue]) => {
          if (gValue && Number(gValue) > 0) {
            attemptedGradeEntries.push({
              subject: String(subject || '').trim(),
              quarter: String(qKey || '').toUpperCase()
            });
          }
        });
      } else if (gradeValue && Number(gradeValue) > 0) {
        attemptedGradeEntries.push({
          subject: String(subject || '').trim(),
          quarter: String(quarter || 'q1').toUpperCase()
        });
      }
    }

    // Enforce 24-hour edit window for non-admin users when editing an existing grade row.
    if (normalizedRoleForDeadline !== 'admin' && attemptedGradeEntries.length > 0) {
      const uniqueSubjects = [...new Set(attemptedGradeEntries.map((entry) => entry.subject).filter(Boolean))];
      if (uniqueSubjects.length > 0) {
        const subjectPlaceholders = uniqueSubjects.map(() => '?').join(', ');
        const existingRows = await query(
          `SELECT subject, quarter, created_at, updated_at
           FROM grades
           WHERE student_id = ?
             AND school_year_id = ?
             AND subject IN (${subjectPlaceholders})`,
          [id, targetSyId, ...uniqueSubjects]
        );

        const normalizeSubjectKey = (value = '') => String(value || '').trim().toLowerCase();
        const rowByKey = new Map(
          (existingRows || []).map((row) => [
            `${normalizeSubjectKey(row.subject)}||${String(row.quarter || '').toUpperCase()}`,
            row
          ])
        );

        const now = new Date();
        const expiredEntry = attemptedGradeEntries.find((entry) => {
          const key = `${normalizeSubjectKey(entry.subject)}||${String(entry.quarter || '').toUpperCase()}`;
          const existing = rowByKey.get(key);
          return existing && isEditWindowExpired(existing, now);
        });

        if (expiredEntry) {
          return res.status(403).json({
            success: false,
            error: 'Edit window expired',
            message: `${expiredEntry.subject} (${quarterLabel(String(expiredEntry.quarter || '').toLowerCase())}) can only be edited within ${EDIT_WINDOW_HOURS} hours after last save.`
          });
        }
      }
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

    // Notify class adviser when a subject teacher/teacher submits grades for their assigned subjects.
    const normalizedRole = normalizeRole(user?.role);
    const canTriggerAdviserNotification = ['teacher', 'subject_teacher', 'adviser'].includes(normalizedRole);
    if (canTriggerAdviserNotification && subjectsWithGrades.length > 0) {
      try {
        const studentGradeValue = student.grade_level || student.gradeLevel;
        const classRows = await query(
          `SELECT id, adviser_id, adviser_name
           FROM classes
           WHERE section = ?
             AND school_year_id = ?
             AND (
               LOWER(TRIM(grade)) = LOWER(TRIM(?))
               OR LOWER(REPLACE(TRIM(grade), 'Grade ', '')) = LOWER(REPLACE(TRIM(?), 'Grade ', ''))
             )
           LIMIT 1`,
          [student.section, targetSyId, studentGradeValue, studentGradeValue]
        );
        const classRow = classRows?.[0];
        let classIdentifier = classRow?.id || null;
        let adviserDisplayName = classRow?.adviser_name || '';
        let adviserTargetId = classRow?.adviser_id ? String(classRow.adviser_id).trim() : '';

        // Fallback: class assignments table may hold adviser mapping when classes row is missing adviser_id.
        if (!adviserTargetId) {
          try {
            const assignmentRows = await query(
              `SELECT id, adviser_id, adviser_name
               FROM class_assignments
               WHERE section = ?
                 AND (school_year_id = ? OR school_year_id IS NULL)
                 AND (
                   LOWER(TRIM(grade_level)) = LOWER(TRIM(?))
                   OR LOWER(REPLACE(TRIM(grade_level), 'Grade ', '')) = LOWER(REPLACE(TRIM(?), 'Grade ', ''))
                 )
               LIMIT 1`,
              [student.section, targetSyId, studentGradeValue, studentGradeValue]
            );

            const assignment = assignmentRows?.[0];
            if (assignment?.adviser_id) {
              adviserTargetId = String(assignment.adviser_id).trim();
              adviserDisplayName = adviserDisplayName || assignment.adviser_name || '';
              classIdentifier = classIdentifier || assignment.id || null;
            }
          } catch (assignmentFallbackError) {
            console.error('Class assignment fallback warning:', assignmentFallbackError.message);
          }
        }

        if (!adviserTargetId && classRow?.adviser_name) {
          const adviserName = String(classRow.adviser_name || '').trim();
          const nameParts = adviserName.split(/\s+/).filter(Boolean);
          const firstName = nameParts[0] || '';
          const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

          if (firstName || lastName) {
            const adviserUsers = await query(
              `SELECT id
               FROM users
               WHERE role IN ('adviser', 'teacher', 'subject_teacher')
                 AND (
                   (? <> '' AND LOWER(TRIM(first_name)) = LOWER(TRIM(?)) AND LOWER(TRIM(last_name)) = LOWER(TRIM(?)))
                   OR (? <> '' AND LOWER(TRIM(CONCAT(first_name, ' ', last_name))) = LOWER(TRIM(?)))
                 )
               LIMIT 1`,
              [firstName, firstName, lastName, adviserName, adviserName]
            );

            if (adviserUsers?.length > 0) {
              adviserTargetId = String(adviserUsers[0].id || '').trim();
            } else {
              const adviserTeachers = await query(
                `SELECT id
                 FROM teachers
                 WHERE (
                   (? <> '' AND LOWER(TRIM(first_name)) = LOWER(TRIM(?)) AND LOWER(TRIM(last_name)) = LOWER(TRIM(?)))
                   OR (? <> '' AND LOWER(TRIM(CONCAT(first_name, ' ', last_name))) = LOWER(TRIM(?)))
                 )
                 LIMIT 1`,
                [firstName, firstName, lastName, adviserName, adviserName]
              );
              if (adviserTeachers?.length > 0) {
                adviserTargetId = String(adviserTeachers[0].id || '').trim();
              }
            }
          }
        }

        if (adviserTargetId && adviserTargetId !== String(user.id)) {
          let submitterName = '';
          try {
            const userRows = await query(
              `SELECT first_name, last_name, firstName, lastName
               FROM users
               WHERE id = ?
               LIMIT 1`,
              [user.id]
            );
            if (userRows?.length > 0) {
              const row = userRows[0];
              submitterName = `${row.first_name || row.firstName || ''} ${row.last_name || row.lastName || ''}`.trim();
            }
          } catch (_) {}

          const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim() || `Student ${id}`;
          const subjectLabel = subjectsWithGrades.join(', ');
          const title = 'Subject grades submitted';
          const message = `${submitterName || 'Subject teacher'} submitted grades for ${studentName} in ${subjectLabel}.`;

          await query(
            `INSERT INTO notifications (user_id, type, title, message, meta_json, is_read)
             VALUES (?, 'grade_submission', ?, ?, ?, 0)`,
            [
              adviserTargetId,
              title,
              message,
              JSON.stringify({
                student_id: String(id),
                student_name: studentName,
                class_id: classIdentifier,
                class_grade: student.grade_level || student.gradeLevel,
                class_section: student.section,
                subjects: subjectsWithGrades,
                school_year_id: targetSyId,
                submitted_by: String(user.id),
                submitted_by_name: submitterName || null,
                quarter: quarter || null
              })
            ]
          );

          try {
            const adviserId = adviserTargetId;
            const schoolYearRows = await query(
              'SELECT label FROM school_years WHERE id = ? LIMIT 1',
              [targetSyId]
            );
            const schoolYearLabel = schoolYearRows?.[0]?.label || null;

            let adviserInfo = null;
            const adviserUsers = await query(
              `SELECT email, first_name, last_name, firstName, lastName
               FROM users
               WHERE id = ?
               LIMIT 1`,
              [adviserId]
            );

            if (adviserUsers?.length > 0) {
              const row = adviserUsers[0];
              adviserInfo = {
                email: sanitizeEmail(row.email || ''),
                name: `${row.first_name || row.firstName || ''} ${row.last_name || row.lastName || ''}`.trim()
              };
            }

            if (!adviserInfo?.email) {
              const adviserTeachers = await query(
                `SELECT email, first_name, last_name
                 FROM teachers
                 WHERE id = ?
                 LIMIT 1`,
                [adviserId]
              );
              if (adviserTeachers?.length > 0) {
                adviserInfo = {
                  email: sanitizeEmail(adviserTeachers[0].email || ''),
                  name: `${adviserTeachers[0].first_name || ''} ${adviserTeachers[0].last_name || ''}`.trim()
                };
              }
            }

            if ((!adviserInfo?.email || !isValidEmail(adviserInfo.email)) && adviserDisplayName) {
              try {
                const nameParts = String(adviserDisplayName).trim().split(/\s+/).filter(Boolean);
                const firstName = nameParts[0] || '';
                const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

                let byNameRows = [];
                if (firstName || lastName) {
                  byNameRows = await query(
                    `SELECT email, first_name, last_name
                     FROM teachers
                     WHERE (
                       (? <> '' AND LOWER(TRIM(first_name)) = LOWER(TRIM(?)) AND LOWER(TRIM(last_name)) = LOWER(TRIM(?)))
                       OR (? <> '' AND LOWER(TRIM(CONCAT(first_name, ' ', last_name))) = LOWER(TRIM(?)))
                     )
                     LIMIT 1`,
                    [firstName, firstName, lastName, adviserDisplayName, adviserDisplayName]
                  );
                }

                if (byNameRows?.length > 0) {
                  const row = byNameRows[0];
                  const candidateEmail = sanitizeEmail(row.email || '');
                  if (isValidEmail(candidateEmail)) {
                    adviserInfo = {
                      email: candidateEmail,
                      name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || adviserDisplayName
                    };
                  }
                }
              } catch (nameEmailFallbackError) {
                console.error('Adviser email name fallback warning:', nameEmailFallbackError.message);
              }
            }

            if (adviserInfo?.email && isValidEmail(adviserInfo.email)) {
              const sendResult = await sendAdviserGradeSubmissionEmail({
                adviserEmail: adviserInfo.email,
                adviserName: adviserInfo.name || adviserDisplayName || 'Class Adviser',
                submitterName: submitterName || 'Subject teacher',
                studentName,
                gradeLevel: student.grade_level || student.gradeLevel,
                section: student.section,
                subjects: subjectsWithGrades,
                quarter: quarter || null,
                schoolYearLabel
              });

              if (!sendResult?.success) {
                console.error('Adviser grade submission email warning:', sendResult?.error || 'Unknown email error');
              }
            }
          } catch (emailError) {
            console.error('Adviser grade submission email warning:', emailError.message);
          }
        }
      } catch (notificationError) {
        console.error('Grade notification warning:', notificationError.message);
      }
    }

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
    const { schoolYearId, includeLocks } = req.query;
    const [studentRow] = await query('SELECT id, school_year_id, grade_level, section FROM students WHERE id = ?', [id]);
    const targetSyId = schoolYearId || studentRow?.school_year_id || (await getActiveSchoolYear())?.id;
    const [targetSyRow] = await query('SELECT id, start_date FROM school_years WHERE id = ? LIMIT 1', [targetSyId]);
    const targetSyStartDate = targetSyRow?.start_date || null;
    const allGrades = await query(
      `SELECT *
       FROM grades
       WHERE student_id = ?
         AND school_year_id = ?
         AND (? IS NULL OR (created_at IS NOT NULL AND DATE(created_at) >= DATE(?)))`,
      [id, targetSyId, targetSyStartDate, targetSyStartDate]
    );

    const user = req.user || {};
    const normalizedRole = normalizeRole(user.role || '');
    let grades = allGrades;

    if ((normalizedRole === 'teacher' || normalizedRole === 'subject_teacher') && studentRow) {
      const uniqueSubjects = [...new Set(allGrades.map((g) => g.subject).filter(Boolean))];
      const allowed = new Set();

      for (const subjectName of uniqueSubjects) {
        const canView = await canEnterGrade(user, studentRow, subjectName, targetSyId);
        if (canView) allowed.add(String(subjectName));
      }

      grades = allGrades.filter((g) => allowed.has(String(g.subject)));
    }

    // grades table: each row is one subject + quarter combo
    // Need to restructure: { "Filipino": { q1: 90, q2: 85, ... }, "English": { q1: 88, ... } }
    const includeEditWindowLocks = String(includeLocks || '').toLowerCase() === '1' || String(includeLocks || '').toLowerCase() === 'true';
    const result = {};
    const editWindowLocks = {};
    if (grades) {
      grades.forEach(r => {
        if (!result[r.subject]) {
          result[r.subject] = { q1: 0, q2: 0, q3: 0, q4: 0, average: 0 };
        }
        // Map quarter name to key (Q1 -> q1, etc.)
        const quarterKey = r.quarter.toLowerCase();
        result[r.subject][quarterKey] = parseFloat(r.grade) || 0;

        if (includeEditWindowLocks) {
          if (!editWindowLocks[r.subject]) editWindowLocks[r.subject] = {};
          const expiry = getEditWindowExpiry(r);
          const expired = isEditWindowExpired(r);
          editWindowLocks[r.subject][quarterKey] = {
            expired,
            editable: !expired,
            expiresAt: expiry ? expiry.toISOString() : null,
            reason: expired ? `This grade can only be edited within ${EDIT_WINDOW_HOURS} hours after last save.` : ''
          };
        }
      });
      // Calculate averages
      for (const subject of Object.keys(result)) {
        const g = result[subject];
        const vals = [g.q1, g.q2, g.q3, g.q4].filter(v => v > 0);
        g.average = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      }
    }

    if (includeEditWindowLocks) {
      return res.json({
        ...result,
        __meta: {
          editWindowHours: EDIT_WINDOW_HOURS,
          editWindowLocks
        }
      });
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

// POST /ranking-publications - Publish a ranking snapshot to student dashboard
router.post('/ranking-publications', verifyUserForGrades, async (req, res) => {
  try {
    await ensureRankingPublicationsTable();

    const allowedRoles = new Set(['admin', 'teacher', 'adviser', 'subject_teacher']);
    const userRole = normalizeRole(req.user?.role || '');
    if (!allowedRoles.has(userRole)) {
      return res.status(403).json({ success: false, error: 'Only teachers, advisers, and admins can publish rankings.' });
    }

    const {
      schoolYearId,
      gradeLevel,
      section,
      rankingType,
      quarter,
      subject,
      rankings
    } = req.body || {};

    const normalizedRankingType = String(rankingType || '').trim().toLowerCase();
    const normalizedQuarter = normalizeQuarterKey(quarter);
    const normalizedSubject = String(subject || '').trim();
    const cleanGradeLevel = String(gradeLevel || '').trim();
    const cleanSection = String(section || '').trim();

    if (!cleanGradeLevel || !cleanSection) {
      return res.status(400).json({ success: false, error: 'gradeLevel and section are required.' });
    }

    if (!['overall', 'quarter', 'subject'].includes(normalizedRankingType)) {
      return res.status(400).json({ success: false, error: 'rankingType must be overall, quarter, or subject.' });
    }

    if (userRole === 'subject_teacher' && normalizedRankingType !== 'subject') {
      return res.status(403).json({ success: false, error: 'Subject teachers can only publish subject rankings.' });
    }

    if (normalizedRankingType === 'quarter' && !normalizedQuarter) {
      return res.status(400).json({ success: false, error: 'quarter ranking requires quarter key (q1, q2, q3, q4).' });
    }

    if (normalizedRankingType === 'subject' && !normalizedSubject) {
      return res.status(400).json({ success: false, error: 'subject ranking requires subject name.' });
    }

    if (!Array.isArray(rankings) || rankings.length === 0) {
      return res.status(400).json({ success: false, error: 'rankings payload is required.' });
    }

    const activeSy = await getActiveSchoolYear();
    const targetSchoolYearId = Number(schoolYearId) || activeSy?.id;
    if (!targetSchoolYearId) {
      return res.status(400).json({ success: false, error: 'No active school year found for publishing.' });
    }

    const normalizedRankings = rankings
      .map((row) => {
        const rankPosition = Number(row?.rank);
        const parsedScore = Number(row?.score);
        const totalStudents = Number(row?.totalStudents);
        const studentId = String(row?.studentId || '').trim();
        const studentName = String(row?.studentName || '').trim();

        return {
          studentId,
          studentName,
          rankPosition: Number.isFinite(rankPosition) ? Math.max(1, Math.floor(rankPosition)) : 0,
          score: Number.isFinite(parsedScore) ? parsedScore : null,
          totalStudents: Number.isFinite(totalStudents) && totalStudents > 0 ? Math.floor(totalStudents) : 0
        };
      })
      .filter((row) => row.studentId && row.rankPosition > 0);

    if (normalizedRankings.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid ranking rows to publish.' });
    }

    const fallbackTotalStudents = normalizedRankings.length;

    await query(
      `DELETE FROM ranking_publications
       WHERE school_year_id = ?
         AND grade_level = ?
         AND section = ?
         AND ranking_type = ?
         AND quarter_key = ?
         AND subject_name = ?`,
      [
        targetSchoolYearId,
        cleanGradeLevel,
        cleanSection,
        normalizedRankingType,
        normalizedRankingType === 'quarter' || normalizedRankingType === 'subject' ? normalizedQuarter : '',
        normalizedRankingType === 'subject' ? normalizedSubject : ''
      ]
    );

    for (const row of normalizedRankings) {
      await query(
        `INSERT INTO ranking_publications (
          school_year_id,
          grade_level,
          section,
          ranking_type,
          quarter_key,
          subject_name,
          student_id,
          student_name,
          rank_position,
          score,
          total_students,
          published_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          student_name = VALUES(student_name),
          rank_position = VALUES(rank_position),
          score = VALUES(score),
          total_students = VALUES(total_students),
          published_by = VALUES(published_by),
          published_at = CURRENT_TIMESTAMP`,
        [
          targetSchoolYearId,
          cleanGradeLevel,
          cleanSection,
          normalizedRankingType,
          normalizedRankingType === 'quarter' || normalizedRankingType === 'subject' ? normalizedQuarter : '',
          normalizedRankingType === 'subject' ? normalizedSubject : '',
          row.studentId,
          row.studentName || null,
          row.rankPosition,
          row.score,
          row.totalStudents > 0 ? row.totalStudents : fallbackTotalStudents,
          req.user?.id ? String(req.user.id) : null
        ]
      );
    }

    const summary =
      normalizedRankingType === 'overall'
        ? 'Overall ranking'
        : normalizedRankingType === 'quarter'
          ? `${quarterLabel(normalizedQuarter)} ranking`
          : `${normalizedSubject} ${normalizedQuarter ? `(${quarterLabel(normalizedQuarter)})` : ''} ranking`.trim();

    return res.status(200).json({
      success: true,
      message: `${summary} published to student dashboard.`,
      data: {
        schoolYearId: targetSchoolYearId,
        gradeLevel: cleanGradeLevel,
        section: cleanSection,
        rankingType: normalizedRankingType,
        quarter: normalizedQuarter,
        subject: normalizedSubject,
        totalPublished: normalizedRankings.length
      }
    });
  } catch (err) {
    console.error('Error publishing rankings:', err);
    return res.status(500).json({ success: false, error: 'Failed to publish rankings', details: err.message });
  }
});

// Public routes
router.post('/', studentController.createStudent);
router.get('/', studentController.getStudents);
router.get('/pending', studentController.getPendingStudents);
router.get('/declined', studentController.getDeclinedStudents);
router.get('/previous-year-promotion-candidates', studentController.getPreviousYearPromotionCandidates);
router.post('/fetch-from-previous', studentController.fetchStudentsFromPreviousYear);
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
