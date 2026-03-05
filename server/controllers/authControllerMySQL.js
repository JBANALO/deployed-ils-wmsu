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

    // Check if database is available first
    let dbAvailable = false;
    try {
      await query('SELECT 1');
      dbAvailable = true;
      console.log('🔍 Database is available');
    } catch (dbError) {
      console.log('🔍 Database not available, using file storage only');
      dbAvailable = false;
    }

    // Check users table (for admin accounts) - ONLY if database available
    let users = [];
    if (dbAvailable) {
      users = await query('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [loginField]);
      console.log(`🔍 Checking users table for email: ${loginField}, found: ${users.length} users`);
      
      if (users.length === 0) {
        users = await query('SELECT * FROM users WHERE LOWER(username) = LOWER(?)', [loginField]);
        console.log(`🔍 Checking users table for username: ${loginField}, found: ${users.length} users`);
      }
    }

    // If not found in users table, check JSON files first (for mobile compatibility)
    if (users.length === 0) {
      try {
        const { readUsers } = require('../utils/fileStorage');
        const allUsers = readUsers();
        
        // Check for teacher accounts in users.json
        const teacherUsers = allUsers.filter(u => 
          (u.role === 'teacher' || u.role === 'adviser' || u.role === 'subject_teacher') &&
          (u.email?.toLowerCase() === loginField.toLowerCase() || 
           u.username?.toLowerCase() === loginField.toLowerCase())
        );
        
        if (teacherUsers.length > 0) {
          users = teacherUsers;
          console.log(`🔍 Found ${teacherUsers.length} teacher(s) in users.json file for: ${loginField}`);
        }
      } catch (fileError) {
        console.log('Error reading users.json file:', fileError.message);
      }
    }

    // If not found in users table or JSON file, check teachers table - ONLY if database available
    if (users.length === 0 && dbAvailable) {
      users = await query('SELECT * FROM teachers WHERE LOWER(email) = LOWER(?)', [loginField]);
      
      if (users.length === 0) {
        users = await query('SELECT * FROM teachers WHERE LOWER(username) = LOWER(?)', [loginField]);
      }
    }

    // If not found in users or teachers, check students table - ONLY if database available
    if (users.length === 0) {
      // Check students.json file first (for mobile compatibility)
      try {
        const { readUsers } = require('../utils/fileStorage');
        const allUsers = readUsers();
        
        // Check for student accounts in users.json
        const studentUsers = allUsers.filter(u => 
          u.role === 'student' &&
          (u.email?.toLowerCase() === loginField.toLowerCase() || 
           u.username?.toLowerCase() === loginField.toLowerCase())
        );
        
        if (studentUsers.length > 0) {
          users = studentUsers;
          console.log(`🔍 Found ${studentUsers.length} student(s) in users.json file for: ${loginField}`);
        }
      } catch (fileError) {
        console.log('Error reading users.json file:', fileError.message);
      }
      
      // If still not found, check students table in database - ONLY if database available
      if (users.length === 0 && dbAvailable) {
        users = await query('SELECT * FROM students WHERE LOWER(student_email) = LOWER(?)', [loginField]);
        console.log(`🔍 Checking students table for email: ${loginField}, found: ${users.length} students`);
      }
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
    
    // Handle password comparison for both database (bcrypt) and JSON file (plain text)
    let passwordMatch = false;
    if (typeof user.password === 'string' && user.password.startsWith('$2')) {
      // Database user with bcrypt hash
      passwordMatch = await bcrypt.compare(password, user.password);
      console.log(`🔍 Database password comparison: provided="${password}", stored_hash="${user.password}", match=${passwordMatch}`);
    } else {
      // JSON file user with plain text password
      passwordMatch = password === user.password;
      console.log(`🔍 JSON file password comparison: provided="${password}", stored="${user.password}", match=${passwordMatch}`);
    }

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
    if (user.student_email) {
      // From students table (database)
      userData = {
        id: user.id,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        username: user.username || '',
        email: user.student_email, // Use student_email field
        phone: user.phone || '',
        profileImage: user.profile_pic || '',
        role: 'student', // Explicitly set role to student
        gradeLevel: user.grade_level,
        section: user.section
      };
    } else if ((user.first_name && user.last_name) || (user.firstName && user.lastName)) {
      // From users table (admin) OR from JSON file (teachers/students)
      userData = {
        id: user.id,
        firstName: user.first_name || user.firstName || '',
        lastName: user.last_name || user.lastName || '',
        name: `${user.first_name || user.firstName || ''} ${user.last_name || user.lastName || ''}`.trim(),
        username: user.username || '',
        email: user.email,
        phone: user.phone || '',
        profileImage: user.profile_pic || user.profileImage || '',
        role: user.role || 'admin',
      };
    } else {
      // From teachers table (database)
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
          
          // Generate filename and save file to admin_profiles folder
          const userId = req.user.id;
          const imageFileName = `profile_${userId}_${Date.now()}.png`;
          const adminProfilesDir = path.join(__dirname, '..', 'public', 'admin_profiles');
          
          // Create directory if it doesn't exist
          fs.mkdirSync(adminProfilesDir, { recursive: true });
          
          const imagePath = path.join(adminProfilesDir, imageFileName);
          fs.writeFileSync(imagePath, req.file.buffer);
          profileImageUrl = `/admin_profiles/${imageFileName}`;
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
      
      // Build update query dynamically with correct column names
      let updateQuery = 'UPDATE users SET first_name = ?, last_name = ?, username = ?, email = ?';
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
            firstName: updatedUser.first_name,
            lastName: updatedUser.last_name,
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
