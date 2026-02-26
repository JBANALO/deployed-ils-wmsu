// server/routes/users.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { verifyUser } = require('../middleware/auth');

// Sample users storage (fallback when MySQL is not available)
let sampleUsers = [
  {
    id: '63bc1bd0-359f-4372-8581-5a626e5e16f7',
    email: 'adminjossie@wmsu.edu.ph',
    username: 'adminjossie',
    firstName: 'Josie',
    lastName: 'Banalo',
    role: 'admin',
    approval_status: 'approved'
  },
  {
    id: 'ba930204-ff2a-11f0-ac97-388d3d8f1ae5',
    email: 'Hz202305178@wmsu.edu.ph',
    username: 'hz202305178',
    firstName: 'Josie',
    lastName: 'Banalo',
    role: 'subject_teacher',
    subjects_handled: 'Math,Science,English',
    approval_status: 'approved'
  }
];

// In-memory users storage (for newly created accounts)
let inMemoryUsers = [];

// POST /users/signup - Create new user account
router.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, username, email, password, role } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !username || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'All fields are required'
      });
    }

    // Validate email domain
    if (!email.endsWith('@wmsu.edu.ph')) {
      return res.status(400).json({
        status: 'error',
        message: 'Please use your official WMSU email address ending in @wmsu.edu.ph'
      });
    }

    // Check if user already exists
    const existingUser = users.find(user => 
      user.email === email || user.username === username
    );

    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User with this email or username already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user
    const newUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      firstName,
      lastName,
      username,
      email,
      password: hashedPassword,
      role: role || 'teacher', // Default to teacher if not specified
      approval_status: role.toLowerCase() === 'admin' ? 'approved' : 'pending', // Auto-approve admins
      createdAt: new Date().toISOString()
    };

    // Add to in-memory users array
    inMemoryUsers.push(newUser);

    // Also save to database
    try {
      console.log('=== ATTEMPTING DATABASE SAVE ===');
      const connection = await pool.getConnection();
      console.log('Database connection acquired');
      
      const insertQuery = `
        INSERT INTO users (id, first_name, last_name, full_name, username, email, password, role, approval_status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const insertParams = [
        newUser.id,
        newUser.firstName,
        newUser.lastName,
        newUser.fullName,
        newUser.username,
        newUser.email,
        newUser.password,
        newUser.role,
        newUser.approval_status
      ];
      
      console.log('Insert query:', insertQuery);
      console.log('Insert params:', insertParams.map((p, i) => `${i}: ${p}`));
      
      const [result] = await connection.query(insertQuery, insertParams);
      console.log('Insert result:', result);
      console.log('Affected rows:', result[0]?.affectedRows);
      
      connection.release();
      
      if (result[0]?.affectedRows > 0) {
        console.log('✅ User saved to database:', { id: newUser.id, email: newUser.email });
      } else {
        console.log('❌ Database save failed - no rows affected');
      }
    } catch (dbError) {
      console.error('❌ Database save error:', dbError);
      console.error('Error details:', {
        message: dbError.message,
        code: dbError.code,
        errno: dbError.errno
      });
      // Still keep in in-memory for fallback
    }

    console.log('New user registered:', {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      status: newUser.approval_status
    });

    // Return success response (without password)
    const { password: _, ...userResponse } = newUser;
    
    res.status(201).json({
      status: 'success',
      message: 'Account created successfully. Your account is ready to use.', // Updated message for admin accounts
      data: {
        user: userResponse
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error occurred during registration'
    });
  }
});

// Export users array for auth.js to access
let users = []; // Make users accessible
const addUser = (user) => {
  users.push(user);
  console.log('User added to in-memory storage:', {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.approval_status
  });
};

const getUsers = () => {
  return users;
};

// GET /users/me - Get current user profile
router.get('/me', verifyUser, async (req, res) => {
  try {
    // User data is available from req.user (set by JWT middleware)
    const userFromToken = req.user;
    
    // Get full user details from our user storage
    const allUsers = [...sampleUsers, ...inMemoryUsers];
    const fullUser = allUsers.find(u => u.id === userFromToken.userId || u.email === userFromToken.email);
    
    if (!fullUser) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Return user data without password
    const { password, ...userWithoutPassword } = fullUser;
    
    res.json({
      status: 'success',
      data: {
        user: {
          id: userWithoutPassword.id,
          email: userWithoutPassword.email,
          username: userWithoutPassword.username,
          firstName: userWithoutPassword.firstName || userWithoutPassword.first_name,
          lastName: userWithoutPassword.lastName || userWithoutPassword.last_name,
          fullName: userWithoutPassword.fullName || userWithoutPassword.full_name,
          role: userWithoutPassword.role,
          profilePic: userWithoutPassword.profilePic || userWithoutPassword.profile_pic
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user data'
    });
  }
});

// GET /users - Get all users (admin only)
router.get('/', async (req, res) => {
  try {
    // Return users without passwords
    const usersWithoutPasswords = users.map(({ password, ...user }) => user);
    
    res.json({
      status: 'success',
      data: {
        users: usersWithoutPasswords
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch users'
    });
  }
});

module.exports = { router, getUsers, inMemoryUsers };
