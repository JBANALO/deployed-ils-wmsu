// server/routes/teacherRoutes.js
const express = require('express');
const router = express.Router();
// Use file-based controller (works without database)
const teacherController = require('../controllers/teacherControllerFile');
const { query } = require('../config/database');

// Teacher routes
router.get('/', teacherController.getAllTeachers);
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
    
    if (teacherData.password) {
      // Use stored password field
      passwordToShow = teacherData.password;
      console.log(`Using stored password for teacher: ${teacherData.username}`);
    } else {
      // Fallback to generated pattern if no password stored
      if (teacherData.email && teacherData.email.includes('@wmsu.edu.ph')) {
        const emailPart = teacherData.email.replace('@wmsu.edu.ph', '').slice(-4).padStart(4, '0');
        passwordToShow = `WMSU${emailPart}XXXX`;
        console.log(`Generated password pattern for teacher: ${teacherData.username}, pattern: ${passwordToShow}`);
      } else {
        passwordToShow = 'Password123';
        console.log(`Using default password for teacher: ${teacherData.username}`);
      }
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

module.exports = router;
