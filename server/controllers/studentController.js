// server/controllers/studentController.js
const { query, isDatabaseAvailable } = require('../config/database');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const bcrypt = require('bcryptjs');

// Ensure school year isolation for students/grades
let studentSyEnsured = false;
let gradesSyEnsured = false;
let studentBirthDateEnsured = false;

async function getActiveSchoolYear() {
  const rows = await query('SELECT id, label, start_date FROM school_years WHERE is_active = 1 AND is_archived = 0 LIMIT 1');
  return rows[0] || null;
}

async function getSchoolYearById(id) {
  if (!id) return null;
  const rows = await query('SELECT id, label, start_date FROM school_years WHERE id = ? AND is_archived = 0 LIMIT 1', [id]);
  return rows[0] || null;
}

async function resolveTargetSchoolYear(requestedId) {
  const sy = requestedId ? await getSchoolYearById(Number(requestedId)) : await getActiveSchoolYear();
  if (!sy) throw new Error('No active school year found');
  return sy;
}

async function getPreviousSchoolYear(targetSy) {
  if (!targetSy?.id) return null;

  if (targetSy.start_date) {
    const byDate = await query(
      `SELECT id, label, start_date
       FROM school_years
       WHERE is_archived = 0 AND start_date < ?
       ORDER BY start_date DESC
       LIMIT 1`,
      [targetSy.start_date]
    );
    if (byDate[0]) return byDate[0];
  }

  const byId = await query(
    `SELECT id, label, start_date
     FROM school_years
     WHERE is_archived = 0 AND id < ?
     ORDER BY id DESC
     LIMIT 1`,
    [targetSy.id]
  );
  return byId[0] || null;
}

async function getLatestHistoricalStudentSchoolYear(targetSy) {
  if (!targetSy?.id) return null;

  try {
    if (targetSy.start_date) {
      const byDate = await query(
        `SELECT sy.id, sy.label, sy.start_date
         FROM school_years sy
         WHERE sy.is_archived = 0
           AND sy.id <> ?
           AND sy.start_date < ?
           AND EXISTS (
             SELECT 1 FROM students s WHERE s.school_year_id = sy.id LIMIT 1
           )
         ORDER BY sy.start_date DESC
         LIMIT 1`,
        [targetSy.id, targetSy.start_date]
      );
      if (byDate[0]) return byDate[0];
    }

    const byId = await query(
      `SELECT sy.id, sy.label, sy.start_date
       FROM school_years sy
       WHERE sy.is_archived = 0
         AND sy.id < ?
         AND EXISTS (
           SELECT 1 FROM students s WHERE s.school_year_id = sy.id LIMIT 1
         )
       ORDER BY sy.id DESC
       LIMIT 1`,
      [targetSy.id]
    );
    if (byId[0]) return byId[0];
  } catch (err) {
    console.log('getLatestHistoricalStudentSchoolYear fallback:', err.message);
  }

  return getPreviousSchoolYear(targetSy);
}

async function getHistoricalStudentSchoolYears(targetSy) {
  if (!targetSy?.id) return [];

  try {
    if (targetSy.start_date) {
      const rowsByDate = await query(
        `SELECT sy.id, sy.label, sy.start_date
         FROM school_years sy
         WHERE sy.is_archived = 0
           AND sy.id <> ?
           AND sy.start_date < ?
           AND EXISTS (
             SELECT 1 FROM students s WHERE s.school_year_id = sy.id LIMIT 1
           )
         ORDER BY sy.start_date DESC`,
        [targetSy.id, targetSy.start_date]
      );
      if (rowsByDate.length > 0) return rowsByDate;
    }

    const rowsById = await query(
      `SELECT sy.id, sy.label, sy.start_date
       FROM school_years sy
       WHERE sy.is_archived = 0
         AND sy.id < ?
         AND EXISTS (
           SELECT 1 FROM students s WHERE s.school_year_id = sy.id LIMIT 1
         )
       ORDER BY sy.id DESC`,
      [targetSy.id]
    );
    return rowsById;
  } catch (err) {
    console.log('getHistoricalStudentSchoolYears fallback:', err.message);
  }

  const latest = await getLatestHistoricalStudentSchoolYear(targetSy);
  return latest ? [latest] : [];
}

async function getNearestStudentSchoolYearWithData(targetSy) {
  if (!targetSy?.id) return null;

  try {
    if (targetSy.start_date) {
      const byDateDistance = await query(
        `SELECT sy.id, sy.label, sy.start_date
         FROM school_years sy
         WHERE sy.is_archived = 0
           AND sy.id <> ?
           AND EXISTS (
             SELECT 1 FROM students s WHERE s.school_year_id = sy.id LIMIT 1
           )
         ORDER BY ABS(DATEDIFF(sy.start_date, ?)) ASC, sy.start_date DESC
         LIMIT 1`,
        [targetSy.id, targetSy.start_date]
      );
      if (byDateDistance[0]) return byDateDistance[0];
    }

    const byIdDistance = await query(
      `SELECT sy.id, sy.label, sy.start_date
       FROM school_years sy
       WHERE sy.is_archived = 0
         AND sy.id <> ?
         AND EXISTS (
           SELECT 1 FROM students s WHERE s.school_year_id = sy.id LIMIT 1
         )
       ORDER BY ABS(sy.id - ?) ASC, sy.id DESC
       LIMIT 1`,
      [targetSy.id, targetSy.id]
    );
    if (byIdDistance[0]) return byIdDistance[0];
  } catch (err) {
    console.log('getNearestStudentSchoolYearWithData fallback:', err.message);
  }

  return null;
}

async function ensureStudentSchoolYearColumn() {
  if (studentSyEnsured) return;
  const cols = await query('SHOW COLUMNS FROM students');
  const hasSy = cols.some(c => c.Field === 'school_year_id');
  if (!hasSy) {
    await query('ALTER TABLE students ADD COLUMN school_year_id INT NULL');
    await query('CREATE INDEX idx_students_school_year ON students (school_year_id)');
  }

  // Backfill nulls to active school year if available
  try {
    const activeSy = await getActiveSchoolYear();
    if (activeSy) {
      await query('UPDATE students SET school_year_id = ? WHERE school_year_id IS NULL', [activeSy.id]);
    }
  } catch (backfillErr) {
    console.log('students school_year_id backfill skipped:', backfillErr.message);
  }

  studentSyEnsured = true;
}

async function ensureGradesSchoolYearColumn() {
  if (gradesSyEnsured) return;
  const cols = await query('SHOW COLUMNS FROM grades');
  const hasSy = cols.some(c => c.Field === 'school_year_id');
  if (!hasSy) {
    await query('ALTER TABLE grades ADD COLUMN school_year_id INT NULL');
    await query('CREATE INDEX idx_grades_school_year ON grades (school_year_id)');
  }

  // Backfill: align grades to student school year when possible, else active SY
  try {
    await query(
      `UPDATE grades g
       JOIN students s ON g.student_id = s.id AND s.school_year_id IS NOT NULL
       SET g.school_year_id = s.school_year_id
       WHERE g.school_year_id IS NULL`
    );

    const activeSy = await getActiveSchoolYear();
    if (activeSy) {
      await query('UPDATE grades SET school_year_id = ? WHERE school_year_id IS NULL', [activeSy.id]);
    }
  } catch (backfillErr) {
    console.log('grades school_year_id backfill skipped:', backfillErr.message);
  }

  gradesSyEnsured = true;
}

async function ensureStudentBirthDateColumn() {
  if (studentBirthDateEnsured) return;
  const cols = await query('SHOW COLUMNS FROM students');
  const hasBirthDate = cols.some(c => c.Field === 'birth_date');
  if (!hasBirthDate) {
    await query('ALTER TABLE students ADD COLUMN birth_date DATE NULL');
  }
  studentBirthDateEnsured = true;
}

// -----------------------------
// HELPER: Format student object
// -----------------------------
function formatStudent(s) {
  let qrCodeUrl = s.qr_code;
  
  // Convert file paths to full URLs for mobile app compatibility
  // (if any old file paths still exist in database)
  if (qrCodeUrl && typeof qrCodeUrl === 'string') {
    if (qrCodeUrl.startsWith('/qrcodes/')) {
      // File path - convert to full URL
      qrCodeUrl = `https://deployed-ils-wmsu-production.up.railway.app${qrCodeUrl}`;
    }
    // Base64 data URLs or full HTTP(S) URLs are kept as-is
  }
  
  return {
    id: s.id,
    lrn: s.lrn,
    firstName: s.first_name,
    middleName: s.middle_name,
    lastName: s.last_name,
    fullName: `${s.first_name} ${s.middle_name || ''} ${s.last_name}`.trim(),
    age: s.age,
    birthDate: s.birth_date,
    sex: s.sex,
    gradeLevel: s.grade_level,
    section: s.section,
    parentFirstName: s.parent_first_name,
    parentLastName: s.parent_last_name,
    parentEmail: s.parent_email,
    parentContact: s.parent_contact,
    studentEmail: s.student_email,
    profilePic: s.profile_pic,
    qrCode: qrCodeUrl,
    status: s.status,
    // Always report live average scoped from grades query results.
    // This prevents stale cached student.average from leaking into a new school year.
    average: s.live_average != null ? Number(s.live_average) : null,
    live_average: s.live_average != null ? Number(s.live_average) : null,
    q1_avg: s.q1_avg != null ? Number(s.q1_avg) : null,
    q2_avg: s.q2_avg != null ? Number(s.q2_avg) : null,
    q3_avg: s.q3_avg != null ? Number(s.q3_avg) : null,
    q4_avg: s.q4_avg != null ? Number(s.q4_avg) : null,
    declineReason: s.decline_reason || undefined,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
    role: 'student'
  };
}

// -----------------------------
// HELPER: Generate QR code file
// -----------------------------
async function generateQRCodeFile(studentData, qrCodePath) {
  // Use JSON format so the mobile scanner can parse it consistently
  const qrData = JSON.stringify({
    studentId: studentData.lrn,
    lrn: studentData.lrn,
    name: `${studentData.firstName} ${studentData.lastName}`.trim(),
    gradeLevel: studentData.gradeLevel,
    section: studentData.section
  });

  await QRCode.toFile(qrCodePath, qrData, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' }
  });
}

// -----------------------------
// CREATE STUDENT
// -----------------------------
exports.createStudent = async (req, res) => {
  let profilePicPath = null;
  let qrCodePath = null;

  try {
    await ensureStudentSchoolYearColumn();
    await ensureGradesSchoolYearColumn();
    let targetSy;
    try {
      targetSy = await resolveTargetSchoolYear(req.body.schoolYearId);
    } catch (syErr) {
      return res.status(400).json({ status: 'fail', message: syErr.message || 'No active school year found' });
    }

    // New students may only be created in the active school year
    const activeSy = await getActiveSchoolYear();
    if (!activeSy || targetSy.id !== activeSy.id) {
      return res.status(403).json({ status: 'fail', message: 'Creating students in past school years is not allowed (view only).' });
    }

    console.log('=== STUDENT CREATION DEBUG ===');
    console.log('req.body keys:', Object.keys(req.body));
    console.log('profilePic in req.body:', req.body.profilePic);
    
    const {
      lrn, firstName, middleName, lastName, sex,
      parentFirstName, parentLastName, parentEmail, parentContact,
      parentContact: contact,
      password, gradeLevel, section, profilePic, qrCode, status: reqStatus
    } = req.body;

    // Accept both 'age' and default to 0 for bulk imports
    const age = req.body.age || 0;
    // Accept both 'studentEmail' and 'email' (bulk import sends 'email')
    const studentEmail = req.body.studentEmail || req.body.email || null;

    console.log('createStudent (server) received:', {
      lrn: lrn || 'MISSING',
      firstName: firstName || 'MISSING',
      lastName: lastName || 'MISSING',
      age,
      sex: sex || 'MISSING',
      gradeLevel: gradeLevel || 'MISSING',
      section: section || 'MISSING',
      studentEmail: studentEmail || 'MISSING',
      hasPassword: !!password
    });

    // Validate required fields (age is optional for bulk import)
    if (!lrn || !firstName || !lastName || !gradeLevel || !section) {
      const missing = [];
      if (!lrn) missing.push('lrn');
      if (!firstName) missing.push('firstName');
      if (!lastName) missing.push('lastName');
      if (!gradeLevel) missing.push('gradeLevel');
      if (!section) missing.push('section');
      return res.status(400).json({ status: 'fail', message: `Missing required fields: ${missing.join(', ')}` });
    }

    // Check for duplicate LRN
    const existingStudent = await query('SELECT id FROM students WHERE lrn = ?', [lrn]);
    if (existingStudent.length > 0) {
      // Return existing student data instead of error for bulk import tolerance
      const existing = await query('SELECT * FROM students WHERE lrn = ?', [lrn]);
      return res.status(200).json({ message: 'Student already exists', student: formatStudent(existing[0]) });
    }

    // -----------------------------
    // PROFILE PICTURE
    // -----------------------------
    const uploadFolder = path.join(__dirname, '../public/student_profiles');
    fs.mkdirSync(uploadFolder, { recursive: true });

    if (profilePic?.startsWith('data:image/')) {
      const matches = profilePic.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
      if (matches) {
        const imageType = matches[1];
        const base64Data = matches[2];
        const fileName = `profile_${lrn}_${Date.now()}.${imageType}`;
        profilePicPath = path.join(uploadFolder, fileName);
        fs.writeFileSync(profilePicPath, base64Data, 'base64');
        console.log('Profile picture saved:', profilePicPath);
      }
    }
    const safeProfilePic = profilePicPath ? `/student_profiles/${path.basename(profilePicPath)}` : null;

    // -----------------------------
    // QR CODE - Always generate server-side as small data URL
    // (frontend base64 is too large for MySQL packet)
    // JSON format so mobile scanner can parse it consistently
    // -----------------------------
    let safeQRCode;
    try {
      const qrData = JSON.stringify({
        studentId: lrn,
        lrn: lrn,
        name: `${firstName} ${lastName}`.trim(),
        gradeLevel: gradeLevel,
        section: section
      });
      safeQRCode = await QRCode.toDataURL(qrData, { width: 200, margin: 1 });
    } catch (qrErr) {
      console.error('QR generation failed:', qrErr.message);
      safeQRCode = null;
    }

    // -----------------------------
    // HASH PASSWORD - use default if not provided (bulk import)
    // -----------------------------
    const finalPassword = password || 'Password123';
    const hashedPassword = await bcrypt.hash(finalPassword, 12);

    // -----------------------------
    // INSERT INTO DATABASE
    // -----------------------------
    const result = await query(
      `INSERT INTO students (
        lrn, first_name, middle_name, last_name, age, sex,
        grade_level, section, parent_first_name, parent_last_name,
        parent_email, parent_contact, student_email, password,
        profile_pic, qr_code, status, created_by, school_year_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [lrn, firstName, middleName || null, lastName, age, sex || 'N/A',
        gradeLevel, section, parentFirstName || null, parentLastName || null,
        parentEmail || null, parentContact || null, studentEmail || null, hashedPassword,
        safeProfilePic, safeQRCode, reqStatus || 'Active', 'admin', targetSy.id]
    );

    const createdStudent = {
      id: result.insertId,
      lrn,
      firstName,
      middleName: middleName || null,
      lastName,
      age,
      sex,
      gradeLevel,
      section,
      parentFirstName: parentFirstName || null,
      parentLastName: parentLastName || null,
      parentEmail: parentEmail || null,
      parentContact: parentContact || null,
      studentEmail: studentEmail || null,
      profilePic: safeProfilePic,
      qrCode: safeQRCode,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      role: 'student'
    };

    res.status(201).json({ status: 'success', data: { student: createdStudent } });
  } catch (error) {
    console.error('Error creating student:', error);

    // Cleanup files
    if (profilePicPath && fs.existsSync(profilePicPath)) fs.unlinkSync(profilePicPath);
    if (qrCodePath && fs.existsSync(qrCodePath)) fs.unlinkSync(qrCodePath);

    res.status(500).json({ status: 'fail', message: error.message });
  }
};

// -----------------------------
// GET STUDENTS / SINGLE STUDENT
// -----------------------------
exports.getStudents = async (req, res) => {
  try {
    await ensureStudentSchoolYearColumn();
    await ensureGradesSchoolYearColumn();

    const { teacherId, gradeLevel, section, schoolYearId } = req.query;
    let targetSy;
    try {
      targetSy = await resolveTargetSchoolYear(schoolYearId);
    } catch (syErr) {
      return res.status(400).json({ status: 'fail', message: syErr.message || 'No active school year found' });
    }

    // If teacherId provided, filter to only that teacher's assigned classes
    if (teacherId) {
      let assignedClasses = []; // Array of {gradeLevel, section} objects

      // 1. Check classes table for adviser assignments
      try {
        const classesRows = await query(
          'SELECT grade, section FROM classes WHERE adviser_id = ? AND school_year_id = ?',
          [teacherId, targetSy.id]
        );
        classesRows.forEach(row => {
          assignedClasses.push({ gradeLevel: row.grade, section: row.section, isAdviser: true });
        });
        if (classesRows.length > 0) {
          console.log(`[getStudents] Found ${classesRows.length} classes as adviser for teacher ${teacherId}`);
        }
      } catch (classesErr) {
        console.log('[getStudents] classes table lookup failed:', classesErr.message);
      }

      // 2. Check class_assignments table (legacy UUID-based teachers from web)
      try {
        const classAssignments = await query(
          `SELECT grade_level, section
           FROM class_assignments
           WHERE adviser_id = ?
             AND school_year_id = ?`,
          [teacherId, targetSy.id]
        );
        classAssignments.forEach(row => {
          // Avoid duplicates
          const exists = assignedClasses.some(c => c.gradeLevel === row.grade_level && c.section === row.section);
          if (!exists) {
            assignedClasses.push({ gradeLevel: row.grade_level, section: row.section, isAdviser: true });
          }
        });
        if (classAssignments.length > 0) {
          console.log(`[getStudents] Found ${classAssignments.length} class_assignments for teacher ${teacherId}`);
        }
      } catch (assignErr) {
        console.log('[getStudents] class_assignments lookup failed:', assignErr.message);
      }

      // 3. Check subject_teachers table for subject teacher assignments
      try {
        const subjectTeacherRows = await query(
          'SELECT DISTINCT c.grade, c.section FROM subject_teachers st JOIN classes c ON st.class_id = c.id WHERE st.teacher_id = ? AND st.school_year_id = ? AND c.school_year_id = ?',
          [teacherId, targetSy.id, targetSy.id]
        );
        subjectTeacherRows.forEach(row => {
          const exists = assignedClasses.some(c => c.gradeLevel === row.grade && c.section === row.section);
          if (!exists) {
            assignedClasses.push({ gradeLevel: row.grade, section: row.section, isAdviser: false });
          }
        });
        if (subjectTeacherRows.length > 0) {
          console.log(`[getStudents] Found ${subjectTeacherRows.length} classes as subject teacher for teacher ${teacherId}`);
        }
      } catch (stErr) {
        console.log('[getStudents] subject_teachers lookup failed:', stErr.message);
      }

      // 4. Fall back to teachers table (numeric IDs)
      if (assignedClasses.length === 0) {
        try {
          const teacherRows = await query(
            'SELECT grade_level, section FROM teachers WHERE id = ? AND grade_level IS NOT NULL AND section IS NOT NULL AND school_year_id = ? LIMIT 1',
            [teacherId, targetSy.id]
          );
          if (teacherRows.length > 0) {
            assignedClasses.push({ gradeLevel: teacherRows[0].grade_level, section: teacherRows[0].section, isAdviser: false });
            console.log(`[getStudents] Found teachers table for teacher ${teacherId}: ${teacherRows[0].grade_level} - ${teacherRows[0].section}`);
          }
        } catch (teacherErr) {
          console.log('[getStudents] teachers table lookup failed:', teacherErr.message);
        }
      }

      // 5. If we found assigned classes, return students from all of them
      if (assignedClasses.length > 0) {
        // Build query for multiple classes
        const conditions = assignedClasses.map(() => '(grade_level = ? AND section = ?)').join(' OR ');
        const params = assignedClasses.flatMap(c => [c.gradeLevel, c.section]);

        const filteredStudents = await query(
          `SELECT s.*
           FROM students s
           WHERE (${conditions}) AND s.school_year_id = ?
           ORDER BY s.grade_level, s.section, s.last_name ASC`,
          [...params, targetSy.id]
        );

        const adviserClassKeys = new Set(
          assignedClasses
            .filter((item) => item.isAdviser)
            .map((item) => `${String(item.gradeLevel || '').trim().toLowerCase()}||${String(item.section || '').trim().toLowerCase()}`)
        );

        const normalizeSubject = (value = '') => String(value || '').trim().toLowerCase();
        const classSubjectMap = {};

        try {
          const subjectRows = await query(
            `SELECT st.subject, c.grade, c.section
             FROM subject_teachers st
             JOIN classes c ON st.class_id = c.id
             WHERE st.teacher_id = ? AND st.school_year_id = ? AND c.school_year_id = ?`,
            [teacherId, targetSy.id, targetSy.id]
          );

          subjectRows.forEach((row) => {
            const key = `${String(row.grade || '').trim().toLowerCase()}||${String(row.section || '').trim().toLowerCase()}`;
            if (!classSubjectMap[key]) classSubjectMap[key] = new Set();
            const normalized = normalizeSubject(row.subject);
            if (normalized) classSubjectMap[key].add(normalized);
          });
        } catch (subjectErr) {
          console.log('[getStudents] subject map build failed:', subjectErr.message);
        }

        const studentIds = filteredStudents.map((item) => item.id).filter(Boolean);
        let gradeRows = [];
        if (studentIds.length > 0) {
          const placeholders = studentIds.map(() => '?').join(',');
          gradeRows = await query(
            `SELECT student_id, subject, quarter, grade
             FROM grades
             WHERE school_year_id = ?
               AND student_id IN (${placeholders})
               AND grade > 0
               AND (? IS NULL OR (created_at IS NOT NULL AND DATE(created_at) >= DATE(?)))`,
            [targetSy.id, ...studentIds, targetSy.start_date || null, targetSy.start_date || null]
          );
        }

        const gradesByStudent = {};
        gradeRows.forEach((row) => {
          const studentKey = String(row.student_id);
          if (!gradesByStudent[studentKey]) gradesByStudent[studentKey] = [];
          gradesByStudent[studentKey].push(row);
        });

        const withScopedAverages = filteredStudents.map((student) => {
          const classKey = `${String(student.grade_level || '').trim().toLowerCase()}||${String(student.section || '').trim().toLowerCase()}`;
          const isAdviserForClass = adviserClassKeys.has(classKey);
          const allowedSubjects = classSubjectMap[classKey];
          const rows = (gradesByStudent[String(student.id)] || []).filter((row) => {
            if (isAdviserForClass) return true;
            if (!allowedSubjects || allowedSubjects.size === 0) return false;
            return allowedSubjects.has(normalizeSubject(row.subject));
          });

          const averageForQuarter = (quarter) => {
            const values = rows
              .filter((row) => String(row.quarter || '').toUpperCase() === quarter)
              .map((row) => Number(row.grade) || 0)
              .filter((value) => value > 0);
            if (values.length === 0) return null;
            return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
          };

          const allValues = rows
            .map((row) => Number(row.grade) || 0)
            .filter((value) => value > 0);

          const liveAverage = allValues.length > 0
            ? Number((allValues.reduce((sum, value) => sum + value, 0) / allValues.length).toFixed(2))
            : null;

          return {
            ...student,
            live_average: liveAverage,
            q1_avg: averageForQuarter('Q1'),
            q2_avg: averageForQuarter('Q2'),
            q3_avg: averageForQuarter('Q3'),
            q4_avg: averageForQuarter('Q4'),
            average: liveAverage
          };
        });

        console.log(`[getStudents] Returning ${withScopedAverages.length} students from ${assignedClasses.length} assigned class(es)`);
        return res.status(200).json({ status: 'success', data: withScopedAverages.map(formatStudent) });
      }

      // 6. If teacher has no assigned class, return empty array
      console.log(`[getStudents] Teacher ${teacherId} has no assigned class — returning empty`);
      return res.status(200).json({ status: 'success', data: [] });
    }

    // No teacherId — return all students (admin/web use)
    const averageSelectSql = `SELECT s.*,
      (SELECT ROUND(AVG(g.grade), 2)
       FROM grades g
       WHERE g.student_id = s.id
         AND g.grade > 0
         AND g.school_year_id = ?
         AND (? IS NULL OR (g.created_at IS NOT NULL AND DATE(g.created_at) >= DATE(?)))) AS live_average,
      (SELECT ROUND(AVG(g.grade), 2)
       FROM grades g
       WHERE g.student_id = s.id
         AND g.quarter = 'Q1'
         AND g.grade > 0
         AND g.school_year_id = ?
         AND (? IS NULL OR (g.created_at IS NOT NULL AND DATE(g.created_at) >= DATE(?)))) AS q1_avg,
      (SELECT ROUND(AVG(g.grade), 2)
       FROM grades g
       WHERE g.student_id = s.id
         AND g.quarter = 'Q2'
         AND g.grade > 0
         AND g.school_year_id = ?
         AND (? IS NULL OR (g.created_at IS NOT NULL AND DATE(g.created_at) >= DATE(?)))) AS q2_avg,
      (SELECT ROUND(AVG(g.grade), 2)
       FROM grades g
       WHERE g.student_id = s.id
         AND g.quarter = 'Q3'
         AND g.grade > 0
         AND g.school_year_id = ?
         AND (? IS NULL OR (g.created_at IS NOT NULL AND DATE(g.created_at) >= DATE(?)))) AS q3_avg,
      (SELECT ROUND(AVG(g.grade), 2)
       FROM grades g
       WHERE g.student_id = s.id
         AND g.quarter = 'Q4'
         AND g.grade > 0
         AND g.school_year_id = ?
         AND (? IS NULL OR (g.created_at IS NOT NULL AND DATE(g.created_at) >= DATE(?)))) AS q4_avg
     FROM students s`;

    const averageParams = [
       targetSy.id, targetSy.start_date || null, targetSy.start_date || null,
       targetSy.id, targetSy.start_date || null, targetSy.start_date || null,
       targetSy.id, targetSy.start_date || null, targetSy.start_date || null,
       targetSy.id, targetSy.start_date || null, targetSy.start_date || null,
       targetSy.id, targetSy.start_date || null, targetSy.start_date || null
     ];

    let allDbStudents = await query(
      `${averageSelectSql}
       WHERE s.school_year_id = ?
       ORDER BY s.created_at DESC`,
      [...averageParams, targetSy.id]
    );

    const formattedStudents = allDbStudents.map(formatStudent);
    res.status(200).json({ status: 'success', data: formattedStudents });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

exports.getStudent = async (req, res) => {
  try {
    await ensureStudentSchoolYearColumn();
    await ensureGradesSchoolYearColumn();

    let targetSy;
    try {
      targetSy = await resolveTargetSchoolYear(req.query.schoolYearId);
    } catch (syErr) {
      return res.status(400).json({ status: 'fail', message: syErr.message || 'No active school year found' });
    }
    // Handle both query parameter (studentId) and URL parameter (id)
    const studentId = req.query.studentId || req.params.id;
    
    console.log('🔍 getStudent called with:', {
      query: req.query,
      params: req.params,
      studentId: studentId
    });
    
    if (!studentId) {
      console.log('❌ No studentId provided');
      return res.status(400).json({ status: 'fail', message: 'Student ID is required' });
    }
    
    console.log('🔍 Querying database for student ID:', studentId);
    const students = await query('SELECT * FROM students WHERE id = ? AND school_year_id = ?', [studentId, targetSy.id]);
    console.log('🔍 Database result:', {
      found: students.length,
      student: students[0] || 'none'
    });
    
    if (students.length === 0) {
      console.log('❌ Student not found in database');
      return res.status(404).json({ status: 'fail', message: 'Student not found' });
    }
    
    const student = students[0];
    const formattedStudent = formatStudent(student);
    const studentLRN = student.lrn; // LRN is used as studentId in attendance table
    const siblingStudentRows = studentLRN
      ? await query(
          `SELECT id, school_year_id, grade_level, section
           FROM students
           WHERE lrn = ?
           ORDER BY COALESCE(school_year_id, 0) DESC, id DESC`,
          [studentLRN]
        )
      : [];
    
    const normalizeSubjectName = (value = '') => String(value)
      .replace(/\s*\(Grade\s+\d+\)\s*$/i, '')
      .replace(/\s*\(Kindergarten\)\s*$/i, '')
      .trim()
      .toLowerCase();

    const toGradeKey = (gradeLabel = '') => String(gradeLabel).replace(/^Grade\s+/i, '').trim();
    const gradeRank = (gradeLabel = '') => {
      const normalized = String(gradeLabel || '').trim().toLowerCase();
      if (!normalized) return -1;
      if (normalized === 'kindergarten' || normalized === 'kinder') return 0;
      const match = normalized.match(/grade\s*(\d+)/i);
      if (match) return Number(match[1]);
      return -1;
    };

    // ======== FETCH GRADES ========
    const gradesRaw = await query(
      `SELECT subject, quarter, grade, created_at
       FROM grades
       WHERE student_id = ?
         AND school_year_id = ?
         AND (? IS NULL OR (created_at IS NOT NULL AND DATE(created_at) >= DATE(?)))
       ORDER BY subject, quarter`,
      [studentId, targetSy.id, targetSy.start_date || null, targetSy.start_date || null]
    );
    
    // Group grades by subject with quarters
    // Helpers to build grade maps with optional date filtering (per promotion snapshot)
    const buildNormalizedMap = (rows) => {
      const map = {};
      const byNormalized = {};
      for (const g of rows) {
        if (!map[g.subject]) {
          map[g.subject] = { subject: g.subject, q1: null, q2: null, q3: null, q4: null };
        }
        const qKey = (g.quarter || '').toLowerCase();
        const val = g.grade !== null && g.grade !== undefined ? parseFloat(g.grade) : null;
        if (qKey === 'q1') map[g.subject].q1 = val;
        if (qKey === 'q2') map[g.subject].q2 = val;
        if (qKey === 'q3') map[g.subject].q3 = val;
        if (qKey === 'q4') map[g.subject].q4 = val;
      }

      Object.values(map).forEach((g) => {
        const key = normalizeSubjectName(g.subject);
        if (!key) return;
        if (!byNormalized[key]) byNormalized[key] = g;
      });

      return { map, byNormalized };
    };

    // Fetch admin-configured subjects for current grade and ensure they are always shown (even without grades)
    const gradeKey = toGradeKey(student.grade_level);
    const currentGradeSubjectsRows = await query(
      'SELECT name FROM subjects WHERE is_archived = 0 AND school_year_id = ? AND FIND_IN_SET(?, grade_levels) ORDER BY name',
      [targetSy.id, gradeKey]
    );
    const currentGradeSubjects = currentGradeSubjectsRows.map(r => r.name).filter(Boolean);

    // Identify last promotion into current grade to separate old vs new grades
    let lastPromotionToCurrent = null;
    try {
      const [lastPromoRow] = await query(
        `SELECT created_at FROM promotion_history
         WHERE student_id = ? AND to_grade = ? AND status IN ('promoted','graduated')
         ORDER BY created_at DESC LIMIT 1`,
        [studentId, student.grade_level]
      );
      lastPromotionToCurrent = lastPromoRow?.created_at ? new Date(lastPromoRow.created_at) : null;
    } catch (promoDateErr) {
      console.log('promotion_history (current) lookup skipped:', promoDateErr.message);
    }

    const filteredCurrentGradesRaw = lastPromotionToCurrent
      ? gradesRaw.filter(g => g.created_at && new Date(g.created_at) >= lastPromotionToCurrent)
      : gradesRaw;

    const { byNormalized: currentGradesByNormalized } = buildNormalizedMap(filteredCurrentGradesRaw);

    const currentGradesMap = {};
    currentGradeSubjects.forEach((subjectName) => {
      const normalizedKey = normalizeSubjectName(subjectName);
      const matched = currentGradesByNormalized[normalizedKey] || { q1: null, q2: null, q3: null, q4: null };
      currentGradesMap[subjectName] = {
        subject: subjectName,
        q1: matched.q1 ?? null,
        q2: matched.q2 ?? null,
        q3: matched.q3 ?? null,
        q4: matched.q4 ?? null
      };
    });

    // Ensure newly encoded subjects are visible immediately even if not yet in admin subject configuration.
    Object.values(currentGradesByNormalized).forEach((gradeRow) => {
      if (!gradeRow?.subject) return;
      const alreadyIncluded = Object.keys(currentGradesMap).some(
        (subjectName) => normalizeSubjectName(subjectName) === normalizeSubjectName(gradeRow.subject)
      );
      if (alreadyIncluded) return;

      currentGradesMap[gradeRow.subject] = {
        subject: gradeRow.subject,
        q1: gradeRow.q1 ?? null,
        q2: gradeRow.q2 ?? null,
        q3: gradeRow.q3 ?? null,
        q4: gradeRow.q4 ?? null
      };
    });
    
    // Calculate averages and remarks
    const grades = Object.values(currentGradesMap).map(g => {
      const quarterGrades = [g.q1, g.q2, g.q3, g.q4].filter(x => x !== null && x > 0);
      const average = quarterGrades.length > 0 
        ? (quarterGrades.reduce((a, b) => a + b, 0) / quarterGrades.length).toFixed(2)
        : null;
      const remarks = average ? (parseFloat(average) >= 75 ? 'Passed' : 'Failed') : 'Pending';
      return { ...g, average, remarks };
    });

    const formatGradesForDisplay = (rows = []) => {
      const { map } = buildNormalizedMap(rows);
      return Object.values(map).map((g) => {
        const quarterGrades = [g.q1, g.q2, g.q3, g.q4].filter(x => x !== null && x > 0);
        const average = quarterGrades.length > 0
          ? (quarterGrades.reduce((a, b) => a + b, 0) / quarterGrades.length).toFixed(2)
          : null;
        const remarks = average ? (parseFloat(average) >= 75 ? 'Passed' : 'Failed') : 'Pending';
        return {
          subject: g.subject,
          q1: g.q1 ?? null,
          q2: g.q2 ?? null,
          q3: g.q3 ?? null,
          q4: g.q4 ?? null,
          average,
          remarks
        };
      });
    };

    // Build previous-grade history (best effort): use promotion_history table if available
    // and map subjects by grade-level configuration so previous records remain visible after promotion.
    let gradeHistory = [];
    try {
      const historyRows = await query(
        `SELECT from_grade, from_section, to_grade, to_section, average, status, created_at
         FROM promotion_history
         WHERE student_id = ?
         ORDER BY created_at DESC`,
        [studentId]
      );

      const currentRank = gradeRank(student.grade_level);
      const validHistoryRows = historyRows.filter((row) => {
        const fromRank = gradeRank(row.from_grade);
        const toRank = gradeRank(row.to_grade);
        if (fromRank < 0 || toRank < 0 || currentRank < 0) return false;
        if (fromRank >= toRank) return false;
        if (toRank > currentRank) return false;
        return true;
      });

      const previousGrades = [...new Set(
        validHistoryRows
          .map(h => h.from_grade)
          .filter(g => g && g !== student.grade_level)
      )];

      for (const prevGrade of previousGrades) {
        const prevKey = toGradeKey(prevGrade);
        const prevSubjectsRows = await query(
          'SELECT name FROM subjects WHERE is_archived = 0 AND school_year_id = ? AND FIND_IN_SET(?, grade_levels) ORDER BY name',
          [targetSy.id, prevKey]
        );
        const prevSubjects = prevSubjectsRows.map(r => r.name).filter(Boolean);

        // Use grades recorded up to the promotion date for this previous grade snapshot
        const promoCutoff = validHistoryRows.find(h => h.from_grade === prevGrade)?.created_at || null;
        const gradesBeforePromotion = promoCutoff
          ? gradesRaw.filter(g => g.created_at && new Date(g.created_at) <= new Date(promoCutoff))
          : gradesRaw;
        const { byNormalized: historyGradesByNormalized } = buildNormalizedMap(gradesBeforePromotion);

        const prevGrades = prevSubjects.map(subjectName => {
          const matched = historyGradesByNormalized[normalizeSubjectName(subjectName)] || { q1: null, q2: null, q3: null, q4: null };
          const quarterGrades = [matched.q1, matched.q2, matched.q3, matched.q4].filter(x => x !== null && x > 0);
          const avg = quarterGrades.length > 0
            ? (quarterGrades.reduce((a, b) => a + b, 0) / quarterGrades.length).toFixed(2)
            : null;
          return {
            subject: subjectName,
            q1: matched.q1 ?? null,
            q2: matched.q2 ?? null,
            q3: matched.q3 ?? null,
            q4: matched.q4 ?? null,
            average: avg,
            remarks: avg ? (parseFloat(avg) >= 75 ? 'Passed' : 'Failed') : 'Pending'
          };
        });

        if (prevGrades.length > 0) {
          gradeHistory.push({
            gradeLevel: prevGrade,
            section: validHistoryRows.find(h => h.from_grade === prevGrade)?.from_section || null,
            promotedAt: validHistoryRows.find(h => h.from_grade === prevGrade)?.created_at || null,
            grades: prevGrades
          });
        }
      }
    } catch (historyErr) {
      // promotion_history may not exist yet in some environments; ignore safely
      console.log('promotion_history lookup skipped:', historyErr.message);
    }

    // Fallback/augmentation: if promotion snapshots are missing, build previous records
    // from other student rows that share the same LRN in older school years.
    try {
      const historyByKey = new Set(
        gradeHistory.map((row) => `${String(row.gradeLevel || '').toLowerCase()}::${String(row.section || '').toLowerCase()}`)
      );

      const historyBySchoolYear = new Set(
        gradeHistory
          .map((row) => String(row.schoolYearLabel || '').trim().toLowerCase())
          .filter(Boolean)
      );

      // Fallback A: same student row may have old grades kept in historical school_year_id entries.
      // Build previous records directly from historical grades for this student ID.
      const historicalGradeRows = await query(
        `SELECT g.school_year_id, sy.label AS school_year_label, g.subject, g.quarter, g.grade, g.created_at
         FROM grades g
         LEFT JOIN school_years sy ON sy.id = g.school_year_id
         WHERE g.student_id = ?
           AND g.school_year_id IS NOT NULL
           AND g.school_year_id <> ?
         ORDER BY g.school_year_id DESC, g.subject, g.quarter`,
        [studentId, targetSy.id]
      );

      const gradeRowsBySchoolYearId = {};
      for (const row of historicalGradeRows || []) {
        const syIdKey = String(row.school_year_id || '');
        if (!syIdKey) continue;
        if (!gradeRowsBySchoolYearId[syIdKey]) {
          gradeRowsBySchoolYearId[syIdKey] = {
            schoolYearLabel: row.school_year_label || null,
            rows: []
          };
        }
        gradeRowsBySchoolYearId[syIdKey].rows.push(row);
      }

      for (const syId of Object.keys(gradeRowsBySchoolYearId)) {
        const schoolYearLabel = String(gradeRowsBySchoolYearId[syId].schoolYearLabel || '').trim();
        const schoolYearKey = schoolYearLabel.toLowerCase();
        if (schoolYearKey && historyBySchoolYear.has(schoolYearKey)) continue;

        const historicalGrades = formatGradesForDisplay(gradeRowsBySchoolYearId[syId].rows || []);
        if (historicalGrades.length === 0) continue;

        gradeHistory.push({
          gradeLevel: null,
          section: null,
          schoolYearLabel: schoolYearLabel || null,
          promotedAt: null,
          grades: historicalGrades
        });

        if (schoolYearKey) {
          historyBySchoolYear.add(schoolYearKey);
        }
      }

      const historicalRows = siblingStudentRows.filter((row) => {
        if (!row || !row.id || Number(row.id) === Number(studentId)) return false;
        if (!row.school_year_id) return false;
        return Number(row.school_year_id) !== Number(targetSy.id);
      });

      if (historicalRows.length > 0) {
        const historicalSyIds = [...new Set(historicalRows.map((r) => r.school_year_id).filter(Boolean))];
        let schoolYearLabelMap = {};
        if (historicalSyIds.length > 0) {
          const placeholders = historicalSyIds.map(() => '?').join(',');
          const syRows = await query(
            `SELECT id, label FROM school_years WHERE id IN (${placeholders})`,
            historicalSyIds
          );
          schoolYearLabelMap = syRows.reduce((acc, row) => {
            if (row?.id) acc[String(row.id)] = row.label || null;
            return acc;
          }, {});
        }

        for (const oldRow of historicalRows) {
          const key = `${String(oldRow.grade_level || '').toLowerCase()}::${String(oldRow.section || '').toLowerCase()}`;
          if (historyByKey.has(key)) continue;

          const oldGradesRaw = await query(
            'SELECT subject, quarter, grade, created_at FROM grades WHERE student_id = ? ORDER BY subject, quarter',
            [oldRow.id]
          );

          const oldGrades = formatGradesForDisplay(oldGradesRaw);
          if (oldGrades.length === 0) continue;

          gradeHistory.push({
            gradeLevel: oldRow.grade_level || null,
            section: oldRow.section || null,
            schoolYearLabel: schoolYearLabelMap[String(oldRow.school_year_id)] || null,
            promotedAt: null,
            grades: oldGrades
          });
          historyByKey.add(key);

          const schoolYearLabel = String(schoolYearLabelMap[String(oldRow.school_year_id)] || '').trim().toLowerCase();
          if (schoolYearLabel) {
            historyBySchoolYear.add(schoolYearLabel);
          }
        }
      }
    } catch (historyFallbackErr) {
      console.log('historical grade fallback skipped:', historyFallbackErr.message);
    }
    
    // ======== FETCH ATTENDANCE ========
    // Mobile app uses LRN as studentId, so we search by both LRN and student ID
    const attendanceRaw = await query(
      `SELECT date, status, time, period 
       FROM attendance 
       WHERE studentId = ? OR studentId = ?
       ORDER BY date DESC 
       LIMIT 100`,
      [studentLRN, studentId]
    );
    
    // Group attendance by month for report card format
    const months = ['Aug', 'Sept', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const attendanceSummary = {};
    months.forEach(m => {
      attendanceSummary[m] = { present: 0, absent: 0, late: 0 };
    });
    
    for (const att of attendanceRaw) {
      const date = new Date(att.date);
      const monthIndex = date.getMonth();
      // Map month to school year (Aug=0 in school year counting)
      const monthName = months[monthIndex >= 7 ? monthIndex - 7 : monthIndex + 5] || null;
      if (monthName && attendanceSummary[monthName]) {
        const status = (att.status || '').toLowerCase();
        if (status === 'present') attendanceSummary[monthName].present++;
        else if (status === 'absent') attendanceSummary[monthName].absent++;
        else if (status === 'late') attendanceSummary[monthName].late++;
      }
    }
    
    // ======== FETCH SCHEDULE (from subject_teachers) ========
    const gradeLevel = student.grade_level;
    const section = student.section;
    const classId = `${gradeLevel.toLowerCase().replace(/\s+/g, '-')}-${section.toLowerCase()}`;
    
    const scheduleRaw = await query(
      `SELECT subject, teacher_name, day, start_time, end_time 
       FROM subject_teachers 
       WHERE class_id = ? AND school_year_id = ?
       ORDER BY 
         FIELD(day, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
         start_time`,
      [classId, targetSy.id]
    );

    // Previous schedule snapshots (captured at promotion time)
    let previousScheduleHistory = [];
    try {
      const scheduleHistoryRows = await query(
        `SELECT from_grade, from_section, to_grade, to_section, status, created_at, details_json
         FROM promotion_history
         WHERE student_id = ? AND status IN ('promoted', 'graduated')
         ORDER BY created_at DESC`,
        [studentId]
      );

      previousScheduleHistory = scheduleHistoryRows
        .map((row) => {
          let details = {};
          try {
            details = typeof row.details_json === 'string'
              ? JSON.parse(row.details_json || '{}')
              : (row.details_json || {});
          } catch (_) {
            details = {};
          }

          const snapshot = Array.isArray(details.previousSchedule) ? details.previousSchedule : [];
          if (snapshot.length === 0) return null;

          return {
            fromGrade: row.from_grade || null,
            fromSection: row.from_section || null,
            toGrade: row.to_grade || null,
            toSection: row.to_section || null,
            status: row.status || null,
            promotedAt: row.created_at || null,
            schedule: snapshot
          };
        })
        .filter(Boolean);
    } catch (scheduleHistoryErr) {
      console.log('previous schedule history lookup skipped:', scheduleHistoryErr.message);
    }

    // Fallback: build previous schedule history from historical school years where grades exist
    // (covers cases where promotion snapshot details_json is unavailable).
    if (previousScheduleHistory.length === 0) {
      try {
        const historicalSchoolYears = await query(
          `SELECT DISTINCT g.school_year_id, sy.label AS school_year_label
           FROM grades g
           LEFT JOIN school_years sy ON sy.id = g.school_year_id
           WHERE g.student_id = ?
             AND g.school_year_id IS NOT NULL
             AND g.school_year_id <> ?
           ORDER BY g.school_year_id DESC`,
          [studentId, targetSy.id]
        );

        for (const syRow of historicalSchoolYears || []) {
          const historicalSyId = Number(syRow?.school_year_id || 0);
          if (!historicalSyId) continue;

          const siblingInSy = siblingStudentRows.find(
            (row) => Number(row?.school_year_id || 0) === historicalSyId
          );

          const fromGrade = siblingInSy?.grade_level || null;
          const fromSection = siblingInSy?.section || null;
          const scheduleGrade = fromGrade || student.grade_level;
          const scheduleSection = fromSection || student.section;
          if (!scheduleGrade || !scheduleSection) continue;

          const scheduleClassSlug = `${String(scheduleGrade).toLowerCase().replace(/\s+/g, '-')}-${String(scheduleSection).toLowerCase()}`;
          const classIdCandidates = new Set([scheduleClassSlug]);

          try {
            const classRows = await query(
              `SELECT id
               FROM classes
               WHERE school_year_id = ?
                 AND (grade = ? OR grade = ? OR REPLACE(LOWER(grade), 'grade ', '') = LOWER(?))
                 AND section = ?`,
              [historicalSyId, scheduleGrade, toGradeKey(scheduleGrade), toGradeKey(scheduleGrade), scheduleSection]
            );

            classRows.forEach((row) => {
              if (row?.id) classIdCandidates.add(String(row.id));
            });
          } catch (classResolveErr) {
            console.log('historical schedule class lookup skipped:', classResolveErr.message);
          }

          const classIdList = Array.from(classIdCandidates).filter(Boolean);
          if (classIdList.length === 0) continue;

          const placeholders = classIdList.map(() => '?').join(',');
          let historicalSchedule = await query(
            `SELECT subject, teacher_name, day, start_time, end_time
             FROM subject_teachers
             WHERE school_year_id = ?
               AND class_id IN (${placeholders})
             ORDER BY FIELD(day, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'), start_time`,
            [historicalSyId, ...classIdList]
          );

          if (!Array.isArray(historicalSchedule) || historicalSchedule.length === 0) {
            const gradeSubjects = await query(
              `SELECT DISTINCT subject
               FROM grades
               WHERE student_id = ?
                 AND school_year_id = ?
                 AND subject IS NOT NULL
                 AND subject <> ''
               ORDER BY subject`,
              [studentId, historicalSyId]
            );

            historicalSchedule = (gradeSubjects || []).map((row) => ({
              subject: row.subject,
              teacher_name: '',
              day: 'N/A',
              start_time: '',
              end_time: ''
            }));
          }

          if (!Array.isArray(historicalSchedule) || historicalSchedule.length === 0) continue;

          previousScheduleHistory.push({
            fromGrade,
            fromSection,
            toGrade: student.grade_level || null,
            toSection: student.section || null,
            status: 'historical',
            promotedAt: null,
            schoolYearLabel: syRow?.school_year_label || null,
            schedule: historicalSchedule
          });
        }
      } catch (historicalScheduleErr) {
        console.log('historical previous schedule fallback skipped:', historicalScheduleErr.message);
      }
    }
    
    // Also get adviser info for the class with fallbacks for legacy/alternate class IDs.
    let adviserName = null;

    try {
      const classInfoById = await query(
        'SELECT adviser_name FROM classes WHERE id = ? AND school_year_id = ? LIMIT 1',
        [classId, targetSy.id]
      );
      adviserName = classInfoById[0]?.adviser_name || null;
    } catch (classIdErr) {
      console.log('classes by id lookup failed:', classIdErr.message);
    }

    if (!adviserName) {
      try {
        const classInfoByGradeSection = await query(
          `SELECT adviser_name
           FROM classes
           WHERE (grade = ? OR grade = ? OR REPLACE(LOWER(grade), 'grade ', '') = LOWER(?))
             AND section = ? AND school_year_id = ?
           LIMIT 1`,
          [student.grade_level, toGradeKey(student.grade_level), toGradeKey(student.grade_level), student.section, targetSy.id]
        );
        adviserName = classInfoByGradeSection[0]?.adviser_name || null;
      } catch (classGradeErr) {
        console.log('classes by grade/section lookup failed:', classGradeErr.message);
      }
    }

    if (!adviserName) {
      try {
        const adviserFromAssignment = await query(
          `SELECT t.full_name AS adviser_name
           FROM class_assignments ca
           JOIN classes c ON ca.class_id = c.id
           JOIN teachers t ON ca.teacher_id = t.id
           WHERE (c.grade = ? OR c.grade = ? OR REPLACE(LOWER(c.grade), 'grade ', '') = LOWER(?))
             AND c.section = ? AND c.school_year_id = ?
           LIMIT 1`,
          [student.grade_level, toGradeKey(student.grade_level), toGradeKey(student.grade_level), student.section, targetSy.id]
        );
        adviserName = adviserFromAssignment[0]?.adviser_name || null;
      } catch (assignmentErr) {
        console.log('class_assignments adviser lookup failed:', assignmentErr.message);
      }
    }

    let publishedRankings = [];
    try {
      const studentGradeNormalized = String(student.grade_level || '').replace(/^Grade\s+/i, '').trim();
      const studentFullNameNormalized = `${String(student.first_name || '').trim()} ${String(student.last_name || '').trim()}`
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
      const studentIdCandidates = new Set(
        [
          String(studentId || '').trim(),
          String(student.lrn || '').trim(),
          ...siblingStudentRows.map((row) => String(row?.id || '').trim())
        ].filter(Boolean)
      );

      const rankingRows = await query(
        `SELECT ranking_type, quarter_key, subject_name, student_id, student_name, rank_position, score, total_students, published_at
         FROM ranking_publications
         WHERE school_year_id = ?
           AND (
             grade_level = ?
             OR REPLACE(LOWER(grade_level), 'grade ', '') = LOWER(?)
           )
           AND LOWER(TRIM(section)) = LOWER(TRIM(?))
         ORDER BY FIELD(ranking_type, 'overall', 'quarter', 'subject'), quarter_key, subject_name, published_at DESC`,
        [targetSy.id, student.grade_level, studentGradeNormalized, student.section]
      );

      const matchedRows = (rankingRows || []).filter((row) => {
        const rowStudentId = String(row?.student_id || '').trim();
        const rowStudentName = String(row?.student_name || '')
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();

        if (rowStudentId && studentIdCandidates.has(rowStudentId)) return true;
        if (studentFullNameNormalized && rowStudentName && rowStudentName === studentFullNameNormalized) return true;
        return false;
      });

      const quarterMap = { q1: 'Quarter 1', q2: 'Quarter 2', q3: 'Quarter 3', q4: 'Quarter 4' };
      publishedRankings = matchedRows.map((row) => {
        const type = String(row.ranking_type || '').toLowerCase();
        const quarterKey = String(row.quarter_key || '').toLowerCase();
        const subjectName = String(row.subject_name || '').trim();

        let title = 'Published Ranking';
        if (type === 'overall') title = 'Final Overall Ranking';
        else if (type === 'quarter') title = `${quarterMap[quarterKey] || quarterKey.toUpperCase()} Ranking`;
        else if (type === 'subject') {
          const quarterLabel = quarterKey ? (quarterMap[quarterKey] || quarterKey.toUpperCase()) : '';
          title = `${subjectName}${quarterLabel ? ` (${quarterLabel})` : ''} Ranking`;
        }

        return {
          rankingType: type,
          quarter: quarterKey || null,
          subject: subjectName || null,
          rank: row.rank_position != null ? Number(row.rank_position) : null,
          score: row.score != null ? Number(row.score) : null,
          totalStudents: row.total_students != null ? Number(row.total_students) : null,
          title,
          publishedAt: row.published_at || null
        };
      });
    } catch (rankingErr) {
      console.log('published ranking lookup skipped:', rankingErr.message);
    }
    
    // Calculate overall average for profile
    const allAverages = grades.map(g => parseFloat(g.average)).filter(x => x > 0);
    const overallAverage = allAverages.length > 0 
      ? (allAverages.reduce((a, b) => a + b, 0) / allAverages.length).toFixed(2)
      : 'N/A';

    // Remove duplicate previous-grade records. Prefer entries with school-year labels.
    const normalizeHistoryPayload = (record) => JSON.stringify(
      (record?.grades || []).map((g) => ({
        subject: String(g?.subject || '').trim().toLowerCase(),
        q1: g?.q1 ?? null,
        q2: g?.q2 ?? null,
        q3: g?.q3 ?? null,
        q4: g?.q4 ?? null
      }))
    );

    const dedupedHistory = [];
    const labeledPayloads = new Set();
    const labeledKeys = new Set();
    const unlabeledPayloads = new Set();

    for (const record of gradeHistory) {
      const payload = normalizeHistoryPayload(record);
      const label = String(record?.schoolYearLabel || '').trim().toLowerCase();

      if (label) {
        const key = `${label}::${payload}`;
        if (labeledKeys.has(key)) continue;
        labeledKeys.add(key);
        labeledPayloads.add(payload);
        dedupedHistory.push(record);
        continue;
      }

      // If same payload already exists in a labeled record, drop unlabeled duplicate.
      if (labeledPayloads.has(payload)) continue;
      if (unlabeledPayloads.has(payload)) continue;
      unlabeledPayloads.add(payload);
      dedupedHistory.push(record);
    }

    gradeHistory = dedupedHistory;
    
    formattedStudent.average = overallAverage;
    formattedStudent.grades = grades;
    formattedStudent.gradeHistory = gradeHistory;
    formattedStudent.attendance = attendanceRaw;
    formattedStudent.attendanceSummary = attendanceSummary;
    formattedStudent.schedule = scheduleRaw;
    formattedStudent.previousScheduleHistory = previousScheduleHistory;
    formattedStudent.adviserName = adviserName;
    formattedStudent.publishedRankings = publishedRankings;
    
    console.log('✅ Student portal data loaded:', {
      gradesCount: grades.length,
      attendanceCount: attendanceRaw.length,
      scheduleCount: scheduleRaw.length
    });
    
    res.status(200).json({ status: 'success', data: { student: formattedStudent } });
  } catch (error) {
    console.error('❌ Error fetching student:', error);
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

// -----------------------------
// PENDING / DECLINED
// -----------------------------
exports.getPendingStudents = async (req, res) => {
  try {
    const pending = await query('SELECT * FROM students WHERE status = "pending" ORDER BY created_at DESC');
    res.json({ status: 'success', data: { students: pending.map(formatStudent) } });
  } catch (error) {
    console.error('Error fetching pending students:', error);
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

exports.getDeclinedStudents = async (req, res) => {
  try {
    const declined = await query('SELECT * FROM students WHERE status = "declined" ORDER BY updated_at DESC');
    res.json({ status: 'success', data: { students: declined.map(formatStudent) } });
  } catch (error) {
    console.error('Error fetching declined students:', error);
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

// -----------------------------
// APPROVE STUDENT
// -----------------------------
exports.approveStudent = async (req, res) => {
  try {
    const { id } = req.params;

    await ensureStudentSchoolYearColumn();
    const existing = await query('SELECT * FROM students WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const activeSy = await getActiveSchoolYear();
    if (!activeSy || existing[0].school_year_id !== activeSy.id) {
      return res.status(403).json({ message: 'Approving students from past school years is not allowed (view only).' });
    }

    const result = await query(
      'UPDATE students SET status = "approved", updated_at = NOW() WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) 
      return res.status(404).json({ message: 'Student not found' });

    // Return the updated student
    const [updatedStudent] = await query('SELECT * FROM students WHERE id = ?', [id]);

    res.json({
      status: 'success',
      message: 'Student approved successfully',
      data: { student: formatStudent(updatedStudent) }
    });
  } catch (error) {
    console.error('Error approving student:', error);
    res.status(500).json({ message: 'Error approving student', error: error.message });
  }
};

// -----------------------------
// DECLINE STUDENT
// -----------------------------
exports.declineStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await ensureStudentSchoolYearColumn();
    const existing = await query('SELECT * FROM students WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const activeSy = await getActiveSchoolYear();
    if (!activeSy || existing[0].school_year_id !== activeSy.id) {
      return res.status(403).json({ message: 'Declining students from past school years is not allowed (view only).' });
    }

    const result = await query(
      'UPDATE students SET status = "declined", decline_reason = ?, updated_at = NOW() WHERE id = ?',
      [reason || null, id]
    );

    if (result.affectedRows === 0) 
      return res.status(404).json({ message: 'Student not found' });

    const [updatedStudent] = await query('SELECT * FROM students WHERE id = ?', [id]);

    res.json({
      status: 'success',
      message: 'Student declined successfully',
      data: { student: formatStudent(updatedStudent) }
    });
  } catch (error) {
    console.error('Error declining student:', error);
    res.status(500).json({ message: 'Error declining student', error: error.message });
  }
};

// -----------------------------
// RESTORE STUDENT
// -----------------------------
exports.restoreStudent = async (req, res) => {
  try {
    const { id } = req.params;

    await ensureStudentSchoolYearColumn();
    const existing = await query('SELECT * FROM students WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const activeSy = await getActiveSchoolYear();
    if (!activeSy || existing[0].school_year_id !== activeSy.id) {
      return res.status(403).json({ message: 'Restoring students from past school years is not allowed (view only).' });
    }

    const result = await query(
      'UPDATE students SET status = "pending", decline_reason = NULL, updated_at = NOW() WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) 
      return res.status(404).json({ message: 'Student not found' });

    const [updatedStudent] = await query('SELECT * FROM students WHERE id = ?', [id]);

    res.json({
      status: 'success',
      message: 'Student restored successfully',
      data: { student: formatStudent(updatedStudent) }
    });
  } catch (error) {
    console.error('Error restoring student:', error);
    res.status(500).json({ message: 'Error restoring student', error: error.message });
  }
};

// -----------------------------
// ALIASES
// -----------------------------
exports.getAllStudents = exports.getStudents;
exports.getStudentById = exports.getStudent;

// -----------------------------
// REGENERATE ALL QR CODES (JSON format)
// Call POST /api/students/regenerate-qr to fix existing students
// -----------------------------
exports.regenerateQRCodes = async (req, res) => {
  try {
    const allStudents = await query('SELECT id, lrn, first_name, last_name, grade_level, section FROM students');
    let updated = 0;
    let failed = 0;

    for (const s of allStudents) {
      try {
        const qrPayload = JSON.stringify({
          studentId: s.lrn,
          lrn: s.lrn,
          name: `${s.first_name} ${s.last_name}`.trim(),
          gradeLevel: s.grade_level,
          section: s.section
        });
        const newQR = await QRCode.toDataURL(qrPayload, { width: 200, margin: 1 });
        await query('UPDATE students SET qr_code = ? WHERE id = ?', [newQR, s.id]);
        updated++;
      } catch (err) {
        console.error(`QR regen failed for student ${s.id}:`, err.message);
        failed++;
      }
    }

    res.json({ status: 'success', message: `QR codes regenerated: ${updated} updated, ${failed} failed` });
  } catch (error) {
    console.error('Error regenerating QR codes:', error);
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

// -----------------------------
// UPDATE STUDENT
// -----------------------------
exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      lrn, firstName, middleName, lastName, age, sex,
      gradeLevel, section, birthDate,
      parentFirstName, parentLastName, parentEmail, parentContact,
      studentEmail, status, actorRole, actorId
    } = req.body;

    console.log('updateStudent called with id:', id);
    console.log('Update data:', req.body);

    await ensureStudentSchoolYearColumn();
    await ensureStudentBirthDateColumn();

    // Check if student exists
    const existingStudents = await query('SELECT * FROM students WHERE id = ?', [id]);
    if (!existingStudents || existingStudents.length === 0) {
      return res.status(404).json({ status: 'fail', message: 'Student not found' });
    }

    const activeSy = await getActiveSchoolYear();
    if (!activeSy || existingStudents[0].school_year_id !== activeSy.id) {
      return res.status(403).json({ status: 'fail', message: 'Editing past school years is not allowed (view only).' });
    }

    const normalizedActorRole = String(actorRole || '').trim().toLowerCase();
    const isTeacherActor = ['teacher', 'adviser', 'subject_teacher'].includes(normalizedActorRole);
    const isAdminActor = ['admin', 'super_admin'].includes(normalizedActorRole);
    const normalizedActorId = String(actorId || '').trim();
    const currentStatus = String(existingStudents[0].status || '').trim().toLowerCase();
    const nextStatus = String(status || '').trim().toLowerCase();

    if (isTeacherActor && !isAdminActor) {
      if (!normalizedActorId) {
        return res.status(403).json({
          status: 'fail',
          message: 'Missing actor identity. Only adviser (or admin) can edit student information.'
        });
      }

      const studentGrade = String(existingStudents[0].grade_level || '').trim();
      const studentSection = String(existingStudents[0].section || '').trim();
      const adviserClassRows = await query(
        `SELECT id
         FROM classes
         WHERE school_year_id = ?
           AND adviser_id = ?
           AND LOWER(TRIM(grade)) = LOWER(TRIM(?))
           AND LOWER(TRIM(section)) = LOWER(TRIM(?))
         LIMIT 1`,
        [activeSy.id, normalizedActorId, studentGrade, studentSection]
      );

      if (!Array.isArray(adviserClassRows) || adviserClassRows.length === 0) {
        return res.status(403).json({
          status: 'fail',
          message: 'Only the adviser assigned to this class (or admin) can edit student information.'
        });
      }
    }

    if (isTeacherActor && currentStatus === 'inactive' && nextStatus && nextStatus !== 'inactive') {
      return res.status(403).json({
        status: 'fail',
        message: 'Only admin can reactivate an inactive student account.'
      });
    }

    // Build update query dynamically based on provided fields
    const updates = [];
    const params = [];

    if (lrn !== undefined) { updates.push('lrn = ?'); params.push(lrn); }
    if (firstName !== undefined) { updates.push('first_name = ?'); params.push(firstName); }
    if (middleName !== undefined) { updates.push('middle_name = ?'); params.push(middleName); }
    if (lastName !== undefined) { updates.push('last_name = ?'); params.push(lastName); }
    if (age !== undefined) { updates.push('age = ?'); params.push(age); }
    if (birthDate !== undefined) { updates.push('birth_date = ?'); params.push(birthDate || null); }
    if (sex !== undefined) { updates.push('sex = ?'); params.push(sex); }
    if (gradeLevel !== undefined) { updates.push('grade_level = ?'); params.push(gradeLevel); }
    if (section !== undefined) { updates.push('section = ?'); params.push(section); }
    if (parentFirstName !== undefined) { updates.push('parent_first_name = ?'); params.push(parentFirstName); }
    if (parentLastName !== undefined) { updates.push('parent_last_name = ?'); params.push(parentLastName); }
    if (parentEmail !== undefined) { updates.push('parent_email = ?'); params.push(parentEmail); }
    if (parentContact !== undefined) { updates.push('parent_contact = ?'); params.push(parentContact); }
    if (studentEmail !== undefined) { updates.push('student_email = ?'); params.push(studentEmail); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }

    // Always update the updated_at timestamp
    updates.push('updated_at = NOW()');

    if (updates.length === 1) {
      // Only updated_at, no real changes
      return res.status(400).json({ status: 'fail', message: 'No fields to update' });
    }

    params.push(id);
    const sql = `UPDATE students SET ${updates.join(', ')} WHERE id = ?`;
    
    console.log('Executing SQL:', sql);
    console.log('With params:', params);

    const result = await query(sql, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 'fail', message: 'Student not found or no changes made' });
    }

    // Return updated student
    const updatedStudents = await query('SELECT * FROM students WHERE id = ?', [id]);
    res.json({
      status: 'success',
      message: 'Student updated successfully',
      data: { student: formatStudent(updatedStudents[0]) }
    });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

// -----------------------------
// DELETE STUDENT
// -----------------------------
exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('deleteStudent called with id:', id);

    await ensureStudentSchoolYearColumn();

    // Check if student exists
    const existingStudents = await query('SELECT * FROM students WHERE id = ?', [id]);
    if (!existingStudents || existingStudents.length === 0) {
      return res.status(404).json({ status: 'fail', message: 'Student not found' });
    }

    const activeSy = await getActiveSchoolYear();
    if (!activeSy || existingStudents[0].school_year_id !== activeSy.id) {
      return res.status(403).json({ status: 'fail', message: 'Deleting past school years is not allowed (view only).' });
    }

    // Delete the student
    const result = await query('DELETE FROM students WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 'fail', message: 'Student not found' });
    }

    res.json({
      status: 'success',
      message: 'Student deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

const PREVIOUS_FETCH_GRADE_PROGRESSION = {
  'Kindergarten': 'Grade 1',
  'Grade 1': 'Grade 2',
  'Grade 2': 'Grade 3',
  'Grade 3': 'Grade 4',
  'Grade 4': 'Grade 5',
  'Grade 5': 'Grade 6',
  'Grade 6': 'Graduate'
};

const OVERRIDABLE_RETAINED_REASON_REGEX = /incomplete grades for|promotion processing error|illegal mix of collations/i;

function normalizePromotionSubjectKey(value = '') {
  const key = String(value || '')
    .replace(/\s*\(grade\s*\d+\)\s*$/i, '')
    .replace(/\s*\(kindergarten\)\s*$/i, '')
    .trim()
    .toLowerCase();

  if (!key) return '';

  const aliases = {
    language: 'english',
    'language arts': 'english',
    english: 'english',
    makabansa: 'makabansa',
    'araling panlipunan': 'makabansa',
    hekasi: 'makabansa',
    'sibika at kultura': 'makabansa',
    gmrc: 'gmrc',
    'values education': 'gmrc'
  };

  return aliases[key] || key;
}

async function deriveEligibilityFromSourceGrades(studentId, sourceSchoolYearId) {
  const rows = await query(
    `SELECT subject, quarter, grade
     FROM grades
     WHERE student_id = ?
       AND school_year_id = ?
       AND quarter IN ('Q1','Q2','Q3','Q4')`,
    [studentId, sourceSchoolYearId]
  );

  if (!Array.isArray(rows) || rows.length === 0) {
    return { decisive: false, eligible: false };
  }

  const subjectMap = new Map();
  for (const row of rows) {
    const subjectKey = normalizePromotionSubjectKey(row?.subject || '');
    const quarter = String(row?.quarter || '').toUpperCase();
    const grade = Number(row?.grade || 0);
    if (!subjectKey || !['Q1', 'Q2', 'Q3', 'Q4'].includes(quarter)) continue;

    if (!subjectMap.has(subjectKey)) subjectMap.set(subjectKey, new Map());
    subjectMap.get(subjectKey).set(quarter, grade);
  }

  if (!subjectMap.size) {
    return { decisive: false, eligible: false };
  }

  let completeSubjectCount = 0;
  let hasFailingGrade = false;
  let hasPartialSubjects = false;

  for (const byQuarter of subjectMap.values()) {
    const complete = ['Q1', 'Q2', 'Q3', 'Q4'].every((q) => byQuarter.has(q) && Number(byQuarter.get(q) || 0) > 0);
    if (!complete) {
      hasPartialSubjects = true;
      continue;
    }

    completeSubjectCount += 1;
    for (const q of ['Q1', 'Q2', 'Q3', 'Q4']) {
      if (Number(byQuarter.get(q) || 0) < 75) {
        hasFailingGrade = true;
        break;
      }
    }
  }

  if (completeSubjectCount === 0 || hasPartialSubjects) {
    return { decisive: false, eligible: false, hasFailingGrade };
  }

  return { decisive: true, eligible: !hasFailingGrade, hasFailingGrade };
}

function shouldAttemptRetainedOverride(status, reason) {
  return String(status || '').toLowerCase() === 'retained' && OVERRIDABLE_RETAINED_REASON_REGEX.test(String(reason || ''));
}

function normalizeSectionName(value = '') {
  return String(value || '').trim().toLowerCase();
}

function toGradeKey(value = '') {
  return String(value || '').replace(/^Grade\s+/i, '').trim();
}

async function resolveDestinationSectionForGrade(sourceSchoolYearId, gradeLevel, preferredSection, cache) {
  const schoolYearIdNum = Number(sourceSchoolYearId || 0);
  if (!Number.isInteger(schoolYearIdNum) || schoolYearIdNum <= 0 || !gradeLevel) return null;

  const cacheKey = `${schoolYearIdNum}:${String(gradeLevel).toLowerCase()}`;
  let sections = cache.get(cacheKey);
  if (!sections) {
    const gradeKey = toGradeKey(gradeLevel);
    const rows = await query(
      `SELECT DISTINCT TRIM(section) AS section
       FROM classes
       WHERE school_year_id = ?
         AND section IS NOT NULL
         AND TRIM(section) <> ''
         AND (
           LOWER(TRIM(grade)) = LOWER(TRIM(?))
           OR LOWER(TRIM(grade)) = LOWER(TRIM(?))
           OR REPLACE(LOWER(TRIM(grade)), 'grade ', '') = LOWER(TRIM(?))
         )
       ORDER BY section ASC`,
      [schoolYearIdNum, gradeLevel, gradeKey, gradeKey]
    );

    sections = rows
      .map((row) => String(row?.section || '').trim())
      .filter(Boolean);
    cache.set(cacheKey, sections);
  }

  if (!sections.length) return null;

  const preferredNorm = normalizeSectionName(preferredSection);
  if (preferredNorm) {
    const nonMatching = sections.find((section) => normalizeSectionName(section) !== preferredNorm);
    if (nonMatching) return nonMatching;
  }

  return sections[0];
}

async function applyAutoPromotionOverride(candidate, sourceStudent, sourceSchoolYearId, cache, sectionCache) {
  if (!sourceStudent || !shouldAttemptRetainedOverride(candidate?.status, candidate?.reason)) {
    return candidate;
  }

  const cacheKey = String(sourceStudent.id || candidate.student_id || '');
  if (!cacheKey) return candidate;

  let derived = cache.get(cacheKey);
  if (!derived) {
    derived = await deriveEligibilityFromSourceGrades(sourceStudent.id, sourceSchoolYearId);
    cache.set(cacheKey, derived);
  }

  if (!derived?.decisive || !derived?.eligible) {
    return candidate;
  }

  const fromGrade = candidate.from_grade || sourceStudent.grade_level || null;
  const nextGrade = PREVIOUS_FETCH_GRADE_PROGRESSION[fromGrade];
  if (!nextGrade || nextGrade === 'Graduate') {
    return candidate;
  }

  const resolvedSection = await resolveDestinationSectionForGrade(
    sourceSchoolYearId,
    nextGrade,
    sourceStudent.section || candidate.to_section || null,
    sectionCache
  );

  return {
    ...candidate,
    status: 'promoted',
    from_grade: fromGrade,
    from_section: candidate.from_section || sourceStudent.section || null,
    to_grade: nextGrade,
    to_section: resolvedSection || null,
    reason: 'Auto-corrected from grade evidence'
  };
}

// -----------------------------
// FETCH PROMOTED/RETAINED FROM PREVIOUS SCHOOL YEAR
// -----------------------------
exports.fetchStudentsFromPreviousYear = async (req, res) => {
  try {
    await ensureStudentSchoolYearColumn();
    await ensureStudentBirthDateColumn();

    let targetSy;
    try {
      targetSy = await resolveTargetSchoolYear(req.query.schoolYearId || req.body?.schoolYearId);
    } catch (syErr) {
      return res.status(400).json({ success: false, message: syErr.message || 'No active school year found' });
    }

    const activeSy = await getActiveSchoolYear();
    if (!activeSy || Number(targetSy.id) !== Number(activeSy.id)) {
      return res.status(403).json({ success: false, message: 'Fetching students is only allowed in the active school year.' });
    }

    const sourceSchoolYears = await getHistoricalStudentSchoolYears(targetSy);
    const sourceSy = sourceSchoolYears[0] || null;
    if (!sourceSy) {
      return res.status(400).json({ success: false, message: 'No historical school year with student data found to fetch from.' });
    }

    const sourceSchoolYearIds = sourceSchoolYears
      .map((sy) => Number(sy?.id || 0))
      .filter((id) => Number.isInteger(id) && id > 0);
    if (!sourceSchoolYearIds.length) {
      return res.status(400).json({ success: false, message: 'No historical school year with student data found to fetch from.' });
    }

    const selectedIds = Array.isArray(req.body?.ids)
      ? req.body.ids.map((id) => String(id || '').trim()).filter(Boolean)
      : [];

    const statusPriority = (status = '') => {
      const normalized = String(status || '').toLowerCase();
      if (normalized === 'promoted') return 3;
      if (normalized === 'retained') return 2;
      if (normalized === 'historical') return 1;
      return 0;
    };

    const toTimestamp = (value) => {
      const date = value ? new Date(value) : null;
      const time = date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
      return time;
    };

    const sourcePlaceholders = sourceSchoolYearIds.map(() => '?').join(',');
    let promotionRows = await query(
      `SELECT ph.student_id, ph.lrn, ph.to_grade, ph.to_section, ph.status, ph.reason, ph.created_at, ph.school_year_id
       FROM promotion_history ph
       WHERE ph.school_year_id IN (${sourcePlaceholders})
         AND LOWER(ph.status) IN ('promoted', 'retained')
       ORDER BY ph.created_at DESC`,
      sourceSchoolYearIds
    );

    if (!promotionRows.length) {
      // Fallback for returnees/transfers: allow latest historical records even without promotion logs.
      promotionRows = await query(
        `SELECT id AS student_id, lrn,
                grade_level AS to_grade,
                section AS to_section,
                'historical' AS status,
                school_year_id,
                created_at
         FROM students
         WHERE school_year_id IN (${sourcePlaceholders})
         ORDER BY school_year_id DESC, created_at DESC`,
        sourceSchoolYearIds
      );
    }

    const sourceRows = await query(
      `SELECT *
       FROM students
       WHERE school_year_id IN (${sourcePlaceholders})
       ORDER BY school_year_id DESC, created_at DESC`,
      sourceSchoolYearIds
    );

    const sourceById = new Map();
    const sourceByLrn = new Map();
    sourceRows.forEach((row) => {
      const rowId = String(row.id || '');
      if (rowId && !sourceById.has(rowId)) {
        sourceById.set(rowId, row);
      }
      if (row.lrn && !sourceByLrn.has(String(row.lrn))) {
        sourceByLrn.set(String(row.lrn), row);
      }
    });

    // Canonicalize by source-school-year student/LRN and collapse conflicting history rows.
    const latestByLrn = new Map();
    const derivedEligibilityCache = new Map();
    const destinationSectionCache = new Map();
    for (const promo of promotionRows) {
      const sourceStudent = sourceById.get(String(promo.student_id || '')) || sourceByLrn.get(String(promo.lrn || ''));
      if (!sourceStudent || !sourceStudent.lrn) continue;

      const canonicalLrn = String(sourceStudent.lrn);
      const baseCandidate = {
        ...promo,
        canonical_student_id: String(sourceStudent.id || promo.student_id || ''),
        canonical_lrn: canonicalLrn,
        sourceStudent
      };
      const candidate = await applyAutoPromotionOverride(
        baseCandidate,
        sourceStudent,
        sourceStudent.school_year_id || sourceSy.id,
        derivedEligibilityCache,
        destinationSectionCache
      );

      const existing = latestByLrn.get(canonicalLrn);
      if (!existing) {
        latestByLrn.set(canonicalLrn, candidate);
        continue;
      }

      const existingPriority = statusPriority(existing.status);
      const candidatePriority = statusPriority(candidate.status);
      if (candidatePriority > existingPriority) {
        latestByLrn.set(canonicalLrn, candidate);
        continue;
      }

      if (candidatePriority === existingPriority && toTimestamp(candidate.created_at) > toTimestamp(existing.created_at)) {
        latestByLrn.set(canonicalLrn, candidate);
      }
    }

    // Include historical students without promotion logs (e.g., long-stop returnees).
    for (const row of sourceRows) {
      if (!row?.id || !row?.lrn) continue;
      const canonicalLrn = String(row.lrn);
      if (latestByLrn.has(canonicalLrn)) continue;

      latestByLrn.set(canonicalLrn, {
        student_id: row.id,
        canonical_student_id: String(row.id),
        canonical_lrn: canonicalLrn,
        lrn: row.lrn,
        from_grade: row.grade_level,
        from_section: row.section,
        to_grade: row.grade_level,
        to_section: row.section,
        status: 'historical',
        reason: 'No promotion history found',
        created_at: row.created_at || null,
        sourceStudent: row
      });
    }

    let normalizedPromotionRows = Array.from(latestByLrn.values())
      .sort((a, b) => toTimestamp(b.created_at) - toTimestamp(a.created_at));

    if (selectedIds.length > 0) {
      const selectedSet = new Set(selectedIds);
      normalizedPromotionRows = normalizedPromotionRows.filter((row) =>
        selectedSet.has(String(row.canonical_student_id || '')) || selectedSet.has(String(row.student_id || ''))
      );
    }

    if (!normalizedPromotionRows.length) {
      return res.json({ success: true, message: 'Nothing to fetch', data: { inserted: 0, skipped: 0, sourceSchoolYearId: sourceSy.id, targetSchoolYearId: targetSy.id } });
    }

    let inserted = 0;
    let skipped = 0;
    let promotedInserted = 0;
    let retainedInserted = 0;
    const sourceLrns = new Set();

    for (const promo of normalizedPromotionRows) {
      const sourceStudent = promo.sourceStudent || sourceById.get(String(promo.student_id || '')) || sourceByLrn.get(String(promo.lrn || ''));
      if (!sourceStudent || !sourceStudent.lrn) {
        skipped += 1;
        continue;
      }

      sourceLrns.add(String(sourceStudent.lrn));

      const duplicate = await query(
        'SELECT id FROM students WHERE lrn = ? AND school_year_id = ? LIMIT 1',
        [sourceStudent.lrn, targetSy.id]
      );
      if (duplicate.length > 0) {
        skipped += 1;
        continue;
      }

      const nextGradeLevel = promo.to_grade || sourceStudent.grade_level;
      let nextSection = promo.to_section || sourceStudent.section;
      if (String(promo.status || '').toLowerCase() === 'promoted' && nextGradeLevel) {
        const resolvedSection = await resolveDestinationSectionForGrade(
          sourceStudent.school_year_id || sourceSy.id,
          nextGradeLevel,
          nextSection,
          destinationSectionCache
        );
        if (resolvedSection) {
          nextSection = resolvedSection;
        }
      }
      const normalizedStatus = String(sourceStudent.status || '').toLowerCase();
      const nextStatus = (normalizedStatus === 'declined' || normalizedStatus === 'pending' || normalizedStatus === 'rejected')
        ? 'Active'
        : (sourceStudent.status || 'Active');

      await query(
        `INSERT INTO students (
          lrn, first_name, middle_name, last_name, age, birth_date, sex,
          grade_level, section, parent_first_name, parent_last_name,
          parent_email, parent_contact, student_email, password,
          profile_pic, qr_code, status, created_by, school_year_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          sourceStudent.lrn,
          sourceStudent.first_name || '',
          sourceStudent.middle_name || null,
          sourceStudent.last_name || '',
          sourceStudent.age || 0,
          sourceStudent.birth_date || null,
          sourceStudent.sex || 'N/A',
          nextGradeLevel,
          nextSection,
          sourceStudent.parent_first_name || null,
          sourceStudent.parent_last_name || null,
          sourceStudent.parent_email || null,
          sourceStudent.parent_contact || null,
          sourceStudent.student_email || null,
          sourceStudent.password || null,
          sourceStudent.profile_pic || null,
          sourceStudent.qr_code || null,
          nextStatus,
          'system-fetch',
          targetSy.id
        ]
      );

      inserted += 1;
      if (String(promo.status).toLowerCase() === 'promoted') promotedInserted += 1;
      if (String(promo.status).toLowerCase() === 'retained') retainedInserted += 1;
    }

    // Fresh-start rule: after fetch, remove active-year grades for all matching LRNs
    // so promoted/retained students do not carry old grades into the active year.
    const lrnList = [...sourceLrns].filter(Boolean);
    if (lrnList.length > 0) {
      const placeholders = lrnList.map(() => '?').join(',');
      await query(
        `DELETE g
         FROM grades g
         INNER JOIN students s
           ON s.id = g.student_id
          AND s.school_year_id = ?
         WHERE g.school_year_id = ?
           AND s.lrn IN (${placeholders})`,
        [targetSy.id, targetSy.id, ...lrnList]
      );
    }

    return res.json({
      success: true,
      message: 'Fetch complete',
      data: {
        inserted,
        skipped,
        promotedInserted,
        retainedInserted,
        sourceSchoolYearId: sourceSy.id,
        sourceSchoolYearIds,
        targetSchoolYearId: targetSy.id
      }
    });
  } catch (error) {
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      return res.status(400).json({ success: false, message: 'Promotion history is not available yet. Please run promotion first.' });
    }
    console.error('Error fetching students from previous year:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch students from previous year' });
  }
};

// -----------------------------
// LIST PREVIOUS YEAR PROMOTION CANDIDATES
// -----------------------------
exports.getPreviousYearPromotionCandidates = async (req, res) => {
  try {
    await ensureStudentSchoolYearColumn();

    let targetSy;
    try {
      targetSy = await resolveTargetSchoolYear(req.query.schoolYearId || req.body?.schoolYearId);
    } catch (syErr) {
      return res.status(400).json({ success: false, message: syErr.message || 'No active school year found' });
    }

    const sourceSchoolYears = await getHistoricalStudentSchoolYears(targetSy);
    const sourceSy = sourceSchoolYears[0] || null;
    if (!sourceSy) {
      return res.json({ success: true, data: [], meta: { sourceSchoolYearId: null, targetSchoolYearId: targetSy.id } });
    }

    const sourceSchoolYearIds = sourceSchoolYears
      .map((sy) => Number(sy?.id || 0))
      .filter((id) => Number.isInteger(id) && id > 0);
    if (!sourceSchoolYearIds.length) {
      return res.json({ success: true, data: [], meta: { sourceSchoolYearId: null, targetSchoolYearId: targetSy.id } });
    }

    const sourcePlaceholders = sourceSchoolYearIds.map(() => '?').join(',');

    const sourceRows = await query(
      `SELECT id, lrn, first_name, middle_name, last_name, grade_level, section, school_year_id, created_at
       FROM students
       WHERE school_year_id IN (${sourcePlaceholders})
       ORDER BY school_year_id DESC, created_at DESC`,
      sourceSchoolYearIds
    );

    const statusPriority = (status = '') => {
      const normalized = String(status || '').toLowerCase();
      if (normalized === 'promoted') return 3;
      if (normalized === 'retained') return 2;
      if (normalized === 'historical') return 1;
      return 0;
    };

    const toTimestamp = (value) => {
      const date = value ? new Date(value) : null;
      const time = date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
      return time;
    };

    let promotionRows = await query(
      `SELECT ph.student_id, ph.lrn, ph.from_grade, ph.from_section, ph.to_grade, ph.to_section, ph.status, ph.reason, ph.created_at, ph.school_year_id
       FROM promotion_history ph
       WHERE ph.school_year_id IN (${sourcePlaceholders})
         AND LOWER(ph.status) IN ('promoted', 'retained')
       ORDER BY ph.created_at DESC`,
      sourceSchoolYearIds
    );

    const sourceById = new Map();
    const sourceByLrn = new Map();
    sourceRows.forEach((row) => {
      const rowId = String(row.id || '');
      if (rowId && !sourceById.has(rowId)) {
        sourceById.set(rowId, row);
      }
      if (row.lrn && !sourceByLrn.has(String(row.lrn))) {
        sourceByLrn.set(String(row.lrn), row);
      }
    });

    // Canonicalize and dedupe by source-school-year LRN.
    const latestByLrn = new Map();
    const derivedEligibilityCache = new Map();
    const destinationSectionCache = new Map();
    for (const promo of promotionRows) {
      const sourceStudent = sourceById.get(String(promo.student_id || '')) || sourceByLrn.get(String(promo.lrn || ''));
      if (!sourceStudent || !sourceStudent.lrn) continue;

      const canonicalLrn = String(sourceStudent.lrn);
      const baseCandidate = {
        ...promo,
        canonical_student_id: String(sourceStudent.id || promo.student_id || ''),
        canonical_lrn: canonicalLrn,
        sourceStudent
      };
      const candidate = await applyAutoPromotionOverride(
        baseCandidate,
        sourceStudent,
        sourceStudent.school_year_id || sourceSy.id,
        derivedEligibilityCache,
        destinationSectionCache
      );

      const existing = latestByLrn.get(canonicalLrn);
      if (!existing) {
        latestByLrn.set(canonicalLrn, candidate);
        continue;
      }

      const existingPriority = statusPriority(existing.status);
      const candidatePriority = statusPriority(candidate.status);
      if (candidatePriority > existingPriority) {
        latestByLrn.set(canonicalLrn, candidate);
        continue;
      }

      if (candidatePriority === existingPriority && toTimestamp(candidate.created_at) > toTimestamp(existing.created_at)) {
        latestByLrn.set(canonicalLrn, candidate);
      }
    }

    // Include historical students without promotion logs (e.g., long-stop returnees).
    for (const row of sourceRows) {
      if (!row?.id || !row?.lrn) continue;
      const canonicalLrn = String(row.lrn);
      if (latestByLrn.has(canonicalLrn)) continue;

      latestByLrn.set(canonicalLrn, {
        student_id: row.id,
        canonical_student_id: String(row.id),
        canonical_lrn: canonicalLrn,
        lrn: row.lrn,
        from_grade: row.grade_level,
        from_section: row.section,
        to_grade: row.grade_level,
        to_section: row.section,
        status: 'historical',
        created_at: row.created_at || null,
        sourceStudent: row
      });
    }

    let normalizedPromotionRows = Array.from(latestByLrn.values());
    if (!normalizedPromotionRows.length) {
      normalizedPromotionRows = sourceRows
        .filter((row) => row?.id && row?.lrn)
        .map((row) => ({
          student_id: row.id,
          canonical_student_id: String(row.id),
          canonical_lrn: String(row.lrn),
          lrn: row.lrn,
          from_grade: row.grade_level,
          from_section: row.section,
          to_grade: row.grade_level,
          to_section: row.section,
          status: 'historical',
          created_at: row.created_at || null,
          sourceStudent: row
        }));
    }

    const lrns = [...new Set(normalizedPromotionRows.map((promo) => promo.canonical_lrn).filter(Boolean))];

    const existingLrnsInTarget = new Set();
    if (lrns.length > 0) {
      const placeholders = lrns.map(() => '?').join(',');
      const existingRows = await query(
        `SELECT lrn FROM students WHERE school_year_id = ? AND lrn IN (${placeholders})`,
        [targetSy.id, ...lrns]
      );
      existingRows.forEach((row) => {
        if (row?.lrn) existingLrnsInTarget.add(String(row.lrn));
      });
    }

    const candidates = normalizedPromotionRows
      .sort((a, b) => toTimestamp(b.created_at) - toTimestamp(a.created_at))
      .map((promo) => {
      const sourceStudent = promo.sourceStudent || sourceById.get(String(promo.student_id || '')) || sourceByLrn.get(String(promo.lrn || ''));
      const lrn = sourceStudent?.lrn || promo.lrn || null;
      const firstName = sourceStudent?.first_name || '';
      const middleName = sourceStudent?.middle_name || '';
      const lastName = sourceStudent?.last_name || '';
      const fullName = `${firstName} ${middleName || ''} ${lastName}`.replace(/\s+/g, ' ').trim();

      return {
        id: String(promo.canonical_student_id || promo.student_id || sourceStudent?.id || ''),
        lrn,
        fullName: fullName || 'Unknown Student',
        fromGrade: promo.from_grade || sourceStudent?.grade_level || null,
        fromSection: promo.from_section || sourceStudent?.section || null,
        toGrade: promo.to_grade || sourceStudent?.grade_level || null,
        toSection: promo.to_section || sourceStudent?.section || null,
        status: promo.status,
        promotedAt: promo.created_at,
        alreadyFetched: lrn ? existingLrnsInTarget.has(String(lrn)) : false
      };
    }).filter((item) => item.id && item.lrn && item.fullName !== 'Unknown Student');

    return res.json({
      success: true,
      data: candidates,
      meta: {
        sourceSchoolYearId: sourceSy.id,
        sourceSchoolYearIds,
        sourceSchoolYearLabel: sourceSchoolYears.length > 1
          ? `${sourceSy.label} and older years`
          : sourceSy.label,
        targetSchoolYearId: targetSy.id,
        targetSchoolYearLabel: targetSy.label
      }
    });
  } catch (error) {
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      return res.json({ success: true, data: [], meta: { sourceSchoolYearId: null } });
    }
    console.error('Error listing previous year promotion candidates:', error);
    return res.status(500).json({ success: false, message: 'Failed to load previous year students' });
  }
};