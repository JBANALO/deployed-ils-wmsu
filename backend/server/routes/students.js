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

router.get('/:id', getStudentById);
router.put('/:id', updateStudent);
router.delete('/:id', deleteStudent);

module.exports = router;