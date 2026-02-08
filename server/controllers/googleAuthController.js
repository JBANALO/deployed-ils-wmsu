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

    // Check if user exists by email
    let users = await query('SELECT * FROM users WHERE email = ?', [email]);

    let user;
    if (users.length > 0) {
      user = users[0];
      // Update Google ID if not set
      if (!user.googleId) {
        await query('UPDATE users SET googleId = ? WHERE id = ?', [googleId, user.id]);
      }
    } else {
      // Create new user with Google data
      const username = email.split('@')[0] + '_' + Math.random().toString(36).substr(2, 5);
      const newUser = {
        googleId,
        email,
        username,
        firstName: displayName.split(' ')[0] || displayName,
        lastName: displayName.split(' ').slice(1).join(' ') || '',
        name: displayName,
        avatar,
        role: 'student', // Default role
        status: 'approved', // Auto-approve Google sign-ups
      };

      try {
        await query(
          'INSERT INTO users (googleId, email, username, firstName, lastName, name, avatar, role, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            newUser.googleId,
            newUser.email,
            newUser.username,
            newUser.firstName,
            newUser.lastName,
            newUser.name,
            newUser.avatar,
            newUser.role,
            newUser.status,
          ]
        );

        users = await query('SELECT * FROM users WHERE email = ?', [email]);
        user = users[0];
      } catch (insertError) {
        console.error('Error creating user:', insertError);
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=unable_to_create_account`);
      }
    }

    // Generate JWT token
    const token = signToken(user.id);

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(
      `${frontendUrl}/auth/google-callback?token=${token}&user=${encodeURIComponent(
        JSON.stringify({
          id: user.id,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          name: user.name || `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role,
        })
      )}`
    );
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=auth_failed`);
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
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          name: user.name || '',
          email: user.email,
          role: user.role,
          avatar: user.avatar || null,
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
