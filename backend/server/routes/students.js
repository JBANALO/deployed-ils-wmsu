// server/routes/students.js
const express = require('express');
const router = express.Router();
const {
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent
} = require('../controllers/studentController');
const {
  updateGrades,
  getStudentGrades
} = require('../controllers/gradeController');
const { verifyUser } = require('../middleware/auth');

router.post('/', createStudent);
router.get('/', getAllStudents);

// Grades routes - MUST be before /:id routes
router.put('/:id/grades', verifyUser, updateGrades);
router.get('/:id/grades', verifyUser, getStudentGrades);

// Credentials route - MUST be before /:id routes
router.get('/:id/credentials', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = require('../config/db');
    
    // Get student details including password from database
    const [student] = await pool.query(
      `SELECT id, username, email, password, plain_password as plainPassword, 
       lrn, first_name as firstName, last_name as lastName, grade_level as gradeLevel, section
       FROM students 
       WHERE id = ?`,
      [id]
    );

    if (!student || student.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const studentData = student[0];
    
    // Determine which password to use
    let passwordToShow;
    
    if (studentData.plainPassword) {
      // Use stored plain password (for individually created accounts)
      passwordToShow = studentData.plainPassword;
      console.log(`Using stored plain password for student: ${studentData.username}`);
    } else if (studentData.password) {
      // Use regular password field (for bulk imports)
      passwordToShow = studentData.password;
      console.log(`Using regular password for student: ${studentData.username}`);
    } else {
      // Fallback to generated pattern if no password stored
      if (studentData.lrn) {
        passwordToShow = `Temp@${studentData.lrn}`;
        console.log(`Generated LRN-based password for student: ${studentData.username}, password: ${passwordToShow}`);
      } else {
        passwordToShow = 'Password123';
        console.log(`Using default password for student: ${studentData.username}`);
      }
    }

    const credentials = {
      id: studentData.id,
      username: studentData.username || `${studentData.lrn}@wmsu.edu.ph`,
      email: studentData.email || `${studentData.lrn}@wmsu.edu.ph`,
      password: passwordToShow,
      firstName: studentData.firstName,
      lastName: studentData.lastName,
      lrn: studentData.lrn,
      gradeLevel: studentData.gradeLevel,
      section: studentData.section
    };

    console.log(`Returning credentials for student: ${studentData.username}`);
    res.json(credentials);
    
  } catch (err) {
    console.error('Error fetching student credentials:', err);
    res.status(500).json({ error: 'Failed to fetch student credentials' });
  }
});

router.get('/:id', getStudentById);
router.put('/:id', updateStudent);
router.delete('/:id', deleteStudent);

module.exports = router;