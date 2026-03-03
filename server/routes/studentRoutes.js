// server/routes/studentRoutes.js
const express = require('express');
const studentController = require('../controllers/studentController');

const router = express.Router();

// Public routes
router.post('/', studentController.createStudent);
router.get('/', studentController.getStudents);
router.get('/pending', studentController.getPendingStudents);
router.get('/declined', studentController.getDeclinedStudents);
router.post('/regenerate-qr', studentController.regenerateQRCodes); // fix all QR codes to JSON format
router.get('/:id', studentController.getStudent);

// Protected routes (require authentication)
router.post('/:id/approve', studentController.approveStudent);
router.post('/:id/decline', studentController.declineStudent);
router.post('/:id/restore', studentController.restoreStudent);

module.exports = router;
