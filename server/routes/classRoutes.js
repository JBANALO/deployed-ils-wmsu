const express = require('express');
const router = express.Router();
// Use file-based controller (with adviser fetching fix) when database is unavailable
const classController = require('../controllers/classController');

// Get all classes
router.get('/', classController.getAllClasses);

// Get classes for a subject teacher (MUST come before /:id routes)
router.get('/subject-teacher/:userId', classController.getSubjectTeacherClasses);

// Get adviser classes (MUST come before /:id routes)
router.get('/adviser/:adviserId', classController.getAdviserClasses);

// Assign adviser to a class (MUST come before /:id routes)
router.put('/:classId/assign', classController.assignAdviserToClass);

// Unassign adviser from a class (MUST come before /:id routes)
router.put('/:classId/unassign', classController.unassignAdviser);

module.exports = router;
