// server/controllers/authControllerMySQL.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

// Sign JWT token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '90d',
  });
};

// Protect middleware - verify token
exports.protect = async (req, res, next) => {
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
        message: 'You are not logged in! Please log in to get access.',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const users = await query('SELECT * FROM users WHERE id = ?', [decoded.id]);

    if (users.length === 0) {
      return res.status(401).json({
        status: 'fail',
        message: 'The user belonging to this token no longer exists.',
      });
    }

    req.user = users[0];
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'fail',
      message: 'Please log in to get access.',
      error: error.message
    });
  }
};

// Restrict to specific roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to perform this action',
      });
    }
    next();
  };
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const loginField = email || username;

    if (!loginField || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide email/username and password!',
      });
    }

    // Check both email and username fields for flexibility (case-insensitive)
    let users = await query('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [loginField]);
    
    // If not found by email, try by username (case-insensitive)
    if (users.length === 0) {
      users = await query('SELECT * FROM users WHERE LOWER(username) = LOWER(?)', [loginField]);
    }

    if (users.length === 0) {
      return res.status(401).json({
        status: 'fail',
        message: 'Incorrect email or password',
      });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        status: 'fail',
        message: 'Incorrect email or password',
      });
    }

    // Skip approval check for login - allow all users to login regardless of approval status
    // Approval system remains intact for admin dashboard functionality

    
    const token = signToken(user.id);

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user: {
          id: user.id,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          name: user.name || `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
};
