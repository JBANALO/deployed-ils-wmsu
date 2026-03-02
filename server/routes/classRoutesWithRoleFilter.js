const express = require('express');
const router = express.Router();

// Use MySQL-based controller with role filtering
const classControllerWithRoleFilter = require('../controllers/classControllerWithRoleFilter');

// Get classes visible to a specific user (based on their role)
// ** IMPORTANT: Teachers will only see classes where they have a role assigned **
router.get('/teacher/:userId', classControllerWithRoleFilter.getTeacherVisibleClasses);

// Get all classes (admin only)
router.get('/', classControllerWithRoleFilter.getAllClasses);

// Get classes for a specific adviser
router.get('/adviser/:adviserId', classControllerWithRoleFilter.getAdviserClasses);

// Get classes for a specific subject teacher
router.get('/subject-teacher/:userId', classControllerWithRoleFilter.getSubjectTeacherClasses);

// Assign adviser to a class
router.put('/:classId/assign', classControllerWithRoleFilter.assignAdviserToClass);

module.exports = router;
