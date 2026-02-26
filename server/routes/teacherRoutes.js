// server/routes/teacherRoutes.js
const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');

// Teacher creation and management routes
router.post('/create', teacherController.createTeacher);
router.get('/', teacherController.getAllTeachers);
router.get('/pending', teacherController.getPendingTeachers);
router.get('/declined', teacherController.getDeclinedTeachers);
router.post('/:id/approve', teacherController.approveTeacher);
router.post('/:id/decline', teacherController.declineTeacher);
router.post('/:id/restore', teacherController.restoreTeacher);
router.get('/me', teacherController.getMe);

// Teacher update and delete routes
router.put('/:id', teacherController.updateTeacher);
router.delete('/:id', teacherController.deleteTeacher);

module.exports = router;
