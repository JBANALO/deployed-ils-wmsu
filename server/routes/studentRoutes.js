// server/routes/studentRoutes.js
const express = require('express');
const studentController = require('../controllers/studentControllerMySQL');

const router = express.Router();

// Create a new student
router.post('/', studentController.createStudent);

// Get all students
router.get('/', studentController.getAllStudents);

// Get students by grade and section
router.get('/grade/:grade/section/:section', studentController.getStudentsByGradeAndSection);

// Get a specific student
router.get('/:id', studentController.getStudentById);

// Update a student
router.put('/:id', studentController.updateStudent);

// Delete a specific student
router.delete('/:id', studentController.deleteStudent);

module.exports = router;

module.exports = router;
