// server/controllers/userControllerMySQL.js
const { pool, query } = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Signup new user
exports.signup = async (req, res) => {
  try {
    const { firstName, lastName, username, email, password, role = 'student', gradeLevel, section } = req.body;

    // Validate input
    if (!firstName || !lastName || !username || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Check if user already exists
    const existingUser = await query('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'User with this email or username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with pending approval status
    const userId = uuidv4();
    await query(
      'INSERT INTO users (id, firstName, lastName, username, email, password, role, gradeLevel, section, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      [userId, firstName, lastName, username, email, hashedPassword, role, gradeLevel || null, section || null, 'pending']
    );

    res.status(201).json({ 
      message: 'User created successfully. Your account is pending admin approval.',
      userId,
      status: 'pending'
    });
  } catch (error) {
    console.error('Error in signup:', error);
    res.status(500).json({ message: 'Error creating user', error: error.message });
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
          'INSERT INTO users (id, firstName, lastName, username, email, password, role, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
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

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await query('SELECT id, firstName, lastName, username, email, role, gradeLevel, section, createdAt FROM users ORDER BY createdAt DESC');
    res.json({
      status: 'success',
      data: {
        users: users
      },
      users: users  // Also return at top level for backward compatibility
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

// Get pending teachers
exports.getPendingTeachers = async (req, res) => {
  try {
    const teachers = await query(
      'SELECT id, firstName, lastName, username, email, role, status, createdAt FROM users WHERE role = "teacher" AND status = "pending" ORDER BY createdAt DESC'
    );
    res.json({ 
      status: 'success',
      data: { teachers }, 
      message: `Found ${teachers.length} pending teacher(s)`
    });
  } catch (error) {
    console.error('Error fetching pending teachers:', error);
    res.status(500).json({ message: 'Error fetching pending teachers', error: error.message });
  }
};

// Get pending students
exports.getPendingStudents = async (req, res) => {
  try {
    const students = await query(
      'SELECT id, firstName, lastName, username, email, role, status, createdAt FROM users WHERE role = "student" AND status = "pending" ORDER BY createdAt DESC'
    );
    res.json({ 
      status: 'success',
      data: { students }, 
      message: `Found ${students.length} pending student(s)`
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
      'SELECT id, firstName, lastName, username, email, role, createdAt FROM users WHERE id = ?',
      [req.user.id]
    );

    if (user.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user[0]);
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
      'SELECT id, firstName, lastName, username, email, role, gradeLevel, section, createdAt FROM users WHERE id = ?',
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
    const { firstName, lastName, email, gradeLevel, section } = req.body;

    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];

    if (firstName !== undefined) {
      updates.push('firstName = ?');
      values.push(firstName);
    }
    if (lastName !== undefined) {
      updates.push('lastName = ?');
      values.push(lastName);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (gradeLevel !== undefined) {
      updates.push('gradeLevel = ?');
      values.push(gradeLevel);
    }
    if (section !== undefined) {
      updates.push('section = ?');
      values.push(section);
    }

    if (updates.length === 0) {
      return res.status(400).json({ 
        status: 'fail',
        message: 'No fields to update' 
      });
    }

    updates.push('updatedAt = NOW()');
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
      'SELECT id, firstName, lastName, email, role, gradeLevel, section FROM users WHERE id = ?',
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
    const { role } = req.body;

    let queryStr = 'UPDATE users SET status = "approved", updatedAt = NOW()';
    const params = [];

    if (role) {
      queryStr += ', role = ?';
      params.push(role);
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
      'UPDATE users SET status = "declined", updatedAt = NOW() WHERE id = ? AND role = "teacher"',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    res.json({ message: 'Teacher declined successfully' });
  } catch (error) {
    console.error('Error declining teacher:', error);
    res.status(500).json({ message: 'Error declining teacher', error: error.message });
  }
};
