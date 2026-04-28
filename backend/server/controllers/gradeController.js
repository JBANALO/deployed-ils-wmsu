// server/controllers/gradeController.js
const pool = require('../config/db');

const getUserId = (user = {}) => user.userId || user.id || null;
const normalizeClassId = (value = '') => String(value || '').trim().toLowerCase().replace(/\s+/g, '-');
const normalizeSubject = (value = '') => String(value || '').trim().toLowerCase();
const normalizeRole = (value = '') => String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');

const getSchoolYearById = async (schoolYearId) => {
  if (!schoolYearId) return null;
  const [rows] = await pool.query(
    'SELECT id FROM school_years WHERE id = ? AND is_archived = 0 LIMIT 1',
    [schoolYearId]
  );
  return rows[0] || null;
};

const getActiveSchoolYear = async () => {
  const [rows] = await pool.query('SELECT id FROM school_years WHERE is_active = 1 AND is_archived = 0 LIMIT 1');
  return rows[0] || null;
};

const resolveSchoolYearId = async (req, fallbackSchoolYearId = null) => {
  const requested = req?.query?.schoolYearId || req?.body?.schoolYearId;
  if (requested) {
    const row = await getSchoolYearById(requested);
    if (row?.id) return row.id;
  }

  if (fallbackSchoolYearId) return fallbackSchoolYearId;

  const active = await getActiveSchoolYear();
  return active?.id || null;
};

const getTeacherName = async (userId) => {
  if (!userId) return '';

  try {
    const [users] = await pool.query(
      `SELECT firstName, lastName, first_name, last_name
       FROM users
       WHERE CAST(id AS CHAR) = ?
       LIMIT 1`,
      [String(userId)]
    );
    if (users.length > 0) {
      const row = users[0];
      const name = `${row.firstName || row.first_name || ''} ${row.lastName || row.last_name || ''}`.trim();
      if (name) return name;
    }
  } catch (_) {}

  try {
    const [teachers] = await pool.query(
      'SELECT first_name, last_name FROM teachers WHERE CAST(id AS CHAR) = ? LIMIT 1',
      [String(userId)]
    );
    if (teachers.length > 0) {
      return `${teachers[0].first_name || ''} ${teachers[0].last_name || ''}`.trim();
    }
  } catch (_) {}

  return '';
};

const getAssignedSubjectsForTeacher = async (userId, student, schoolYearId) => {
  const studentGrade = student.grade_level || student.gradeLevel;
  const studentSection = student.section;
  const slug = `${String(studentGrade || '').toLowerCase().replace(/\s+/g, '-')}-${String(studentSection || '').toLowerCase().replace(/\s+/g, '-')}`;

  const [classRows] = await pool.query(
    'SELECT id FROM classes WHERE grade = ? AND section = ? AND school_year_id = ?',
    [studentGrade, studentSection, schoolYearId]
  );

  const classIds = [normalizeClassId(slug), ...classRows.map((item) => normalizeClassId(item.id))].filter(Boolean);
  if (classIds.length === 0) return [];

  const teacherName = await getTeacherName(userId);
  const placeholders = classIds.map(() => '?').join(', ');
  const [rows] = await pool.query(
    `SELECT DISTINCT subject
     FROM subject_teachers
     WHERE LOWER(REPLACE(TRIM(class_id), ' ', '-')) IN (${placeholders})
       AND school_year_id = ?
       AND (
         LOWER(TRIM(CAST(teacher_id AS CHAR))) = LOWER(TRIM(?))
         OR (? <> '' AND LOWER(TRIM(teacher_name)) = LOWER(TRIM(?)))
       )`,
    [...classIds, schoolYearId, String(userId), teacherName, teacherName]
  );

  return rows.map((item) => item.subject).filter(Boolean);
};

// Check if teacher/adviser can enter grades for this student and subject
const canEnterGrade = async (user, student, subject, _pool, schoolYearId) => {
  const syId = schoolYearId || student.school_year_id || null;
  const userId = getUserId(user);
  if (!user || !user.role) return false;

  // Admin can enter grades for anyone
  if (user.role === 'admin') return true;

  // For teacher role, check if they are adviser or subject teacher for this class
  if (user.role === 'teacher' || user.role === 'adviser' || user.role === 'subject_teacher') {
    const studentGrade = student.grade_level || student.gradeLevel;
    const studentSection = student.section;

    // Check if user is adviser for this class
    const [adviserClasses] = await pool.query(
      'SELECT id FROM classes WHERE adviser_id = ? AND grade = ? AND section = ? AND school_year_id = ? LIMIT 1',
      [userId, studentGrade, studentSection, syId]
    );

    if (adviserClasses.length > 0) {
      return true;
    }

    const assignedSubjects = await getAssignedSubjectsForTeacher(userId, student, syId);
    if (assignedSubjects.length > 0) {
      return assignedSubjects.some((item) => normalizeSubject(item) === normalizeSubject(subject));
    }
  }

  return false;
};

const isUserAdviserForStudentClass = async (userId, student, schoolYearId) => {
  if (!userId) return false;

  const studentGrade = student.grade_level || student.gradeLevel;
  const studentSection = student.section;

  const [adviserClasses] = await pool.query(
    'SELECT id FROM classes WHERE adviser_id = ? AND grade = ? AND section = ? AND school_year_id = ? LIMIT 1',
    [userId, studentGrade, studentSection, schoolYearId]
  );

  return adviserClasses.length > 0;
};

const updateGrades = async (req, res) => {
  try {
    const { id } = req.params;
    const { grades, average, quarter } = req.body;
    const user = req.user || {};
    const userId = getUserId(user);

    const [[student]] = await pool.query('SELECT * FROM students WHERE id = ?', [id]);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const targetSchoolYearId = await resolveSchoolYearId(req, student.school_year_id);
    if (!targetSchoolYearId) {
      return res.status(400).json({ error: 'No active school year found' });
    }
    if (student.school_year_id !== targetSchoolYearId) {
      return res.status(403).json({ error: 'view_only', message: 'Grades can only be edited in the active school year.' });
    }

    const subjectsWithGrades = Object.entries(grades || {})
      .filter(([_, value]) => {
        if (typeof value === 'object') {
          return Object.values(value).some((v) => Number(v) > 0);
        }
        return Number(value) > 0;
      })
      .map(([subject]) => subject);

    // Check authorization for subjects that are actually being updated
    for (const subject of subjectsWithGrades) {
      const canEdit = await canEnterGrade(user, student, subject, pool, targetSchoolYearId);
      if (!canEdit) {
        return res.status(403).json({
          error: 'Unauthorized',
          message: `You are not authorized to enter grades for ${subject}`
        });
      }
    }

    // Update grades as one row per subject+quarter.
    const isAllQuarters = String(quarter || '').toLowerCase() === 'all';

    for (const [subject, gradeValue] of Object.entries(grades || {})) {
      if (isAllQuarters && typeof gradeValue === 'object') {
        for (const [qKey, qValue] of Object.entries(gradeValue)) {
          const numericValue = Number(qValue);
          if (!numericValue || numericValue <= 0) continue;

          const quarterLabel = String(qKey).toUpperCase();
          const [existingRows] = await pool.query(
            `SELECT id
             FROM grades
             WHERE student_id = ? AND subject = ? AND quarter = ? AND school_year_id = ?
             LIMIT 1`,
            [id, subject, quarterLabel, targetSchoolYearId]
          );

          if (existingRows.length > 0) {
            await pool.query(
              `UPDATE grades
               SET grade = ?, teacher_id = ?, updated_at = NOW()
               WHERE id = ?`,
              [numericValue, String(userId || ''), existingRows[0].id]
            );
          } else {
            await pool.query(
              `INSERT INTO grades (student_id, subject, quarter, grade, teacher_id, school_year_id, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
              [id, subject, quarterLabel, numericValue, String(userId || ''), targetSchoolYearId]
            );
          }
        }
      } else {
        const numericValue = Number(gradeValue);
        if (!numericValue || numericValue <= 0) continue;

        const quarterLabel = String(quarter || 'q1').toUpperCase();
        const [existingRows] = await pool.query(
          `SELECT id
           FROM grades
           WHERE student_id = ? AND subject = ? AND quarter = ? AND school_year_id = ?
           LIMIT 1`,
          [id, subject, quarterLabel, targetSchoolYearId]
        );

        if (existingRows.length > 0) {
          await pool.query(
            `UPDATE grades
             SET grade = ?, teacher_id = ?, updated_at = NOW()
             WHERE id = ?`,
            [numericValue, String(userId || ''), existingRows[0].id]
          );
        } else {
          await pool.query(
            `INSERT INTO grades (student_id, subject, quarter, grade, teacher_id, school_year_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [id, subject, quarterLabel, numericValue, String(userId || ''), targetSchoolYearId]
          );
        }
      }
    }

    await pool.query('UPDATE students SET average = ? WHERE id = ?', [average || 0, id]);

    res.json({ success: true, message: `${quarter || 'Q1'} grades updated`, average });
  } catch (err) {
    console.error('Error saving grades:', err);
    res.status(500).json({ success: false, error: 'Failed', message: err.message, details: err.message });
  }
};

const getStudentGrades = async (req, res) => {
  try {
    const { id } = req.params;
    const { quarter } = req.query; // Optional: filter by quarter
    const user = req.user || {};
    const userId = getUserId(user);

    const [[student]] = await pool.query('SELECT id, school_year_id, grade_level, section FROM students WHERE id = ?', [id]);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const targetSchoolYearId = await resolveSchoolYearId(req, student.school_year_id);
    if (!targetSchoolYearId) return res.status(400).json({ error: 'No active school year found' });

    const [rows] = await pool.query(
      `SELECT subject, quarter, grade
       FROM grades
       WHERE student_id = ? AND school_year_id = ?`,
      [id, targetSchoolYearId]
    );

    let visibleRows = rows;
    const role = normalizeRole(user.role || '');
    if ((role === 'teacher' || role === 'subject_teacher') && userId) {
      const isAdviserForClass = await isUserAdviserForStudentClass(userId, student, targetSchoolYearId);

      if (!isAdviserForClass) {
        const assignedSubjects = await getAssignedSubjectsForTeacher(userId, student, targetSchoolYearId);
        if (assignedSubjects.length > 0) {
          const allowed = new Set(assignedSubjects.map((item) => normalizeSubject(item)));
          visibleRows = rows.filter((row) => allowed.has(normalizeSubject(row.subject)));
        } else {
          visibleRows = [];
        }
      }
    }

    const result = {};
    visibleRows.forEach((row) => {
      const quarterKey = String(row.quarter || '').toLowerCase();

      if (quarter) {
        if (quarterKey === String(quarter).toLowerCase()) {
          result[row.subject] = Number(row.grade) || 0;
        }
        return;
      }

      if (!result[row.subject]) {
        result[row.subject] = { q1: 0, q2: 0, q3: 0, q4: 0, average: 0 };
      }

      if (['q1', 'q2', 'q3', 'q4'].includes(quarterKey)) {
        result[row.subject][quarterKey] = Number(row.grade) || 0;
      }
    });

    if (!quarter) {
      Object.keys(result).forEach((subject) => {
        const values = ['q1', 'q2', 'q3', 'q4']
          .map((key) => Number(result[subject][key]) || 0);
        const hasCompleteQuarters = values.every((value) => value > 0);
        result[subject].average = hasCompleteQuarters
          ? (values.reduce((sum, value) => sum + value, 0) / values.length)
          : 0;
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
};

const getStudentsWithGrades = async (req, res) => {
  try {
    const user = req.user; // From JWT token
    let query = `
      SELECT s.*, COALESCE(AVG(g.grade), 0) as calculated_average
      FROM students s
      LEFT JOIN grades g ON s.id = g.student_id
    `;

    // Filter students based on teacher/adviser role
    if (user.role === 'adviser') {
      query += ` WHERE s.section = '${user.sectionHandled}'`;
    } else if (user.role === 'subject_teacher') {
      // Subject teachers see all students (can filter later in UI)
      // Or you can restrict to their assigned sections if needed
    }

    query += ` GROUP BY s.id ORDER BY calculated_average DESC`;

    const [rows] = await pool.query(query);

    res.json(rows.map((row) => ({
      ...row,
      average: parseFloat(row.calculated_average || row.average || 0)
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
};

module.exports = { updateGrades, getStudentGrades, getStudentsWithGrades, canEnterGrade };
