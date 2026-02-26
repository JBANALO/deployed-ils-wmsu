const express = require('express');
const userController = require('../controllers/userControllerMySQL');
const authController = require('../controllers/authControllerMySQL');

const router = express.Router();

// Public routes
router.post('/signup', userController.signup);
router.post('/signup-batch', userController.signupBatch);
router.get('/', userController.getAllUsers);
router.get('/pending-teachers', userController.getPendingTeachers);
router.get('/pending-students', userController.getPendingStudents);
router.get('/declined-students', userController.getDeclinedStudents);

// Protected routes (require authentication)
router.use(authController.protect);

// Get current user (must come before /:id)
router.get('/me', userController.getMe);

// Get user by ID (public for profile viewing)
router.get('/:id', userController.getUserById);

// Delete user by ID
router.delete('/:id', userController.deleteUser);

// Update user by ID
router.put('/:id', userController.updateUser);

// Approve/Decline teacher routes
router.post('/:id/approve', userController.approveTeacher);
router.post('/:id/decline', userController.declineTeacher);
module.exports = router;