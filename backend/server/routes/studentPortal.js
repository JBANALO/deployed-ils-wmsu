// server/routes/studentPortal.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get student portal data (grades + attendance + profile)
router.get('/portal', async (req, res) => {
  try {
    // Get student from token or session (assuming you have auth middleware)
    // For now, we'll assume student ID from query or body — in real app use JWT
    const studentId = req.query.studentId || req.user?.id;

    if (!studentId) return res.status(401).json({ error: 'Unauthorized' });

    const [[student]] = await pool.query(`
      SELECT id, lrn, first_name AS firstName, last_name AS lastName, full_name AS fullName, 
             grade_level AS gradeLevel, section, age, sex, average, qr_code AS qrCode
      FROM students WHERE id = ?
    `, [studentId]);

    if (!student) return res.status(404).json({ error: 'Student not found' });

    // Get grades
    const [grades] = await pool.query(`
      SELECT subject, q1, q2, q3, q4, 
             ROUND((COALESCE(q1,0) + COALESCE(q2,0) + COALESCE(q3,0) + COALESCE(q4,0))/4, 2) AS average
      FROM grades WHERE student_id = ?
    `, [studentId]);

    // Send response with proper structure
    res.json({
      status: 'success',
      data: {
        student: {
          id: student.id,
          lrn: student.lrn,
          firstName: student.firstName,
          lastName: student.lastName,
          fullName: student.fullName || `${student.firstName} ${student.lastName}`,
          gradeLevel: student.gradeLevel,
          section: student.section,
          age: student.age,
          sex: student.sex,
          average: student.average || 0,
          qrCode: student.qrCode,
          grades: grades.map(g => ({
            subject: g.subject,
            q1: g.q1 || 0,
            q2: g.q2 || 0,
            q3: g.q3 || 0,
            q4: g.q4 || 0,
            average: g.average || 0,
            remarks: g.average >= 90 ? 'Outstanding' :
                    g.average >= 85 ? 'Very Satisfactory' :
                    g.average >= 80 ? 'Satisfactory' :
                    g.average >= 75 ? 'Fairly Satisfactory' : 'Did Not Meet Expectations'
          }))
        }
      }
    });
  } catch (err) {
    console.error('Error loading student portal:', err);
    res.status(500).json({ status: 'error', error: 'Failed to load portal' });
  }
});

// Get students under current teacher/adviser
router.get('/my-students', async (req, res) => {
  try {
    const user = req.user; // From JWT token
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let query = `
      SELECT id, lrn, first_name, middle_name, last_name, full_name, age, sex,
             grade_level, section, contact, wmsu_email, status, attendance, average,
             profile_pic, qr_code, created_by, created_at, updated_at
      FROM students
    `;
    const params = [];

    // Filter students based on teacher/adviser role
    if (user.role === 'adviser' && user.sectionHandled) {
      query += ` WHERE section = ?`;
      params.push(user.sectionHandled);
    } else if (user.role === 'subject_teacher') {
      // Subject teachers see all students (can be refined based on your needs)
      // Or restrict to specific sections if configured
    } else if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to view students' });
    }

    query += ` ORDER BY full_name ASC`;

    const [students] = await pool.query(query, params);

    res.json(students.map(s => ({
      id: s.id,
      lrn: s.lrn,
      firstName: s.first_name,
      middleName: s.middle_name,
      lastName: s.last_name,
      fullName: s.full_name,
      age: s.age,
      sex: s.sex,
      gradeLevel: s.grade_level,
      section: s.section,
      contact: s.contact,
      wmsuEmail: s.wmsu_email,
      status: s.status,
      attendance: s.attendance,
      average: s.average,
      profilePic: s.profile_pic,
      qrCode: s.qr_code,
      createdBy: s.created_by,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

module.exports = router;