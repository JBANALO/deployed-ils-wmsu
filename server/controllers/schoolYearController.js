const { query, pool } = require('../config/database');

let leadershipColumnsEnsured = false;

async function ensureSchoolYearLeadershipColumns() {
  if (leadershipColumnsEnsured) return;

  const columns = await query('SHOW COLUMNS FROM school_years');
  const hasPrincipal = columns.some(c => c.Field === 'principal_name');
  const hasAssistantPrincipal = columns.some(c => c.Field === 'assistant_principal_name');

  if (!hasPrincipal) {
    await query('ALTER TABLE school_years ADD COLUMN principal_name VARCHAR(255) NULL AFTER end_date');
  }

  if (!hasAssistantPrincipal) {
    await query('ALTER TABLE school_years ADD COLUMN assistant_principal_name VARCHAR(255) NULL AFTER principal_name');
  }

  leadershipColumnsEnsured = true;
}

// Get all school years (non-archived)
exports.getAllSchoolYears = async (req, res) => {
  try {
    await ensureSchoolYearLeadershipColumns();
    const rows = await query(
      'SELECT * FROM school_years WHERE is_archived = 0 ORDER BY start_date DESC'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching school years:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch school years' });
  }
};

// Get active school year
exports.getActiveSchoolYear = async (req, res) => {
  try {
    await ensureSchoolYearLeadershipColumns();
    const rows = await query(
      'SELECT * FROM school_years WHERE is_active = 1 AND is_archived = 0 LIMIT 1'
    );
    if (rows.length === 0) {
      return res.json({ success: true, data: null });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error fetching active school year:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch active school year' });
  }
};

// Get archived school years
exports.getArchivedSchoolYears = async (req, res) => {
  try {
    await ensureSchoolYearLeadershipColumns();
    const rows = await query(
      'SELECT * FROM school_years WHERE is_archived = 1 ORDER BY start_date DESC'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching archived school years:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch archived school years' });
  }
};

// Create a new school year
exports.createSchoolYear = async (req, res) => {
  try {
    await ensureSchoolYearLeadershipColumns();
    const { label, start_date, end_date, is_active, principal_name, assistant_principal_name } = req.body;

    // Validate required fields
    if (!label || !start_date || !end_date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Label, start date, and end date are required' 
      });
    }

    // If setting as active, deactivate others first
    if (is_active) {
      await query('UPDATE school_years SET is_active = 0');
    }

    const result = await query(
      `INSERT INTO school_years (
        label, start_date, end_date, principal_name, assistant_principal_name, is_active
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        label,
        start_date,
        end_date,
        principal_name ? String(principal_name).trim() : null,
        assistant_principal_name ? String(assistant_principal_name).trim() : null,
        is_active ? 1 : 0
      ]
    );

    res.status(201).json({ 
      success: true, 
      message: 'School year created successfully',
      data: {
        id: result.insertId,
        label,
        start_date,
        end_date,
        principal_name: principal_name ? String(principal_name).trim() : null,
        assistant_principal_name: assistant_principal_name ? String(assistant_principal_name).trim() : null,
        is_active: is_active ? 1 : 0
      }
    });
  } catch (error) {
    console.error('Error creating school year:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'School year label already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to create school year' });
  }
};

// Update a school year
exports.updateSchoolYear = async (req, res) => {
  try {
    await ensureSchoolYearLeadershipColumns();
    const { id } = req.params;
    const { label, start_date, end_date, is_active, principal_name, assistant_principal_name } = req.body;

    // If setting as active, deactivate others first
    if (is_active) {
      await query('UPDATE school_years SET is_active = 0 WHERE id != ?', [id]);
    }

    const result = await query(
      `UPDATE school_years
       SET label = ?, start_date = ?, end_date = ?, principal_name = ?, assistant_principal_name = ?,
           is_active = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        label,
        start_date,
        end_date,
        principal_name ? String(principal_name).trim() : null,
        assistant_principal_name ? String(assistant_principal_name).trim() : null,
        is_active ? 1 : 0,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'School year not found' });
    }

    res.json({ success: true, message: 'School year updated successfully' });
  } catch (error) {
    console.error('Error updating school year:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'School year label already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to update school year' });
  }
};

// Set active school year
exports.setActiveSchoolYear = async (req, res) => {
  try {
    const { id } = req.params;

    // Deactivate all school years first
    await query('UPDATE school_years SET is_active = 0');

    // Activate the selected one
    const result = await query(
      'UPDATE school_years SET is_active = 1, updated_at = NOW() WHERE id = ? AND is_archived = 0',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'School year not found or is archived' });
    }

    res.json({ success: true, message: 'School year activated successfully' });
  } catch (error) {
    console.error('Error setting active school year:', error);
    res.status(500).json({ success: false, message: 'Failed to set active school year' });
  }
};

// Archive a school year
exports.archiveSchoolYear = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if it's the active school year
    const activeCheck = await query(
      'SELECT is_active FROM school_years WHERE id = ?',
      [id]
    );

    if (activeCheck.length > 0 && activeCheck[0].is_active) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot archive the active school year. Please set another school year as active first.' 
      });
    }

    const result = await query(
      'UPDATE school_years SET is_archived = 1, is_active = 0, updated_at = NOW() WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'School year not found' });
    }

    res.json({ success: true, message: 'School year archived successfully' });
  } catch (error) {
    console.error('Error archiving school year:', error);
    res.status(500).json({ success: false, message: 'Failed to archive school year' });
  }
};

// Restore an archived school year
exports.restoreSchoolYear = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'UPDATE school_years SET is_archived = 0, updated_at = NOW() WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'School year not found' });
    }

    res.json({ success: true, message: 'School year restored successfully' });
  } catch (error) {
    console.error('Error restoring school year:', error);
    res.status(500).json({ success: false, message: 'Failed to restore school year' });
  }
};

// Get student count by grade level (for chart)
exports.getStudentsByGrade = async (req, res) => {
  try {
    const rows = await query(`
      SELECT 
        CASE
          WHEN grade_level = 'Kindergarten' THEN 'Kinder'
          WHEN grade_level = 'Grade 1' THEN 'Grade 1'
          WHEN grade_level = 'Grade 2' THEN 'Grade 2'
          WHEN grade_level = 'Grade 3' THEN 'Grade 3'
          WHEN grade_level = 'Grade 4' THEN 'Grade 4'
          WHEN grade_level = 'Grade 5' THEN 'Grade 5'
          WHEN grade_level = 'Grade 6' THEN 'Grade 6'
          ELSE 'Other'
        END AS grade,
        COUNT(*) as count
      FROM students
      GROUP BY grade
      ORDER BY grade
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching students by grade:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch students by grade' });
  }
};

// Grade progression map
const GRADE_PROGRESSION = {
  'Kindergarten': 'Grade 1',
  'Grade 1':      'Grade 2',
  'Grade 2':      'Grade 3',
  'Grade 3':      'Grade 4',
  'Grade 4':      'Grade 5',
  'Grade 5':      'Grade 6',
  'Grade 6':      'Graduate'
};
const PASSING_GRADE = 75;
const REQUIRED_QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

function toGradeKey(gradeLevel = '') {
  return String(gradeLevel).replace(/^Grade\s+/i, '').trim();
}

async function getRequiredSubjectsForGrade(conn, gradeLevel) {
  const gradeKey = toGradeKey(gradeLevel);
  if (!gradeKey) return [];

  const [rows] = await conn.query(
    'SELECT name FROM subjects WHERE is_archived = 0 AND FIND_IN_SET(?, grade_levels) ORDER BY name',
    [gradeKey]
  );

  return rows.map(r => r.name).filter(Boolean);
}

function normalizeSubjectName(value = '') {
  return String(value)
    .replace(/\s*\(Grade\s+\d+\)\s*$/i, '')
    .replace(/\s*\(Kindergarten\)\s*$/i, '')
    .trim()
    .toLowerCase();
}

async function evaluatePromotionEligibility(conn, student) {
  const requiredSubjects = await getRequiredSubjectsForGrade(conn, student.grade_level);
  if (requiredSubjects.length === 0) {
    return {
      eligible: false,
      average: 0,
      hasCompleteGrades: false,
      hasFailingGrade: false,
      reason: 'No subjects configured for this grade level'
    };
  }

  const [gradeRows] = await conn.query(
    `SELECT subject, quarter, grade
     FROM grades
     WHERE student_id = ? AND quarter IN ('Q1','Q2','Q3','Q4')`,
    [student.id]
  );

  const gradeMap = new Map();
  for (const row of gradeRows) {
    const subjectKey = normalizeSubjectName(row.subject);
    const quarterKey = String(row.quarter || '').toUpperCase();
    const gradeValue = Number(row.grade || 0);

    if (!subjectKey || !REQUIRED_QUARTERS.includes(quarterKey)) continue;
    if (!gradeMap.has(subjectKey)) gradeMap.set(subjectKey, new Map());
    gradeMap.get(subjectKey).set(quarterKey, gradeValue);
  }

  let total = 0;
  let count = 0;
  let hasFailingGrade = false;

  for (const subject of requiredSubjects) {
    const subjectKey = normalizeSubjectName(subject);
    const byQuarter = gradeMap.get(subjectKey);
    const complete = byQuarter && REQUIRED_QUARTERS.every(q => byQuarter.has(q) && byQuarter.get(q) > 0);

    if (!complete) {
      return {
        eligible: false,
        average: 0,
        hasCompleteGrades: false,
        hasFailingGrade: false,
        reason: `Incomplete grades for ${subject}`
      };
    }

    for (const q of REQUIRED_QUARTERS) {
      const g = Number(byQuarter.get(q) || 0);
      total += g;
      count += 1;
      if (g < PASSING_GRADE) hasFailingGrade = true;
    }
  }

  const average = count > 0 ? total / count : 0;
  const eligible = !hasFailingGrade && average >= PASSING_GRADE;

  return {
    eligible,
    average,
    hasCompleteGrades: true,
    hasFailingGrade,
    reason: eligible
      ? 'Eligible for promotion'
      : (hasFailingGrade
        ? `Has failing grade below ${PASSING_GRADE}`
        : `Average below ${PASSING_GRADE}`)
  };
}

async function ensurePromotionHistoryTable(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS promotion_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      school_year_id INT NULL,
      school_year_label VARCHAR(50) NULL,
      student_id VARCHAR(100) NOT NULL,
      lrn VARCHAR(50) NULL,
      student_name VARCHAR(255) NOT NULL,
      from_grade VARCHAR(50) NOT NULL,
      from_section VARCHAR(100) NULL,
      to_grade VARCHAR(50) NULL,
      to_section VARCHAR(100) NULL,
      average DECIMAL(5,2) NULL,
      status VARCHAR(30) NOT NULL,
      reason VARCHAR(255) NULL,
      details_json JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_student_id (student_id),
      INDEX idx_created_at (created_at)
    )
  `);

  // Backward compatibility: older deployments created student_id as INT.
  // Promotion now supports UUID/string student IDs as well.
  try {
    const [cols] = await conn.query(
      `SELECT DATA_TYPE
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'promotion_history'
         AND COLUMN_NAME = 'student_id'
       LIMIT 1`
    );
    const dataType = String(cols?.[0]?.DATA_TYPE || '').toLowerCase();
    if (dataType && dataType !== 'varchar') {
      await conn.query('ALTER TABLE promotion_history MODIFY COLUMN student_id VARCHAR(100) NOT NULL');
    }
  } catch (migrationErr) {
    console.error('Promotion history student_id migration warning:', migrationErr.message);
  }
}

async function getActiveSchoolYearMeta(conn) {
  const [rows] = await conn.query(
    'SELECT id, label FROM school_years WHERE is_active = 1 AND is_archived = 0 LIMIT 1'
  );
  return rows[0] || null;
}

async function getSchoolYearMetaById(conn, schoolYearId) {
  const id = Number(schoolYearId);
  if (!Number.isInteger(id) || id <= 0) return null;
  const [rows] = await conn.query(
    'SELECT id, label FROM school_years WHERE id = ? AND is_archived = 0 LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function logPromotionHistory(conn, payload) {
  await conn.query(
    `INSERT INTO promotion_history
      (school_year_id, school_year_label, student_id, lrn, student_name, from_grade, from_section, to_grade, to_section, average, status, reason, details_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
    [
      payload.schoolYearId || null,
      payload.schoolYearLabel || null,
      payload.studentId,
      payload.lrn || null,
      payload.studentName,
      payload.fromGrade,
      payload.fromSection || null,
      payload.toGrade || null,
      payload.toSection || null,
      payload.average != null ? Number(payload.average).toFixed(2) : null,
      payload.status,
      payload.reason || null,
      JSON.stringify(payload.details || {})
    ]
  );
}

async function getStudentsForPromotion(conn, studentIds = null) {
  if (Array.isArray(studentIds) && studentIds.length > 0) {
    const placeholders = studentIds.map(() => '?').join(',');
    const [rows] = await conn.query(
      `SELECT id, lrn, first_name, last_name, grade_level, section
       FROM students
       WHERE id IN (${placeholders})
       ORDER BY grade_level, section, last_name, first_name`,
      studentIds
    );
    return rows;
  }

  const [rows] = await conn.query(
    'SELECT id, lrn, first_name, last_name, grade_level, section FROM students ORDER BY grade_level, section, last_name, first_name'
  );
  return rows;
}

async function buildPromotionCandidate(conn, student) {
  const currentGrade = student.grade_level || '';
  const nextGrade = GRADE_PROGRESSION[currentGrade];
  const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim();

  if (!nextGrade) {
    return {
      id: student.id,
      lrn: student.lrn || null,
      name: studentName,
      fromGrade: currentGrade,
      fromSection: student.section || null,
      toGrade: null,
      toSection: student.section || null,
      canPromote: false,
      reason: 'No promotion path for current grade',
      average: 0,
      hasCompleteGrades: false,
      hasFailingGrade: false
    };
  }

  const eligibility = await evaluatePromotionEligibility(conn, student);
  return {
    id: student.id,
    lrn: student.lrn || null,
    name: studentName,
    fromGrade: currentGrade,
    fromSection: student.section || null,
    toGrade: nextGrade,
    toSection: student.section || null,
    canPromote: eligibility.eligible,
    reason: eligibility.reason,
    average: Number(eligibility.average || 0).toFixed(2),
    hasCompleteGrades: eligibility.hasCompleteGrades,
    hasFailingGrade: eligibility.hasFailingGrade
  };
}

// Pick destination class for promoted student in the target grade.
// Strategy: choose class with lowest current student count to balance sections.
async function pickDestinationClass(conn, targetGrade) {
  const [rows] = await conn.query(
    `SELECT c.id, c.grade, c.section, c.adviser_id, c.adviser_name,
            COUNT(s.id) AS student_count
     FROM classes c
     LEFT JOIN students s
       ON s.grade_level = c.grade AND s.section = c.section
     WHERE c.grade = ?
     GROUP BY c.id, c.grade, c.section, c.adviser_id, c.adviser_name
     ORDER BY student_count ASC, c.section ASC`,
    [targetGrade]
  );

  return rows[0] || null;
}

// Promote students to next grade
exports.promoteStudents = async (req, res) => {
  let connection;

  try {
    const requestedIdsRaw = Array.isArray(req.body?.studentIds) ? req.body.studentIds : [];
    const requestedStudentIds = requestedIdsRaw
      .map(id => String(id || '').trim())
      .filter(Boolean);
    const requestedSchoolYearId = Number(req.body?.schoolYearId || 0);
    const assignmentsRaw = Array.isArray(req.body?.assignments) ? req.body.assignments : [];
    const assignmentByStudentId = new Map();

    assignmentsRaw.forEach((item) => {
      const studentId = String(item?.studentId || '').trim();
      const classId = String(item?.classId || '').trim();
      if (studentId && classId) {
        assignmentByStudentId.set(studentId, classId);
      }
    });

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const promotions = [];
    const graduates  = [];
    const retained   = [];

    await ensurePromotionHistoryTable(connection);
    const selectedSY = await getSchoolYearMetaById(connection, requestedSchoolYearId);
    const activeSY = selectedSY || await getActiveSchoolYearMeta(connection);

    const students = await getStudentsForPromotion(connection, requestedStudentIds.length > 0 ? requestedStudentIds : null);

    if (requestedStudentIds.length > 0 && students.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'No valid selected students found for promotion' });
    }

    for (const student of students) {
      const currentGrade = student.grade_level || '';
      const nextGrade    = GRADE_PROGRESSION[currentGrade];
      const studentName  = `${student.first_name || ''} ${student.last_name || ''}`.trim();
      const currentSection = student.section || null;

      if (!nextGrade) continue; // unknown grade level — skip

      const eligibility = await evaluatePromotionEligibility(connection, student);
      const avg = Number(eligibility.average || 0);
      const passed = eligibility.eligible;

      if (!passed) {
        // Retain student
        const retainedRow = {
          id: student.id,
          name: studentName,
          grade: currentGrade,
          avg: avg.toFixed(2),
          reason: eligibility.reason
        };
        retained.push(retainedRow);

        await logPromotionHistory(connection, {
          schoolYearId: activeSY?.id,
          schoolYearLabel: activeSY?.label,
          studentId: student.id,
          lrn: student.lrn,
          studentName,
          fromGrade: currentGrade,
          fromSection: currentSection,
          toGrade: currentGrade,
          toSection: currentSection,
          average: avg,
          status: 'retained',
          reason: eligibility.reason,
          details: { hasCompleteGrades: eligibility.hasCompleteGrades, hasFailingGrade: eligibility.hasFailingGrade }
        });
        continue;
      }

      if (nextGrade === 'Graduate') {
        // Mark as graduated
        await connection.query(
          "UPDATE students SET grade_level = 'Graduate', status = 'graduated' WHERE id = ?",
          [student.id]
        );
        const row = { id: student.id, name: studentName, fromGrade: currentGrade, avg: avg.toFixed(2) };
        graduates.push(row);

        await logPromotionHistory(connection, {
          schoolYearId: activeSY?.id,
          schoolYearLabel: activeSY?.label,
          studentId: student.id,
          lrn: student.lrn,
          studentName,
          fromGrade: currentGrade,
          fromSection: currentSection,
          toGrade: 'Graduate',
          toSection: currentSection,
          average: avg,
          status: 'graduated',
          reason: 'Completed all subjects and passed all quarters',
          details: { hasCompleteGrades: true, hasFailingGrade: false }
        });
      } else {
        let destinationClass = null;
        const requestedClassId = assignmentByStudentId.get(String(student.id));
        if (requestedClassId) {
          const [rows] = await connection.query(
            `SELECT id, grade, section, adviser_id, adviser_name
             FROM classes
             WHERE id = ? AND grade = ?
             LIMIT 1`,
            [requestedClassId, nextGrade]
          );
          destinationClass = rows[0] || null;
        }

        if (!destinationClass) {
          if (requestedStudentIds.length > 0) {
            await connection.rollback();
            return res.status(400).json({
              success: false,
              message: `Missing or invalid destination class assignment for ${studentName} (${nextGrade})`
            });
          }
          destinationClass = await pickDestinationClass(connection, nextGrade);
        }

        const nextSection = destinationClass?.section || currentSection;

        await connection.query(
          'UPDATE students SET grade_level = ?, section = ? WHERE id = ?',
          [nextGrade, nextSection, student.id]
        );

        const row = {
          id: student.id,
          name: studentName,
          fromGrade: currentGrade,
          fromSection: currentSection,
          toGrade: nextGrade,
          toSection: nextSection,
          adviser: destinationClass?.adviser_name || null,
          avg: avg.toFixed(2)
        };
        promotions.push(row);

        await logPromotionHistory(connection, {
          schoolYearId: activeSY?.id,
          schoolYearLabel: activeSY?.label,
          studentId: student.id,
          lrn: student.lrn,
          studentName,
          fromGrade: currentGrade,
          fromSection: currentSection,
          toGrade: nextGrade,
          toSection: nextSection,
          average: avg,
          status: 'promoted',
          reason: 'Completed all subjects and passed all quarters',
          details: {
            hasCompleteGrades: true,
            hasFailingGrade: false,
            destinationClassId: destinationClass?.id || null,
            destinationAdviserId: destinationClass?.adviser_id || null,
            destinationAdviserName: destinationClass?.adviser_name || null
          }
        });
      }
    }

    await connection.commit();

    const scopeText = requestedStudentIds.length > 0
      ? `from ${requestedStudentIds.length} selected student(s)`
      : 'from all students';

    res.json({
      success: true,
      message: `Promoted ${promotions.length} students ${scopeText}. ${graduates.length} graduated. ${retained.length} retained.`,
      data: { promotions, graduates, retained, totalPromoted: promotions.length, totalGraduated: graduates.length, totalRetained: retained.length }
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error promoting students:', error);
    res.status(500).json({ success: false, message: 'Failed to promote students' });
  } finally {
    if (connection) connection.release();
  }
};

// Get promotion candidates with eligibility (for select-to-promote UI)
exports.getPromotionCandidates = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const students = await getStudentsForPromotion(connection, null);

    const candidates = [];
    for (const student of students) {
      const candidate = await buildPromotionCandidate(connection, student);
      if (candidate.toGrade) {
        candidates.push(candidate);
      }
    }

    res.json({ success: true, data: candidates });
  } catch (error) {
    console.error('Error fetching promotion candidates:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch promotion candidates' });
  } finally {
    if (connection) connection.release();
  }
};

// Get promotion preview (without actually promoting)
exports.getPromotionPreview = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    // For each grade level, count how many students will pass (avg >= 75) vs be retained
    const gradeOrder = ['Kindergarten','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6'];

    const preview = [];
    for (const grade of gradeOrder) {
      const nextGrade    = GRADE_PROGRESSION[grade];
      const isGraduating = nextGrade === 'Graduate';

      // Students in this grade
      const totalRows = await query('SELECT COUNT(*) as cnt FROM students WHERE grade_level = ?', [grade]);
      const totalCount = Number(totalRows?.[0]?.cnt || 0);
      if (totalCount === 0) continue;

      const [students] = await connection.query(
        'SELECT id, first_name, last_name, grade_level, section FROM students WHERE grade_level = ? ORDER BY last_name, first_name',
        [grade]
      );

      let willPromote = 0;
      let willRetain = 0;
      let completeCount = 0;
      let incompleteCount = 0;
      let failingCount = 0;

      for (const student of students) {
        const eligibility = await evaluatePromotionEligibility(connection, student);
        if (eligibility.hasCompleteGrades) completeCount += 1;
        else incompleteCount += 1;
        if (eligibility.hasFailingGrade) failingCount += 1;

        if (eligibility.eligible) willPromote += 1;
        else willRetain += 1;
      }

      preview.push({
        fromGrade: grade,
        toGrade: isGraduating ? 'Graduate 🎓' : nextGrade,
        total: totalCount,
        willPromote,
        willRetain,
        completeCount,
        incompleteCount,
        failingCount,
        isGraduating
      });
    }

    res.json({ success: true, data: preview });
  } catch (error) {
    console.error('Error fetching promotion preview:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch promotion preview' });
  } finally {
    if (connection) connection.release();
  }
};

// Get promotion history logs
exports.getPromotionHistory = async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, school_year_label, student_id, lrn, student_name, from_grade, from_section, to_grade, to_section,
              average, status, reason, created_at
       FROM promotion_history
       ORDER BY created_at DESC
       LIMIT 500`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    // If table doesn't exist yet on a fresh DB, return empty list instead of failing page load
    if (error && error.code === 'ER_NO_SUCH_TABLE') {
      return res.json({ success: true, data: [] });
    }
    console.error('Error fetching promotion history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch promotion history' });
  }
};

// Delete a school year (only if not active and no associated records)
exports.deleteSchoolYear = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if it's the active school year
    const activeCheck = await query(
      'SELECT is_active FROM school_years WHERE id = ?',
      [id]
    );

    if (activeCheck.length > 0 && activeCheck[0].is_active) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete the active school year.' 
      });
    }

    const result = await query('DELETE FROM school_years WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'School year not found' });
    }

    res.json({ success: true, message: 'School year deleted successfully' });
  } catch (error) {
    console.error('Error deleting school year:', error);
    res.status(500).json({ success: false, message: 'Failed to delete school year' });
  }
};
