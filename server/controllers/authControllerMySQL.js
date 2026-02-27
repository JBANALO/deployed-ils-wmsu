// server/controllers/authControllerMySQL.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const path = require('path');
const fs = require('fs');

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
    
    // First check users table (for admin accounts)
    let users = await query('SELECT id, first_name, last_name, username, email, role, created_at FROM users WHERE id = ?', [decoded.id]);

    if (users.length === 0) {
      // If not found in users, check teachers table
      users = await query(
        `SELECT id, first_name, middle_name, last_name, username, email, role, 
         grade_level, section, subjects, bio, profile_pic, verification_status, created_at 
         FROM teachers WHERE id = ?`, 
        [decoded.id]
      );
    }

    if (users.length === 0) {
      return res.status(401).json({
        status: 'fail',
        message: 'The user belonging to this token no longer exists.',
      });
    }

    const user = users[0];
    
    // Format user object to match expected structure
    if (user.first_name && user.last_name && !user.middle_name) {
      // From users table (admin)
      req.user = {
        id: user.id,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        username: user.username || '',
        email: user.email,
        role: user.role || '',
        createdAt: user.created_at
      };
    } else {
      // From teachers table
      req.user = {
        id: user.id,
        firstName: user.first_name || '',
        middleName: user.middle_name || '',
        lastName: user.last_name || '',
        username: user.username || '',
        email: user.email,
        role: user.role || '',
        gradeLevel: user.grade_level,
        section: user.section,
        subjects: user.subjects,
        bio: user.bio,
        profilePic: user.profile_pic,
        verificationStatus: user.verification_status,
        createdAt: user.created_at
      };
    }
    
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
  console.log('🚨 LOGIN ATTEMPT - authControllerMySQL.js login function called!');
  try {
    const { email, username, password } = req.body;
    const loginField = email || username;
    console.log(`🔍 Login attempt: field="${loginField}", password_length=${password ? password.length : 'none'}`);

    if (!loginField || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide email/username and password!'
      });
    }

    // Check users table (for admin accounts)
    let users = await query('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [loginField]);
    console.log(`🔍 Checking users table for email: ${loginField}, found: ${users.length} users`);
    
    if (users.length === 0) {
      users = await query('SELECT * FROM users WHERE LOWER(username) = LOWER(?)', [loginField]);
      console.log(`🔍 Checking users table for username: ${loginField}, found: ${users.length} users`);
    }

    // If not found in users, check teachers table
    if (users.length === 0) {
      users = await query('SELECT * FROM teachers WHERE LOWER(email) = LOWER(?)', [loginField]);
      
      if (users.length === 0) {
        users = await query('SELECT * FROM teachers WHERE LOWER(username) = LOWER(?)', [loginField]);
      }
    }

    // If not found in users or teachers, check students table
    if (users.length === 0) {
      users = await query('SELECT * FROM students WHERE LOWER(student_email) = LOWER(?)', [loginField]);
      
      // No username column in students table, so only check email
    }

    if (users.length === 0) {
      return res.status(401).json({
        status: 'fail',
        message: 'Incorrect email or password',
      });
    }

    const user = users[0];
    console.log(`🔍 User found:`, {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role
    });
    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log(`🔍 Password comparison: provided="${password}", stored_hash="${user.password}", match=${passwordMatch}`);

    if (!passwordMatch) {
      return res.status(401).json({
        status: 'fail',
        message: 'Incorrect email or password',
      });
    }

    // Skip approval check for login - allow all users to login regardless of approval status
    // Approval system remains intact for admin dashboard functionality

    const token = signToken(user.id);

    // Handle different table structures
    let userData;
    if (user.first_name && user.last_name) {
      // From users table (admin)
      userData = {
        id: user.id,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        username: user.username || '',
        email: user.email,
        role: user.role || 'admin',
      };
    } else {
      // From teachers table
      userData = {
        id: user.id,
        firstName: user.first_name || '',
        middleName: user.middle_name || '',
        lastName: user.last_name || '',
        name: `${user.first_name || ''} ${user.middle_name || ''} ${user.last_name || ''}`.trim(),
        username: user.username || '',
        email: user.email,
        role: user.role || 'adviser',
        verificationStatus: user.verification_status || 'pending'
      };
    }

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user: userData
      },
    });
  } catch (error) {
    console.error('Error in login:', error);
    res.status(400).json({ message: 'Error logging in', error: error.message });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    console.log('Request file:', req.file);
    console.log('Request body keys:', Object.keys(req.body));
    
    // Handle multer errors
    if (req.file && req.file.size === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Empty file uploaded',
      });
    }
    
    // Handle both JSON and FormData
    let firstName, lastName, username, email, phone;
    
    if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
      // FormData request
      firstName = req.body.firstName;
      lastName = req.body.lastName;
      username = req.body.username;
      email = req.body.email;
      phone = req.body.phone;
    } else {
      // JSON request
      ({ firstName, lastName, username, email, phone } = req.body);
    }
    
    const userId = req.user.id;

    // Validate required fields
    if (!firstName || !lastName || !username || !email) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide firstName, lastName, username, and email',
      });
    }

    // Check if username or email already exists (excluding current user)
    const existingUsers = await query(
      'SELECT id FROM users WHERE (LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)) AND id != ?',
      [username, email, userId]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Username or email already exists',
      });
    }

    // Update user profile - handle phone column conditionally
    let profileImageUrl = null;
    try {
      if (req.file && req.file.buffer) {
        try {
          console.log('Processing image file, size:', req.file.size);
          
          // Generate filename and save file
          const userId = req.user.id;
          const imageFileName = `profile_${userId}_${Date.now()}.png`;
          const imagePath = path.join(__dirname, '..', 'uploads', imageFileName);
          fs.writeFileSync(imagePath, req.file.buffer);
          profileImageUrl = `/uploads/${imageFileName}`;
          console.log('Image saved to:', imagePath);
          console.log('Image URL generated:', profileImageUrl);
          console.log('Image filename being returned:', imageFileName);
        } catch (imgError) {
          console.error('Error processing image:', imgError);
          // Continue without image if processing fails
        }
      } else {
        console.log('No image file received');
      }
      
      // Build update query dynamically
      let updateQuery = 'UPDATE users SET firstName = ?, lastName = ?, username = ?, email = ?';
      let queryParams = [firstName, lastName, username, email];
      
      if (phone !== undefined) {
        updateQuery += ', phone = ?';
        queryParams.push(phone);
      }
      
      if (profileImageUrl) {
        updateQuery += ', profile_pic = ?';
        queryParams.push(profileImageUrl);
      }
      
      updateQuery += ' WHERE id = ?';
      queryParams.push(req.user.id);
      
      await query(updateQuery, queryParams);
      console.log('Profile update query:', updateQuery);
      console.log('Query params:', queryParams);

      // Get updated user data
      const updatedUsers = await query('SELECT * FROM users WHERE id = ?', [userId]);
      const updatedUser = updatedUsers[0];

      res.status(200).json({
        status: 'success',
        message: 'Profile updated successfully',
        data: {
          user: {
            id: updatedUser.id,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            username: updatedUser.username,
            email: updatedUser.email,
            phone: updatedUser.phone || '',
            profileImage: profileImageUrl || updatedUser.profile_pic || '',
            role: updatedUser.role,
          },
        },
      });
    } catch (error) {
      res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
};
