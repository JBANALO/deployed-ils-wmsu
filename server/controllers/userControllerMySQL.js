// server/controllers/userControllerMySQL.js
const { pool, query } = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Signup new user (Admin only)
exports.signup = async (req, res) => {
  try {
    const { firstName, lastName, username, email, password, role = 'admin' } = req.body;

    // Validate input
    if (!firstName || !lastName || !username || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Only allow admin role
    if (role !== 'admin') {
      return res.status(400).json({ message: 'Invalid role. Only admin accounts can be created here.' });
    }

    // Check if user already exists
    const existingUser = await query('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'User with this email or username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create admin user
    const userId = uuidv4();
    await query(
      'INSERT INTO users (id, first_name, last_name, username, email, password, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [userId, firstName, lastName, username, email, hashedPassword, role]
    );

    res.status(201).json({ 
      message: 'Admin account created successfully!',
      userId,
      role
    });
  } catch (error) {
    console.error('Error in signup:', error);
    res.status(500).json({ message: 'Error creating admin account', error: error.message });
  }
};

// Signup multiple users in batch
exports.signupBatch = async (req, res) => {
  try {
    const { users } = req.body;

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ message: 'Please provide an array of users' });
    }

    const createdUsers = [];
    const errors = [];

    for (const user of users) {
      try {
        const { firstName, lastName, username, email, password, role = 'student' } = user;

        if (!firstName || !lastName || !username || !email || !password) {
          errors.push({ email, error: 'Missing required fields' });
          continue;
        }

        const existingUser = await query('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);
        if (existingUser.length > 0) {
          errors.push({ email, error: 'User already exists' });
          continue;
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const userId = uuidv4();

        await query(
          'INSERT INTO users (id, first_name, last_name, username, email, password, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
          [userId, firstName, lastName, username, email, hashedPassword, role, 'pending']
        );

        createdUsers.push({ userId, email, username, status: 'pending' });
      } catch (error) {
        errors.push({ email: user.email, error: error.message });
      }
    }

    res.status(201).json({
      message: 'Batch signup completed',
      created: createdUsers.length,
      errors: errors.length,
      createdUsers,
      errors
    });
  } catch (error) {
    console.error('Error in batch signup:', error);
    res.status(500).json({ message: 'Error in batch signup', error: error.message });
  }
};

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await query('SELECT id, first_name, last_name, username, email, role, created_at FROM users ORDER BY created_at DESC');
    
    // Format users to match expected structure
    const formattedUsers = users.map(user => ({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.created_at
    }));
    
    res.json({
      status: 'success',
      data: {
        users: formattedUsers
      },
      users: formattedUsers  // Also return at top level for backward compatibility
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

// Get pending teachers (empty since users table is admin-only)
exports.getPendingTeachers = async (req, res) => {
  try {
    // Users table is admin-only, so no pending teachers
    res.json({ 
      status: 'success',
      data: { teachers: [] }, 
      message: 'No pending teachers found'
    });
  } catch (error) {
    console.error('Error fetching pending teachers:', error);
    res.status(500).json({ message: 'Error fetching pending teachers', error: error.message });
  }
};

// Get pending students (empty since users table is admin-only)
exports.getPendingStudents = async (req, res) => {
  try {
    // Users table is admin-only, so no pending students
    res.json({ 
      status: 'success',
      data: { students: [] }, 
      message: 'No pending students found'
    });
  } catch (error) {
    console.error('Error fetching pending students:', error);
    res.status(500).json({ message: 'Error fetching pending students', error: error.message });
  }
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await query(
      'SELECT id, first_name, last_name, username, email, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (user.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = user[0];
    
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: userData.id,
          firstName: userData.first_name,
          lastName: userData.last_name,
          username: userData.username,
          email: userData.email,
          role: userData.role,
          createdAt: userData.created_at
        }
      }
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const users = await query(
      'SELECT id, first_name, last_name, username, email, role, created_at FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        status: 'fail',
        message: 'User not found' 
      });
    }

    res.status(200).json({
      status: 'success',
      data: users[0]
    });
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error fetching user', 
      error: error.message 
    });
  }
};

// Delete user by ID
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM users WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
};

// Update user by ID
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, username, email, phone, profile_pic } = req.body;

    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];

    if (firstName !== undefined) {
      updates.push('first_name = ?');
      values.push(firstName);
    }
    if (lastName !== undefined) {
      updates.push('last_name = ?');
      values.push(lastName);
    }
    if (username !== undefined) {
      updates.push('username = ?');
      values.push(username);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (profile_pic !== undefined) {
      updates.push('profile_pic = ?');
      values.push(profile_pic);
    }

    if (updates.length === 0) {
      return res.status(400).json({ 
        status: 'fail',
        message: 'No fields to update' 
      });
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        status: 'fail',
        message: 'User not found' 
      });
    }

    // Fetch updated user
    const updatedUsers = await query(
      'SELECT id, first_name, last_name, username, email, phone, profile_pic, role FROM users WHERE id = ?',
      [id]
    );

    res.status(200).json({ 
      status: 'success',
      message: 'User updated successfully',
      data: updatedUsers[0]
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error updating user', 
      error: error.message 
    });
  }
};

// Approve teacher and optionally update role
exports.approveTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, gradeLevel } = req.body;

    // For students, ensure grade level is provided
    if (role === 'student' && !gradeLevel) {
      return res.status(400).json({ message: 'Grade level is required when approving students' });
    }

    let queryStr = 'UPDATE users SET status = "approved", updatedAt = NOW()';
    const params = [];

    if (role) {
      queryStr += ', role = ?';
      params.push(role);
    }

    // Add grade level if provided (for students)
    if (gradeLevel) {
      queryStr += ', gradeLevel = ?';
      params.push(gradeLevel);
    }

    queryStr += ' WHERE id = ?';
    params.push(id);

    const result = await query(queryStr, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ 
      status: 'success',
      message: role ? `User approved and assigned as ${role}` : 'User approved successfully' 
    });
  } catch (error) {
    console.error('Error approving user:', error);
    res.status(500).json({ message: 'Error approving user', error: error.message });
  }
};

// Decline teacher
exports.declineTeacher = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'UPDATE users SET status = "declined", updatedAt = NOW() WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User declined successfully' });
  } catch (error) {
    console.error('Error declining user:', error);
    res.status(500).json({ message: 'Error declining user', error: error.message });
  }
};

// Get declined students
exports.getDeclinedStudents = async (req, res) => {
  try {
    // Since users table is admin-only, return empty array for now
    // This would need to be implemented when student management is added
    res.json({ 
      status: 'success',
      data: { students: [] }
    });
  } catch (error) {
    console.error('Error fetching declined students:', error);
    res.status(500).json({ message: 'Error fetching declined students', error: error.message });
  }
};
