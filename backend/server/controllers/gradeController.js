// server/controllers/gradeController.js
const pool = require('../config/db');

// Check if teacher/adviser can enter grades for this student and subject
const canEnterGrade = (user, student, subject) => {
  if (!user || !user.role) return false;
  
  // Adviser can enter grades for all subjects in their section
  if (user.role === 'adviser' && user.sectionHandled === student.section) {
    return true;
  }
  
  // Subject teacher can only enter grades for their assigned subjects
  if (user.role === 'subject_teacher') {
    // Handle both array and comma-separated string formats
    let subjects = [];
    if (Array.isArray(user.subjectsHandled)) {
      subjects = user.subjectsHandled;
    } else if (typeof user.subjectsHandled === 'string') {
      subjects = user.subjectsHandled.split(',').map(s => s.trim());
    }
    
    if (subjects.length > 0 && subjects.includes(subject)) {
      return true;
    }
  }
  
  // Admin can enter grades for anyone
  if (user.role === 'admin') {
    return true;
  }
  
  return false;
};

const updateGrades = async (req, res) => {
  try {
    const { id } = req.params;
    const { grades, average, quarter } = req.body;
    const user = req.user; // From JWT token

    const [[student]] = await pool.query('SELECT * FROM students WHERE id = ?', [id]);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    // Check authorization for each subject
    for (const subject of Object.keys(grades)) {
      if (!canEnterGrade(user, student, subject)) {
        return res.status(403).json({ 
          error: 'Unauthorized', 
          message: `You are not authorized to enter grades for ${subject}` 
        });
      }
    }

    // Update only the specified quarter
    for (const [subject, gradeValue] of Object.entries(grades)) {
      const quarterCol = quarter || 'q1'; // Default to q1 if not specified
      
      // Check if grade record exists
      const [[existingGrade]] = await pool.query(
        'SELECT id FROM grades WHERE student_id = ? AND subject = ?',
        [id, subject]
      );

      if (existingGrade) {
        // Update only the specified quarter
        await pool.query(
          `UPDATE grades SET ${quarterCol} = ? WHERE student_id = ? AND subject = ?`,
          [gradeValue, id, subject]
        );
      } else {
        // Insert new grade record
        const newGrade = { q1: 0, q2: 0, q3: 0, q4: 0 };
        newGrade[quarterCol] = gradeValue;
        
        await pool.query(
          `INSERT INTO grades (student_id, subject, q1, q2, q3, q4)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, subject, newGrade.q1, newGrade.q2, newGrade.q3, newGrade.q4]
        );
      }
    }

    await pool.query('UPDATE students SET average = ? WHERE id = ?', [average || 0, id]);

    res.json({ message: `${quarter || 'Q1'} grades updated`, average });
  } catch (err) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
};

const getStudentGrades = async (req, res) => {
  try {
    const { id } = req.params;
    const { quarter } = req.query; // Optional: filter by quarter
    const [rows] = await pool.query('SELECT * FROM grades WHERE student_id = ?', [id]);

    const result = {};
    rows.forEach(r => {
      if (quarter) {
        // Return only the specified quarter
        result[r.subject] = r[quarter] || 0;
      } else {
        // Return all quarters
        result[r.subject] = {
          q1: r.q1, q2: r.q2, q3: r.q3, q4: r.q4,
          average: parseFloat(r.average)
        };
      }
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
};

const getStudentsWithGrades = async (req, res) => {
  try {
    const user = req.user; // From JWT token
    let query = `
      SELECT s.*, COALESCE(AVG(g.average), 0) as calculated_average
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

    res.json(rows.map(row => ({
      ...row,
      average: parseFloat(row.calculated_average || row.average || 0)
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
};

module.exports = { updateGrades, getStudentGrades, getStudentsWithGrades, canEnterGrade };