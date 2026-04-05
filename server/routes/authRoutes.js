// server/routes/authRoutes.js
const express = require('express');
const passport = require('passport');
const multer = require('multer');
const authController = require('../controllers/authControllerMySQL');
const googleAuthController = require('../controllers/googleAuthController');

const router = express.Router();

console.log(' Auth routes loaded - authController:', typeof authController.login);

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

// Test route to verify auth controller
router.get('/test', (req, res) => {
  console.log(' Auth test route called');
  res.json({ message: 'Auth routes working!' });
});

// Traditional login
router.post('/login', async (req, res) => {
  console.log(' Login route called with body:', req.body);
  try {
    await authController.login(req, res);
  } catch (error) {
    console.error(' Auth controller error:', error);
    // Fallback path: keep admin login available even when controller throws.
    try {
      const { query } = require('../config/database');
      const bcrypt = require('bcryptjs');
      const jwt = require('jsonwebtoken');

      const { email, username, password } = req.body || {};
      const loginField = String(email || username || '').trim();

      if (!loginField || !password) {
        return res.status(400).json({
          status: 'fail',
          message: 'Please provide email/username and password!'
        });
      }

      const users = await query(
        `SELECT id, first_name, last_name, username, email, password, plain_password, role, status
         FROM users
         WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)
         LIMIT 1`,
        [loginField, loginField]
      );

      if (!users || users.length === 0) {
        return res.status(401).json({ status: 'fail', message: 'Incorrect email or password' });
      }

      const user = users[0];
      let passwordMatch = false;

      if (typeof user.password === 'string' && user.password.startsWith('$2')) {
        passwordMatch = await bcrypt.compare(password, user.password);
      } else {
        passwordMatch = password === user.password;
      }

      if (!passwordMatch && typeof user.plain_password === 'string' && user.plain_password.length > 0) {
        passwordMatch = password === user.plain_password;
      }

      if (!passwordMatch) {
        return res.status(401).json({ status: 'fail', message: 'Incorrect email or password' });
      }

      if (user.status && user.status !== 'approved' && user.status !== 'Active') {
        return res.status(401).json({
          status: 'fail',
          message: `Your account is ${user.status}. Please contact admin for approval.`
        });
      }

      const token = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '90d' }
      );

      return res.status(200).json({
        status: 'success',
        token,
        data: {
          user: {
            id: user.id,
            firstName: user.first_name || '',
            lastName: user.last_name || '',
            name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
            username: user.username || '',
            email: user.email,
            role: user.role || 'admin'
          }
        }
      });
    } catch (fallbackError) {
      console.error(' Auth fallback login error:', fallbackError);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error during login'
      });
    }
  }
});

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

// Change password (protected)
router.put('/change-password', authController.protect, authController.changePassword);

module.exports = router;