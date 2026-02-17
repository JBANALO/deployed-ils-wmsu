// server/routes/grades.js
const express = require('express');
const router = express.Router();
const { verifyUser } = require('../middleware/auth');
const {
  updateGrades,
  getStudentGrades,
  getStudentsWithGrades
} = require('../controllers/gradeController');

// Apply auth middleware to all grade routes
router.use(verifyUser);

router.put('/:id/grades', updateGrades);
router.get('/:id/grades', getStudentGrades);
router.get('/with-grades', getStudentsWithGrades); // /api/students/with-grades

module.exports = router;