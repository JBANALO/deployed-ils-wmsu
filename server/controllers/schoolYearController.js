const { query, pool } = require('../config/database');

// Get all school years (non-archived)
exports.getAllSchoolYears = async (req, res) => {
  try {
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
    const { label, start_date, end_date, is_active } = req.body;

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
      'INSERT INTO school_years (label, start_date, end_date, is_active) VALUES (?, ?, ?, ?)',
      [label, start_date, end_date, is_active ? 1 : 0]
    );

    res.status(201).json({ 
      success: true, 
      message: 'School year created successfully',
      data: { id: result.insertId, label, start_date, end_date, is_active: is_active ? 1 : 0 }
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
    const { id } = req.params;
    const { label, start_date, end_date, is_active } = req.body;

    // If setting as active, deactivate others first
    if (is_active) {
      await query('UPDATE school_years SET is_active = 0 WHERE id != ?', [id]);
    }

    const result = await query(
      'UPDATE school_years SET label = ?, start_date = ?, end_date = ?, is_active = ?, updated_at = NOW() WHERE id = ?',
      [label, start_date, end_date, is_active ? 1 : 0, id]
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

async function hasCompleteAllQuarterGrades(conn, studentId, gradeLevel) {
  const subjects = await getRequiredSubjectsForGrade(conn, gradeLevel);
  if (subjects.length === 0) return false;

  for (const subject of subjects) {
    const [rows] = await conn.query(
      'SELECT quarter, grade FROM grades WHERE student_id = ? AND subject = ? AND quarter IN (\'Q1\', \'Q2\', \'Q3\', \'Q4\')',
      [studentId, subject]
    );

    const byQuarter = new Map(rows.map(r => [String(r.quarter || '').toUpperCase(), Number(r.grade || 0)]));
    const complete = REQUIRED_QUARTERS.every(q => byQuarter.has(q) && byQuarter.get(q) > 0);
    if (!complete) return false;
  }

  return true;
}

// Helper — get a student's average grade across all subjects
async function getStudentAverage(conn, studentId) {
  const [rows] = await conn.query(
    'SELECT AVG(grade) as avg FROM grades WHERE student_id = ? AND grade > 0',
    [studentId]
  );
  return rows[0]?.avg ?? null;
}

// Promote students to next grade
exports.promoteStudents = async (req, res) => {
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const promotions = [];
    const graduates  = [];
    const retained   = [];

    const [students] = await connection.query(
      'SELECT id, first_name, last_name, grade_level FROM students ORDER BY grade_level'
    );

    for (const student of students) {
      const currentGrade = student.grade_level || '';
      const nextGrade    = GRADE_PROGRESSION[currentGrade];
      const studentName  = `${student.first_name || ''} ${student.last_name || ''}`.trim();

      if (!nextGrade) continue; // unknown grade level — skip

      const hasCompleteGrades = await hasCompleteAllQuarterGrades(connection, student.id, currentGrade);

      // Calculate average from grades table
      const [avgRows] = await connection.query(
        'SELECT AVG(grade) as avg FROM grades WHERE student_id = ? AND grade > 0',
        [student.id]
      );
      const avg = parseFloat(avgRows[0]?.avg ?? 0);
      const passed = hasCompleteGrades && avg >= PASSING_GRADE;

      if (!passed) {
        // Retain student
        retained.push({
          id: student.id,
          name: studentName,
          grade: currentGrade,
          avg: avg.toFixed(2),
          reason: hasCompleteGrades ? 'Average below 75' : 'Incomplete grades (Q1-Q4 required for all subjects)'
        });
        continue;
      }

      if (nextGrade === 'Graduate') {
        // Mark as graduated — remove from active students or flag
        await connection.query(
          "UPDATE students SET grade_level = 'Graduate', status = 'graduated' WHERE id = ?",
          [student.id]
        );
        graduates.push({ id: student.id, name: studentName, fromGrade: currentGrade, avg: avg.toFixed(2) });
      } else {
        await connection.query(
          'UPDATE students SET grade_level = ? WHERE id = ?',
          [nextGrade, student.id]
        );
        promotions.push({ id: student.id, name: studentName, fromGrade: currentGrade, toGrade: nextGrade, avg: avg.toFixed(2) });
      }
    }

    await connection.commit();

    res.json({
      success: true,
      message: `Promoted ${promotions.length} students. ${graduates.length} graduated. ${retained.length} retained.`,
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
        'SELECT id, first_name, last_name, grade_level FROM students WHERE grade_level = ? ORDER BY last_name, first_name',
        [grade]
      );

      let willPromote = 0;
      let willRetain = 0;
      let completeCount = 0;
      let incompleteCount = 0;

      for (const student of students) {
        const complete = await hasCompleteAllQuarterGrades(connection, student.id, grade);
        if (complete) completeCount += 1;
        else incompleteCount += 1;

        const [avgRows] = await connection.query(
          'SELECT AVG(grade) as avg FROM grades WHERE student_id = ? AND grade > 0',
          [student.id]
        );
        const avg = parseFloat(avgRows[0]?.avg ?? 0);

        if (complete && avg >= PASSING_GRADE) willPromote += 1;
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
