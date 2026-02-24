const express = require('express');
const router = express.Router();
const gradeController = require('../controllers/gradeControllerMySQL');

// Get all grades (for dashboard stats)
router.get('/', gradeController.getAllGrades);

// Create a new grade
router.post('/', gradeController.createGrade);

// Get grades for a student
router.get('/student/:studentId', gradeController.getGradesByStudent);

// Update a grade
router.put('/:id', gradeController.updateGrade);

// Delete a grade
router.delete('/:id', gradeController.deleteGrade);

module.exports = router;
