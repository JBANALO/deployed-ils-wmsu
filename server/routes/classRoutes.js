const express = require('express');
const router = express.Router();
// Use MySQL-backed controller with school year scoping
const classController = require('../controllers/classControllerMySQL');
// Role-filter controller provides a unified endpoint for teacher-visible classes
const roleFilterController = require('../controllers/classControllerWithRoleFilter');

// Get all classes
router.get('/', classController.getAllClasses);

// Get classes from previous school year (for optional fetch)
router.get('/previous-year', classController.getPreviousYearClasses);

// Copy classes (and subject teachers) from previous school year into active year
router.post('/fetch-from-previous', classController.fetchClassesFromPreviousYear);

// Get classes for a subject teacher (MUST come before /:id routes)
router.get('/subject-teacher/:userId', classController.getSubjectTeacherClasses);

// Unified endpoint used by frontend to fetch classes visible to a teacher (adviser OR subject teacher)
router.get('/teacher/:userId', roleFilterController.getTeacherVisibleClasses);

// Get adviser classes (MUST come before /:id routes)
router.get('/adviser/:adviserId', classController.getAdviserClasses);

// Assign adviser to a class (MUST come before /:id routes)
router.put('/:classId/assign', classController.assignAdviserToClass);

// Unassign adviser from a class (MUST come before /:id routes)
router.put('/:classId/unassign', classController.unassignAdviser);

module.exports = router;
