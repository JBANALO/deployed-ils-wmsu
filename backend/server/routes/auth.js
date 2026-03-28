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

    // Use one normalized login value for DB lookups so LRN/email/username all match
    const loginValueRaw = (email || username || '').trim();
    const normalizedLogin = loginValueRaw.toLowerCase();

    // Combine both sample users and in-memory users
    const allUsers = [...SAMPLE_USERS, ...inMemoryUsers];
    let users = [];
    let usesFallback = false;

    try {
      // Try to query from database (case-insensitive)
      const userQuery = 'SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?';
      [users] = await pool.query(userQuery, [normalizedLogin, normalizedLogin]);
      
      // If no user found in users table, check students table with LRN/email/username
      if (users.length === 0) {
        console.log('User not in users table, checking students table...');
        const studentQuery = `SELECT *, "student" as role FROM students
          WHERE LOWER(student_email) = ?
             OR LOWER(wmsu_email) = ?
             OR LOWER(username) = ?
             OR lrn = ?`;
        const [students] = await pool.query(studentQuery, [
          normalizedLogin,
          normalizedLogin,
          normalizedLogin,
          loginValueRaw
        ]);
        if (students.length > 0) {
          console.log('✅ Student found in students table');
          users = students;
        }
      }
    } catch (dbError) {
      console.log('Database query failed, using fallback data:', dbError.message);
      usesFallback = true;
      
      // Use combined users array directly (case-insensitive)
      users = allUsers.filter(user => {
        if (normalizedLogin) {
          return user.email.toLowerCase() === normalizedLogin || user.username.toLowerCase() === normalizedLogin;
        }
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

    // Check if this is a student (has student_email or wmsu_email)
    const isStudent = user.role === 'student' || user.student_email || user.wmsu_email;
    
    // Return user data (don't return password)
    const userData = isStudent ? {
      id: user.id,
      email: user.student_email || user.wmsu_email || user.email,
      username: user.username || '',
      lrn: user.lrn || '',
      firstName: user.first_name || user.firstName || '',
      lastName: user.last_name || user.lastName || '',
      fullName: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      role: 'student',
      gradeLevel: user.grade_level || '',
      section: user.section || '',
      profilePic: user.profile_pic || null
    } : {
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
