// server/routes/authRoutes.js
const express = require('express');
const passport = require('passport');
const authController = require('../controllers/authControllerMySQL');
const googleAuthController = require('../controllers/googleAuthController');

const router = express.Router();

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

module.exports = router;