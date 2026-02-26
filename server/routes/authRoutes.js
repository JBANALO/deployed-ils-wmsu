// server/routes/authRoutes.js
const express = require('express');
const passport = require('passport');
const multer = require('multer');
const authController = require('../controllers/authControllerMySQL');
const googleAuthController = require('../controllers/googleAuthController');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Traditional login
router.post('/login', authController.login);

// Google OAuth routes
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login',
    session: false,
  }),
  googleAuthController.googleCallback
);

// Get current user
router.get('/me', googleAuthController.getCurrentUser);

// Update user profile (protected)
router.put('/update-profile', authController.protect, upload.single('profileImage'), authController.updateProfile);

module.exports = router;