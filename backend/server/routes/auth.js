// server/routes/auth.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getUsers, inMemoryUsers } = require('./users'); // Import to access users array

// Sample user data for fallback when MySQL is not available
// Passwords are bcrypt hashed (round 10)
const SAMPLE_USERS = [
  {
    id: '63bc1bd0-359f-4372-8581-5a626e5e16f7',
    email: 'adminjossie@wmsu.edu.ph',
    username: 'adminjossie',
    first_name: 'Josie',
    last_name: 'Banalo',
    full_name: 'Josie Banalo',
    password: '$2b$10$hrq5BnQF9oV47hxTcfLz2eLkY72BR0LEmEIWEyYKlU0DjEQxur/du', // bcrypt hashed: Admin123
    role: 'admin',
    approval_status: 'approved'
  },
  {
    id: 'ba930204-ff2a-11f0-ac97-388d3d8f1ae5',
    email: 'Hz202305178@wmsu.edu.ph',
    username: 'hz202305178',
    first_name: 'Josie',
    last_name: 'Banalo',
    full_name: 'Josie Banalo',
    password: '$2b$10$6Ouo8QRxR1wcz953iq8vq.iU7fZb5m5KxuznSuWOExVgEnFLr7PTC', // bcrypt hashed: test123
    role: 'subject_teacher',
    subjects_handled: 'Math,Science,English',
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

    // Normalize email/username to lowercase for comparison
    const normalizedEmail = email ? email.toLowerCase() : null;
    const normalizedUsername = username ? username.toLowerCase() : null;

    // Combine both sample users and in-memory users
    const allUsers = [...SAMPLE_USERS, ...inMemoryUsers];
    let users = [];
    let usesFallback = false;

    try {
      // Try to query from database (case-insensitive)
      let query = 'SELECT * FROM users WHERE ';
      let params = [];

      if (normalizedEmail) {
        query += 'LOWER(email) = ?';
        params.push(normalizedEmail);
      } else {
        query += 'LOWER(username) = ?';
        params.push(normalizedUsername);
      }

      [users] = await pool.query(query, params);
    } catch (dbError) {
      console.log('Database query failed, using fallback data:', dbError.message);
      usesFallback = true;
      
      // Use combined users array directly (case-insensitive)
      users = allUsers.filter(user => {
        if (normalizedEmail) return user.email.toLowerCase() === normalizedEmail;
        if (normalizedUsername) return user.username.toLowerCase() === normalizedUsername;
        return false;
      });
    }

    if (users.length === 0) {
      console.log('❌ User not found');
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    const user = users[0];
    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      username: user.username,
      has_password: !!user.password,
      password_length: user.password?.length || 0,
      password_starts_with_hash: user.password?.startsWith('$2') || false,
      source: usesFallback ? 'fallback' : 'database'
    });

    // Debug logging
    console.log('=== PASSWORD VALIDATION ===');
    console.log('Input password:', password);
    console.log('Stored password type:', user.password?.startsWith('$2') ? 'bcrypt' : 'plaintext');

    // Compare password - always try bcrypt first
    let isPasswordValid = false;
    
    try {
      isPasswordValid = await bcrypt.compare(password, user.password);
      if (isPasswordValid) {
        console.log('✅ Bcrypt password match!');
      } else {
        console.log('❌ Bcrypt comparison returned false - trying plaintext...');
        isPasswordValid = password === user.password;
        if (isPasswordValid) {
          console.log('✅ Plaintext password match (after bcrypt failed)!');
        }
      }
    } catch (err) {
      console.log('⚠️ Bcrypt error:', err.message, '- trying plaintext...');
      isPasswordValid = password === user.password;
      if (isPasswordValid) {
        console.log('✅ Plaintext password match (after bcrypt error)!');
      } else {
        console.log('❌ Plaintext comparison also failed');
      }
    }

    if (!isPasswordValid) {
      console.log('❌ Password validation failed');
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }
    
    console.log('✅ Login validation passed');

    
    // Return user data (don't return password)
    const userData = {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName || user.first_name || '',
      lastName: user.lastName || user.last_name || '',
      fullName: user.fullName || user.full_name || user.firstName + ' ' + user.lastName || '',
      role: user.role,
      profilePic: user.profilePic || user.profile_pic || null,
      subjectsHandled: user.subjectsHandled || user.subjects_handled ? (user.subjectsHandled || user.subjects_handled).split(',').map(s => s.trim()) : []
    };

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: userData.id, 
        email: userData.email, 
        role: userData.role 
      },
      process.env.JWT_SECRET || 'your-secret-key-fallback',
      { expiresIn: '24h' }
    );

    return res.json({
      status: 'success',
      message: 'Login successful',
      token: token,
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
