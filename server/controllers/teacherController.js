// server/controllers/teacherController.js
const { query } = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Create new teacher
exports.createTeacher = async (req, res) => {
  try {
    const { 
      firstName, 
      middleName, 
      lastName, 
      username, 
      email, 
      password, 
      role = 'adviser',
      gradeLevel,
      section,
      subjects,
      bio,
      department = 'WMSU-ILS Department',
      position = 'Teacher'
    } = req.body;

    // Validate input
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Only allow adviser and subject_teacher roles
    if (!['adviser', 'subject_teacher'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Only adviser and subject_teacher accounts can be created.' });
    }

    // Check if teacher already exists
    const existingTeacher = await query('SELECT * FROM teachers WHERE email = ? OR username = ?', [email, username]);
    if (existingTeacher.length > 0) {
      return res.status(400).json({ message: 'Teacher with this email or username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create teacher
    const result = await query(
      `INSERT INTO teachers (
        first_name, middle_name, last_name, username, email, password, 
        role, department, position, subjects, bio, grade_level, section,
        verification_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
      [
        firstName, 
        middleName || null, 
        lastName, 
        username, 
        email, 
        hashedPassword, 
        role, 
        department, 
        position, 
        subjects || null, 
        bio || null,
        gradeLevel || null,
        section || null
      ]
    );

    res.status(201).json({ 
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully!`,
      teacherId: result.insertId,
      role
    });
  } catch (error) {
    console.error('Error creating teacher:', error);
    res.status(500).json({ message: 'Error creating teacher account', error: error.message });
  }
};

// Get all teachers
exports.getAllTeachers = async (req, res) => {
  try {
    const teachers = await query(
      `SELECT id, first_name, middle_name, last_name, username, email, role, 
       grade_level, section, subjects, bio, profile_pic, verification_status, 
       created_at, updated_at FROM teachers ORDER BY created_at DESC`
    );
    
    // Format teachers to match expected structure
    const formattedTeachers = teachers.map(teacher => ({
      id: teacher.id,
      firstName: teacher.first_name,
      middleName: teacher.middle_name,
      lastName: teacher.last_name,
      fullName: `${teacher.first_name} ${teacher.middle_name || ''} ${teacher.last_name}`.trim(),
      username: teacher.username,
      email: teacher.email,
      role: teacher.role,
      gradeLevel: teacher.grade_level,
      section: teacher.section,
      subjects: teacher.subjects,
      bio: teacher.bio,
      profilePic: teacher.profile_pic,
      verificationStatus: teacher.verification_status,
      status: teacher.verification_status, // For backward compatibility
      createdAt: teacher.created_at,
      updatedAt: teacher.updated_at
    }));
    
    res.json({
      status: 'success',
      data: {
        teachers: formattedTeachers
      },
      teachers: formattedTeachers  // Also return at top level for backward compatibility
    });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ message: 'Error fetching teachers', error: error.message });
  }
};

// Get pending teachers
exports.getPendingTeachers = async (req, res) => {
  try {
    const teachers = await query(
      `SELECT id, first_name, middle_name, last_name, username, email, role, 
       grade_level, section, subjects, verification_status, created_at 
       FROM teachers WHERE verification_status = 'pending' ORDER BY created_at DESC`
    );
    
    // Format teachers to match expected structure
    const formattedTeachers = teachers.map(teacher => ({
      id: teacher.id,
      firstName: teacher.first_name,
      middleName: teacher.middle_name,
      lastName: teacher.last_name,
      fullName: `${teacher.first_name} ${teacher.middle_name || ''} ${teacher.last_name}`.trim(),
      username: teacher.username,
      email: teacher.email,
      role: teacher.role,
      gradeLevel: teacher.grade_level,
      section: teacher.section,
      subjects: teacher.subjects,
      status: teacher.verification_status,
      createdAt: teacher.created_at
    }));
    
    res.json({ 
      status: 'success',
      data: { teachers: formattedTeachers }, 
      message: `Found ${formattedTeachers.length} pending teacher(s)`
    });
  } catch (error) {
    console.error('Error fetching pending teachers:', error);
    res.status(500).json({ message: 'Error fetching pending teachers', error: error.message });
  }
};

// Approve teacher
exports.approveTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      'UPDATE teachers SET verification_status = "approved", updated_at = NOW() WHERE id = ?', 
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    res.json({ message: 'Teacher approved successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error approving teacher', error: error.message });
  }
};

// Decline teacher
exports.declineTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // Update teacher status to rejected and save the decline reason
    const result = await query(
      'UPDATE teachers SET verification_status = "rejected", decline_reason = ?, updated_at = NOW() WHERE id = ?', 
      [reason, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    res.json({ 
      message: 'Teacher declined successfully',
      data: {
        teacher: {
          id,
          verification_status: 'rejected',
          decline_reason: reason,
          updated_at: new Date()
        }
      }
    });
  } catch (error) {
    console.error('Error declining teacher:', error);
    res.status(500).json({ message: 'Error declining teacher', error: error.message });
  }
};

// Get current teacher (for login)
exports.getMe = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const teacher = await query(
      `SELECT id, first_name, middle_name, last_name, username, email, role, 
       grade_level, section, subjects, bio, profile_pic, verification_status, 
       created_at FROM teachers WHERE id = ?`,
      [req.user.id]
    );

    if (teacher.length === 0) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const teacherData = teacher[0];
    
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: teacherData.id,
          firstName: teacherData.first_name,
          middleName: teacherData.middle_name,
          lastName: teacherData.last_name,
          username: teacherData.username,
          email: teacherData.email,
          role: teacherData.role,
          gradeLevel: teacherData.grade_level,
          section: teacherData.section,
          subjects: teacherData.subjects,
          bio: teacherData.bio,
          profilePic: teacherData.profile_pic,
          verificationStatus: teacherData.verification_status,
          createdAt: teacherData.created_at
        }
      }
    });
  } catch (error) {
    console.error('Error fetching current teacher:', error);
    res.status(500).json({ message: 'Error fetching teacher', error: error.message });
  }
};

// Update teacher
exports.updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      firstName, 
      middleName, 
      lastName, 
      username, 
      email, 
      role,
      gradeLevel,
      section,
      subjects,
      bio,
      department,
      position
    } = req.body;

    // Check if teacher exists
    const existingTeacher = await query('SELECT * FROM teachers WHERE id = ?', [id]);
    if (existingTeacher.length === 0) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Update teacher
    const result = await query(
      `UPDATE teachers SET 
        first_name = ?, middle_name = ?, last_name = ?, username = ?, email = ?, 
        role = ?, grade_level = ?, section = ?, subjects = ?, bio = ?, 
        department = ?, position = ?, updated_at = NOW()
       WHERE id = ?`,
      [firstName, middleName, lastName, username, email, role, gradeLevel, section, subjects, bio, department, position, id]
    );

    res.status(200).json({
      status: 'success',
      message: 'Teacher updated successfully'
    });
  } catch (error) {
    console.error('Error updating teacher:', error);
    res.status(500).json({ message: 'Error updating teacher', error: error.message });
  }
};

// Delete teacher
exports.deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if teacher exists
    const existingTeacher = await query('SELECT * FROM teachers WHERE id = ?', [id]);
    if (existingTeacher.length === 0) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Delete teacher
    await query('DELETE FROM teachers WHERE id = ?', [id]);

    res.status(200).json({
      status: 'success',
      message: 'Teacher deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    res.status(500).json({ message: 'Error deleting teacher', error: error.message });
  }
};

// Get declined teachers
exports.getDeclinedTeachers = async (req, res) => {
  try {
    const teachers = await query(
      `SELECT id, first_name, middle_name, last_name, username, email, role, 
       grade_level, section, subjects, bio, profile_pic, verification_status, 
       decline_reason, created_at, updated_at FROM teachers WHERE verification_status = 'rejected'`
    );

    res.status(200).json({
      status: 'success',
      data: { teachers }
    });
  } catch (error) {
    console.error('Error fetching declined teachers:', error);
    res.status(500).json({ message: 'Error fetching declined teachers', error: error.message });
  }
};

// Restore declined teacher
exports.restoreTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if teacher exists and is declined
    const existingTeacher = await query('SELECT * FROM teachers WHERE id = ?', [id]);
    
    if (existingTeacher.length === 0) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    if (existingTeacher[0].verification_status !== 'rejected') {
      return res.status(400).json({ message: 'Teacher is not in declined status' });
    }

    // Restore teacher by setting status back to pending
    const result = await query(
      `UPDATE teachers SET verification_status = 'pending', updated_at = NOW() WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Get the full teacher data to return with all fields
    const restoredTeacher = await query('SELECT * FROM teachers WHERE id = ?', [id]);

    res.status(200).json({
      status: 'success',
      message: 'Teacher restored successfully',
      data: {
        teacher: restoredTeacher[0] // Return the complete teacher object
      }
    });
  } catch (error) {
    console.error('Error restoring teacher:', error);
    res.status(500).json({ message: 'Error restoring teacher', error: error.message });
  }
};
