// server/routes/teacherRoutes.js
const express = require('express');
const router = express.Router();
// Use file-based controller (works without database)
const teacherController = require('../controllers/teacherControllerFile');
const { query } = require('../config/database');

const generateWmsuPassword = (teacher = {}) => {
  const emailSeed = (teacher.email || '').includes('@') ? teacher.email.split('@')[0] : (teacher.email || '');
  const seed = (emailSeed || teacher.username || `${teacher.firstName || ''}${teacher.lastName || ''}` || 'teacher')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 90000;
  }

  return `WMSU${String(hash + 10000).padStart(5, '0')}`;
};

// Teacher routes
router.get('/', teacherController.getAllTeachers);

// Previous-year fetch endpoints
router.get('/previous-year', teacherController.getPreviousYearTeachers);
router.post('/fetch-from-previous', teacherController.fetchTeachersFromPreviousYear);
router.get('/pending', teacherController.getPendingTeachers);
router.get('/declined', teacherController.getDeclinedTeachers);
router.get('/advisers', teacherController.getAdvisers);
router.get('/archived', teacherController.getArchivedTeachers);

// Teacher management routes
router.post('/', teacherController.createTeacher);
router.put('/:id', teacherController.updateTeacher);
router.put('/:id/archive', teacherController.archiveTeacher);
router.put('/:id/restore', teacherController.restoreTeacher);
router.put('/:id/approve', teacherController.approveTeacher);
router.put('/:id/decline', teacherController.declineTeacher);
router.delete('/:id/permanent', teacherController.permanentDeleteTeacher);
router.delete('/:id', teacherController.deleteTeacher);

/**
 * Get teacher credentials (username, email, password)
 */
router.get('/:id/credentials', async (req, res) => {
  try {
    const { id } = req.params;
    
    let teacherData = null;
    
    // First check JSON file (where teachers are actually stored)
    try {
      const { readUsers } = require('../utils/fileStorage');
      const allUsers = readUsers();
      const teacher = allUsers.find(u => 
        u.id === id && 
        (u.role === 'teacher' || u.role === 'adviser' || u.role === 'subject_teacher')
      );
      
      if (teacher) {
        teacherData = teacher;
        console.log(`Found teacher in JSON file: ${teacher.email}`);
      }
    } catch (fileError) {
      console.log('Error reading JSON file, falling back to MySQL:', fileError.message);
    }
    
    // If not found in JSON, check MySQL teachers table first
    if (!teacherData) {
      const teacherRows = await query(
        `SELECT id, username, email, password,
         first_name as firstName, last_name as lastName, role
         FROM teachers
         WHERE id = ? AND role IN ('teacher', 'adviser', 'subject_teacher')`,
        [id]
      );

      if (teacherRows && teacherRows.length > 0) {
        teacherData = teacherRows[0];
        console.log(`Found teacher in MySQL teachers table: ${teacherData.email}`);
      }
    }

    // If still not found, check MySQL users table
    if (!teacherData) {
      const userRows = await query(
        `SELECT id, username, email, password,
         firstName, lastName, role
         FROM users
         WHERE id = ? AND role IN ('teacher', 'adviser', 'subject_teacher')`,
        [id]
      );

      if (userRows && userRows.length > 0) {
        teacherData = userRows[0];
        console.log(`Found teacher in MySQL: ${teacherData.email}`);
      }
    }

    if (!teacherData) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
    // Determine which password to use
    let passwordToShow;
    
    if (teacherData.password && !teacherData.password.startsWith('$2')) {
      // Use stored password field
      passwordToShow = teacherData.password;
      console.log(`Using stored password for teacher: ${teacherData.username}`);
    } else {
      passwordToShow = generateWmsuPassword(teacherData);
      console.log(`Generated deterministic password for teacher: ${teacherData.username}, pattern: ${passwordToShow}`);
    }

    const credentials = {
      id: teacherData.id,
      username: teacherData.username || `${teacherData.firstName.toLowerCase()}${teacherData.lastName.toLowerCase()}@wmsu.edu.ph`,
      email: teacherData.email,
      password: passwordToShow,
      firstName: teacherData.firstName,
      lastName: teacherData.lastName,
      role: teacherData.role
    };

    console.log(`Returning credentials for teacher: ${teacherData.username}`);
    res.json(credentials);
    
  } catch (err) {
    console.error('Error fetching teacher credentials:', err);
    res.status(500).json({ error: 'Failed to fetch teacher credentials' });
  }
});

// OTP verification route
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp, timestamp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and OTP are required' 
      });
    }
    
    // For now, accept any 6-digit OTP (simplified for testing)
    // In production, you would validate against stored OTP
    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid OTP format' 
      });
    }
    
    // Update teacher status to approved in JSON file
    try {
      const { readUsers, writeUsers } = require('../utils/fileStorage');
      const allUsers = readUsers();
      
      const teacherIndex = allUsers.findIndex(u => 
        u.email === email && 
        (u.role === 'teacher' || u.role === 'adviser' || u.role === 'subject_teacher')
      );
      
      if (teacherIndex === -1) {
        return res.status(404).json({ 
          success: false, 
          message: 'Teacher not found' 
        });
      }
      
      // Update teacher status
      allUsers[teacherIndex].status = 'approved';
      allUsers[teacherIndex].emailVerified = true;
      
      writeUsers(allUsers);
      
      console.log(`Teacher ${email} verified successfully`);
      
      res.json({ 
        success: true, 
        message: 'OTP verified successfully' 
      });
      
    } catch (fileError) {
      console.error('Error updating teacher in file:', fileError);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to verify teacher' 
      });
    }
    
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during OTP verification' 
    });
  }
});

// Update teacher email verification status
router.put('/:id/verify-email', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Update teacher status in JSON file
    try {
      const { readUsers, writeUsers } = require('../utils/fileStorage');
      const allUsers = readUsers();
      
      const teacherIndex = allUsers.findIndex(u => 
        u.id === id && 
        (u.role === 'teacher' || u.role === 'adviser' || u.role === 'subject_teacher')
      );
      
      if (teacherIndex === -1) {
        return res.status(404).json({ 
          success: false, 
          message: 'Teacher not found' 
        });
      }
      
      // Update teacher status
      allUsers[teacherIndex].status = 'approved';
      allUsers[teacherIndex].emailVerified = true;
      
      writeUsers(allUsers);
      
      console.log(`Teacher ${id} email verified successfully`);
      
      res.json({
        success: true,
        message: 'Teacher email verified successfully'
      });
      
    } catch (fileError) {
      console.error('Error updating teacher in file:', fileError);
      res.status(500).json({
        success: false,
        message: 'Failed to verify email'
      });
    }
    
  } catch (error) {
    console.error('Email verification update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify email'
    });
  }
});

module.exports = router;
