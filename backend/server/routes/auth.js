// server/routes/auth.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcrypt');

// Sample user data for fallback when MySQL is not available
const SAMPLE_USERS = [
  {
    id: 'ba930204-ff2a-11f0-ac97-388d3d8f1ae5',
    email: 'hz202305178@wmsu.edu.ph',
    username: 'hz202305178',
    first_name: 'Josie',
    last_name: 'Banalo',
    full_name: 'Josie Banalo',
    password: 'test123', // In production, use hashed password
    role: 'teacher',
    approval_status: 'approved'
  }
];

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

    let users = [];
    let usesFallback = false;

    try {
      // Try to query from database
      let query = 'SELECT * FROM users WHERE ';
      let params = [];

      if (email) {
        query += 'email = ?';
        params.push(email);
      } else {
        query += 'username = ?';
        params.push(username);
      }

      [users] = await pool.query(query, params);
    } catch (dbError) {
      console.log('Database query failed, using fallback data:', dbError.message);
      usesFallback = true;
      
      // Use fallback sample data
      users = SAMPLE_USERS.filter(user => {
        if (email) return user.email === email;
        if (username) return user.username === username;
        return false;
      });
    }

    if (users.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    const user = users[0];

    // Compare password
    let isPasswordValid = false;
    
    if (usesFallback) {
      // Direct comparison for fallback data
      isPasswordValid = password === user.password;
    } else {
      // Use bcrypt for database passwords
      try {
        isPasswordValid = await bcrypt.compare(password, user.password);
      } catch (err) {
        console.log('Bcrypt comparison failed, trying plain text:', err.message);
        isPasswordValid = password === user.password;
      }
    }

    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    // Check if account is approved
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
      token: 'temp-token',
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
