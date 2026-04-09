// server/controllers/gradeControllerMySQL.js
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const getSchoolYearById = async (schoolYearId) => {
  if (!schoolYearId) return null;
  const rows = await query(
    'SELECT id FROM school_years WHERE id = ? AND is_archived = 0 LIMIT 1',
    [schoolYearId]
  );
  return rows[0] || null;
};

const getActiveSchoolYear = async () => {
  const rows = await query('SELECT id FROM school_years WHERE is_active = 1 AND is_archived = 0 LIMIT 1');
  return rows[0] || null;
};

const resolveSchoolYearId = async (req) => {
  const requestedId = req?.query?.schoolYearId || req?.body?.schoolYearId;
  if (requestedId) {
    const row = await getSchoolYearById(requestedId);
    if (row?.id) return Number(row.id);
  }
  const active = await getActiveSchoolYear();
  return active?.id ? Number(active.id) : null;
};

exports.getAllGrades = async (req, res) => {
  try {
    const schoolYearId = await resolveSchoolYearId(req);
    if (!schoolYearId) {
      return res.json({ totalGrades: 0 });
    }

    const grades = await query(
      'SELECT COUNT(*) as totalGrades FROM grades WHERE school_year_id = ?',
      [schoolYearId]
    );
    res.json({ totalGrades: grades[0].totalGrades });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createGrade = async (req, res) => {
  try {
    const { studentId, subject, q1, q2, q3, q4 } = req.body;
    const gradeId = uuidv4();

    await query(
      'INSERT INTO grades (id, student_id, subject, q1, q2, q3, q4, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
      [gradeId, studentId, subject, q1, q2, q3, q4]
    );

    res.status(201).json({ message: 'Grade created', gradeId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getGradesByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const schoolYearId = await resolveSchoolYearId(req);
    if (!schoolYearId) {
      return res.json([]);
    }

    const grades = await query(
      'SELECT * FROM grades WHERE student_id = ? AND school_year_id = ? ORDER BY subject',
      [studentId, schoolYearId]
    );
    res.json(grades);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateGrade = async (req, res) => {
  try {
    const { id } = req.params;
    const { q1, q2, q3, q4 } = req.body;

    await query(
      'UPDATE grades SET q1 = ?, q2 = ?, q3 = ?, q4 = ? WHERE id = ?',
      [q1, q2, q3, q4, id]
    );

    res.json({ message: 'Grade updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteGrade = async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM grades WHERE id = ?', [id]);
    res.json({ message: 'Grade deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
