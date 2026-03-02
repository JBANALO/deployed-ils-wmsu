// server/routes/teacherRoutes.js
const express = require('express');
const router = express.Router();
// Use file-based controller (works without database)
const teacherController = require('../controllers/teacherControllerFile');

// Teacher routes
router.get('/', teacherController.getAllTeachers);
router.get('/pending', teacherController.getPendingTeachers);
router.get('/advisers', teacherController.getAdvisers);

module.exports = router;
