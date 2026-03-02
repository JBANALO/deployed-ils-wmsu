// server/routes/teacherRoutes.js
const express = require('express');
const router = express.Router();
// Use file-based controller (works without database)
const teacherController = require('../controllers/teacherControllerFile');

// Teacher routes
router.get('/', teacherController.getAllTeachers);
router.get('/pending', teacherController.getPendingTeachers);
router.get('/advisers', teacherController.getAdvisers);
router.get('/archived', teacherController.getArchivedTeachers);

// Teacher management routes
router.post('/', teacherController.createTeacher);
router.put('/:id', teacherController.updateTeacher);
router.put('/:id/archive', teacherController.archiveTeacher);
router.put('/:id/restore', teacherController.restoreTeacher);
router.delete('/:id/permanent', teacherController.permanentDeleteTeacher);
router.delete('/:id', teacherController.deleteTeacher);

module.exports = router;
