// server/routes/users.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { verifyUser } = require('../middleware/auth');
const pool = require('../config/db');

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
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedUsername = String(username || '').trim().toLowerCase();
    const normalizedRole = String(role || 'teacher').trim().toLowerCase().replace(/[\s-]+/g, '_');
    const fullName = `${String(firstName || '').trim()} ${String(lastName || '').trim()}`.trim();

    // Validate required fields
    if (!firstName || !lastName || !normalizedUsername || !normalizedEmail || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'All fields are required'
      });
    }

    // Validate email domain
    if (!normalizedEmail.endsWith('@wmsu.edu.ph')) {
      return res.status(400).json({
        status: 'error',
        message: 'Please use your official WMSU email address ending in @wmsu.edu.ph'
      });
    }

    // Check if user already exists in in-memory fallback.
    const existingInMemory = [...users, ...inMemoryUsers].find((user) =>
      String(user.email || '').trim().toLowerCase() === normalizedEmail ||
      String(user.username || '').trim().toLowerCase() === normalizedUsername
    );

    if (existingInMemory) {
      return res.status(400).json({
        status: 'error',
        message: 'User with this email or username already exists'
      });
    }

    // Check if user already exists in database.
    try {
      const [existingDbRows] = await pool.query(
        `SELECT id
         FROM users
         WHERE LOWER(email) = ? OR LOWER(username) = ?
         LIMIT 1`,
        [normalizedEmail, normalizedUsername]
      );

      if (existingDbRows.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: 'User with this email or username already exists'
        });
      }
    } catch (dbCheckError) {
      // If DB check fails, continue; insert step will still determine final source of truth.
      console.log('Database duplicate check skipped:', dbCheckError.message);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user
    const newUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      firstName,
      lastName,
      fullName,
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword,
      role: normalizedRole,
      approval_status: normalizedRole === 'admin' ? 'approved' : 'pending', // Auto-approve admins
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
      console.log('Affected rows:', result?.affectedRows || 0);
      
      connection.release();
      
      if (result?.affectedRows > 0) {
        console.log('✅ User saved to database:', { id: newUser.id, email: newUser.email });
      } else {
        console.log('❌ Database save failed - no rows affected');
        return res.status(500).json({
          status: 'error',
          message: 'Failed to persist new account'
        });
      }
    } catch (dbError) {
      console.error('❌ Database save error:', dbError);
      console.error('Error details:', {
        message: dbError.message,
        code: dbError.code,
        errno: dbError.errno
      });

      // If DB is unavailable, fallback to in-memory. Otherwise fail hard to avoid false-success account creation.
      const dbUnavailableCodes = new Set(['ECONNREFUSED', 'ENOTFOUND', 'PROTOCOL_CONNECTION_LOST']);
      if (!dbUnavailableCodes.has(dbError.code)) {
        inMemoryUsers = inMemoryUsers.filter((u) => u.id !== newUser.id);
        return res.status(500).json({
          status: 'error',
          message: dbError.code === 'ER_DUP_ENTRY'
            ? 'Email or username already exists'
            : 'Failed to create account in database'
        });
      }
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
    let allUsers = [];
    
    // Try to load from database first
    try {
      const [dbUsers] = await pool.query(
        `SELECT id, first_name as firstName, last_name as lastName, email, username, role, approval_status 
         FROM users 
         ORDER BY first_name, last_name`
      );
      allUsers = dbUsers || [];
      console.log(`✅ Loaded ${allUsers.length} users from database`);
    } catch (dbError) {
      console.log('Database query failed, using fallback:', dbError.message);
      // Fall back to in-memory users and sample users
      allUsers = [...sampleUsers, ...users, ...inMemoryUsers];
    }
    
    // Return users without passwords
    const usersWithoutPasswords = allUsers.map(user => {
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    res.json({
      status: 'success',
      data: {
        users: usersWithoutPasswords
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch users'
    });
  }
});

// PUT /users/:id - Update user account (supports optional password reset)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, username, email, password } = req.body;

    const updates = [];
    const values = [];

    if (firstName !== undefined) { updates.push('first_name = ?'); values.push(String(firstName).trim()); }
    if (lastName !== undefined) { updates.push('last_name = ?'); values.push(String(lastName).trim()); }
    if (username !== undefined) { updates.push('username = ?'); values.push(String(username).trim().toLowerCase()); }
    if (email !== undefined) { updates.push('email = ?'); values.push(String(email).trim().toLowerCase()); }
    if (firstName !== undefined || lastName !== undefined) {
      const full = `${String(firstName || '').trim()} ${String(lastName || '').trim()}`.trim();
      updates.push('full_name = ?');
      values.push(full);
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(String(password), 12);
      updates.push('password = ?');
      values.push(hashedPassword);
    }

    if (updates.length === 0) {
      return res.status(400).json({ status: 'error', message: 'No updates provided' });
    }

    values.push(id);

    const [result] = await pool.query(
      `UPDATE users
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      values
    );

    if (!result || result.affectedRows === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    return res.json({ status: 'success', message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to update user' });
  }
});

// DELETE /users/:id - Delete user account
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);

    if (!result || result.affectedRows === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    inMemoryUsers = inMemoryUsers.filter((user) => String(user.id) !== String(id));
    users = users.filter((user) => String(user.id) !== String(id));

    return res.json({ status: 'success', message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to delete user' });
  }
});

module.exports = { router, getUsers, inMemoryUsers };
