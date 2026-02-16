// server/routes/auth.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcrypt');

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;

    // Validate input
    if (!password || (!email && !username)) {
      return res.status(400).json({
        status: 'error',
        message: 'Email/username and password are required'
      });
    }

    // Query database for user
    let query = 'SELECT * FROM users WHERE ';
    let params = [];

    if (email) {
      query += 'email = ?';
      params.push(email);
    } else {
      query += 'username = ?';
      params.push(username);
    }

    const [users] = await pool.query(query, params);

    if (users.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    const user = users[0];

    // Compare password using bcrypt
    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(password, user.password);
    } catch (err) {
      console.log('Bcrypt comparison failed, trying plain text:', err.message);
      // Fallback for non-hashed passwords
      isPasswordValid = password === user.password || 
                       user.password_plain === password;
    }

    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    // Check if account is approved (if using approval system)
    if (user.approval_status && user.approval_status !== 'approved') {
      return res.status(403).json({
        status: 'error',
        message: 'Your account is not yet approved'
      });
    }

    // Return user data (don't return password)
    const userData = {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      fullName: user.full_name,
      role: user.role,
      profilePic: user.profile_pic || null
    };

    return res.json({
      status: 'success',
      message: 'Login successful',
      token: 'temp-token', // In production, generate JWT token here
      data: {
        user: userData
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Server error occurred'
    });
  }
});

// Check if user exists
router.post('/check-user', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is required'
      });
    }

    const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);

    if (users.length > 0) {
      return res.json({
        status: 'success',
        exists: true,
        message: 'User exists'
      });
    } else {
      return res.json({
        status: 'success',
        exists: false,
        message: 'User does not exist'
      });
    }

  } catch (error) {
    console.error('Check user error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Server error occurred'
    });
  }
});

module.exports = router;
