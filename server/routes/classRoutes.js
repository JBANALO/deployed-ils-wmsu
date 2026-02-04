const express = require('express');
const router = express.Router();
const classController = require('../controllers/classControllerMySQL');

// Get all classes
router.get('/', classController.getAllClasses);

// Get classes for a subject teacher (MUST come before /:id routes)
router.get('/subject-teacher/:userId', classController.getSubjectTeacherClasses);

// Get adviser classes (MUST come before /:id routes)
router.get('/adviser/:adviserId', classController.getAdviserClasses);

// Create a new class
router.post('/', classController.createClass);

// Assign adviser to a class (MUST come before /:id routes)
router.put('/:classId/assign', classController.assignAdviserToClass);

// Unassign adviser from a class (MUST come before /:id routes)
router.put('/:classId/unassign', classController.unassignAdviser);

// Assign subject teacher to a class (MUST come before /:id routes)
router.put('/:classId/assign-subject-teacher', classController.assignSubjectTeacherToClass);

// Unassign subject teacher from a class (MUST come before /:id routes)
router.put('/:classId/unassign-subject-teacher/:teacherId', classController.unassignSubjectTeacher);

// Get subject teachers for a class (MUST come before /:id routes)
router.get('/:id/subject-teachers', classController.getSubjectTeachers);

// Add subject teacher to a class (MUST come before /:id routes)
router.post('/:classId/subject-teachers', classController.addSubjectTeacher);

// Get a specific class
router.get('/:id', classController.getClassById);

// Update a class
router.put('/:id', classController.updateClass);

// Delete a class
router.delete('/:id', classController.deleteClass);

module.exports = router;
