// server/controllers/gradeControllerMySQL.js
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

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
    const grades = await query('SELECT * FROM grades WHERE student_id = ? ORDER BY subject', [studentId]);
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
