// server/controllers/googleAuthController.js
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// Generate JWT token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '90d',
  });
};

// Handle Google OAuth callback
exports.googleCallback = async (req, res) => {
  try {
    const { id, displayName, emails, photos } = req.user;
    const email = emails[0].value;
    const googleId = id;
    const name = displayName;
    const avatar = photos[0]?.value || null;

    // Check if user exists by email in any table
    let users = await query('SELECT * FROM users WHERE email = ?', [email]);
    let user = null;
    let userTable = 'users'; // Default to users table

    if (users.length > 0) {
      user = users[0];
      userTable = 'users';
      // Update Google ID if not set
      if (!user.googleId) {
        await query('UPDATE users SET googleId = ? WHERE id = ?', [googleId, user.id]);
      }
    } else {
      // Check teachers table
      users = await query('SELECT * FROM teachers WHERE email = ?', [email]);
      if (users.length > 0) {
        user = users[0];
        userTable = 'teachers';
        // Update Google ID if not set (add column if needed)
        try {
          await query('UPDATE teachers SET googleId = ? WHERE id = ?', [googleId, user.id]);
        } catch (err) {
          console.log('googleId column not in teachers table, skipping update');
        }
      } else {
        // Check students table
        users = await query('SELECT * FROM students WHERE student_email = ?', [email]);
        if (users.length > 0) {
          user = users[0];
          userTable = 'students';
          // Update Google ID if not set (add column if needed)
          try {
            await query('UPDATE students SET googleId = ? WHERE id = ?', [googleId, user.id]);
          } catch (err) {
            console.log('googleId column not in students table, skipping update');
          }
        }
      }
    }

    // If user still doesn't exist, determine role based on email domain and create in appropriate table
    if (!user) {
      let role = 'student'; // Default role
      let targetTable = 'users';
      
      // Determine role based on email domain and patterns
      if (email.includes('@wmsu.edu.ph')) {
        // Check for admin patterns - you can customize these
        const adminPatterns = ['admin@', 'administrator@', 'info@', 'support@'];
        const isAdmin = adminPatterns.some(pattern => email.toLowerCase().startsWith(pattern));
        
        if (isAdmin) {
          role = 'admin';
          targetTable = 'users';
        } else {
          // Default @wmsu.edu.ph emails to teacher role
          role = 'teacher';
          targetTable = 'teachers';
        }
      }

      // Create new user with Google data in the appropriate table
      const username = email.split('@')[0] + '_' + Math.random().toString(36).substr(2, 5);
      const firstName = displayName.split(' ')[0] || displayName;
      const lastName = displayName.split(' ').slice(1).join(' ') || '';
      
      // Generate a proper UUID for the user ID
      const { v4: uuidv4 } = require('uuid');
      const userId = uuidv4();

      try {
        if (targetTable === 'users') {
          await query(
            'INSERT INTO users (id, googleId, email, username, first_name, last_name, name, profile_pic, role, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              userId,
              googleId,
              email,
              username,
              firstName,
              lastName,
              name,
              avatar,
              role,
              'approved', // Auto-approve Google sign-ups
            ]
          );
        } else if (targetTable === 'teachers') {
          await query(
            'INSERT INTO teachers (id, googleId, email, username, first_name, last_name, profile_pic, role, verification_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              userId,
              googleId,
              email,
              username,
              firstName,
              lastName,
              avatar,
              role,
              'approved', // Auto-approve Google sign-ups
            ]
          );
        } else if (targetTable === 'students') {
          await query(
            'INSERT INTO students (id, googleId, student_email, first_name, last_name, profile_pic, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
              userId,
              googleId,
              email,
              firstName,
              lastName,
              avatar,
              'approved', // Auto-approve Google sign-ups
            ]
          );
        }

        // Fetch the created user
        if (targetTable === 'users') {
          users = await query('SELECT * FROM users WHERE email = ?', [email]);
        } else if (targetTable === 'teachers') {
          users = await query('SELECT * FROM teachers WHERE email = ?', [email]);
        } else if (targetTable === 'students') {
          users = await query('SELECT * FROM students WHERE student_email = ?', [email]);
        }
        user = users[0];
      } catch (insertError) {
        console.error('Error creating user:', insertError);
        return res.redirect(`${process.env.LOCAL_FRONTEND_URL || process.env.FRONTEND_URL || 'http://localhost:5173'}?error=unable_to_create_account`);
      }
    }

    // Generate JWT token
    const token = signToken(user.id);

    // Redirect to frontend with token
    const frontendUrl = process.env.LOCAL_FRONTEND_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(
      `${frontendUrl}/auth/google-callback?token=${token}&user=${encodeURIComponent(
        JSON.stringify({
          id: user.id,
          firstName: user.first_name || user.firstName || '',
          lastName: user.last_name || user.lastName || '',
          name: user.name || `${user.first_name || user.firstName} ${user.last_name || user.lastName}`,
          email: user.email,
          role: user.role,
        })
      )}`
    );
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.redirect(`${process.env.LOCAL_FRONTEND_URL || process.env.FRONTEND_URL || 'http://localhost:5173'}?error=auth_failed`);
  }
};

// Get current user from token
exports.getCurrentUser = async (req, res) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'Not authenticated',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const users = await query('SELECT * FROM users WHERE id = ?', [decoded.id]);

    if (users.length === 0) {
      return res.status(401).json({
        status: 'fail',
        message: 'User not found',
      });
    }

    const user = users[0];
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          firstName: user.firstName || user.first_name || '',
          lastName: user.lastName || user.last_name || '',
          name: user.name || `${user.firstName || user.first_name} ${user.lastName || user.last_name}`,
          email: user.email,
          role: user.role,
          avatar: user.avatar || user.profile_pic || null,
        },
      },
    });
  } catch (error) {
    res.status(401).json({
      status: 'fail',
      message: error.message,
    });
  }
};
