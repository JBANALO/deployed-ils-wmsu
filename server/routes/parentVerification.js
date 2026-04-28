// server/routes/parentVerification.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const {
  sendParentOTP,
  verifyParentOTP,
  checkParentVerificationStatus
} = require('../controllers/parentController');

// Middleware to verify user (same pattern as other routes)
const verifyUser = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ status: 'error', message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // JWT token has id field
    const userId = decoded.userId || decoded.id;
    
    // Fetch user from database to get role
    const [users] = await query('SELECT id, role FROM users WHERE id = ?', [userId]);
    
    if (!users || users.length === 0) {
      return res.status(401).json({ status: 'error', message: 'User not found' });
    }
    
    req.user = users[0];
    next();
  } catch (err) {
    return res.status(403).json({ status: 'error', message: 'Invalid or expired token' });
  }
};

// Apply auth middleware to all routes
router.use(verifyUser);

// Send OTP to parent email
router.post('/send-otp', sendParentOTP);

// Verify OTP
router.post('/verify-otp', verifyParentOTP);

// Check verification status
router.get('/status/:studentId', checkParentVerificationStatus);

module.exports = router;
