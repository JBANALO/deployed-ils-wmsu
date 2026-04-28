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
    console.log('🔍 Parent Verification - No token provided');
    return res.status(401).json({ status: 'error', message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log('🔍 Parent Verification - Decoded token:', decoded);
    
    // JWT token has id field
    const userId = decoded.userId || decoded.id;
    console.log('🔍 Parent Verification - User ID:', userId);
    
    // Fetch user from database to get role (check users table first, then teachers)
    let users = await query('SELECT id, role FROM users WHERE id = ?', [userId]);
    console.log('🔍 Parent Verification - Users table result:', users);
    
    if (!users || users.length === 0) {
      users = await query('SELECT id, role FROM teachers WHERE id = ?', [userId]);
      console.log('🔍 Parent Verification - Teachers table result:', users);
    }
    
    if (!users || users.length === 0) {
      console.log('🔍 Parent Verification - User not found in any table');
      return res.status(401).json({ status: 'error', message: 'User not found' });
    }
    
    req.user = users[0];
    console.log('🔍 Parent Verification - User verified:', req.user);
    next();
  } catch (err) {
    console.log('🔍 Parent Verification - Token error:', err.message);
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
