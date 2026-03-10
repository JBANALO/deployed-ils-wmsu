// backend/server/routes/teachers.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

/**
 * Get all teachers/advisers from database
 * Falls back to users.json if database is unavailable
 */
router.get('/', async (req, res) => {
  try {
    // Try to get from database first
    const [teachers] = await pool.query(
      `SELECT id, first_name as firstName, last_name as lastName, email, role FROM users 
       WHERE role IN ('teacher', 'adviser', 'subject_teacher') 
       ORDER BY first_name, last_name`
    );

    if (teachers && teachers.length > 0) {
      console.log(`✅ Loaded ${teachers.length} teachers from database:`, teachers.map(t => `${t.firstName} ${t.lastName}`));
      return res.json({
        status: 'success',
        data: {
          teachers
        },
        teachers
      });
    }

    // Fallback to users.json if database is empty
    console.log('Database has no teachers, falling back to users.json');
    const usersPath = path.join(__dirname, '../../data/users.json');
    if (fs.existsSync(usersPath)) {
      const allUsers = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
      const fileTeachers = allUsers
        .filter(u => u.role === 'adviser' || u.role === 'teacher' || u.role === 'subject_teacher')
        .map(u => ({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          role: u.role
        }));

      return res.json({
        status: 'success',
        data: {
          teachers: fileTeachers
        },
        teachers: fileTeachers
      });
    }

    res.json({
      status: 'success',
      data: {
        teachers: []
      },
      teachers: []
    });
  } catch (err) {
    console.error('Error fetching teachers:', err);
    
    // Always return a response - try fallback to users.json
    try {
      const usersPath = path.join(__dirname, '../../data/users.json');
      if (fs.existsSync(usersPath)) {
        const allUsers = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
        const fileTeachers = allUsers
          .filter(u => u.role === 'adviser' || u.role === 'teacher' || u.role === 'subject_teacher')
          .map(u => ({
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            role: u.role
          }));

        return res.json({
          status: 'success',
          data: {
            teachers: fileTeachers
          },
          teachers: fileTeachers
        });
      }
    } catch (fallbackErr) {
      console.error('Fallback to users.json failed:', fallbackErr);
    }

    res.json({
      status: 'success',
      data: {
        teachers: []
      },
      teachers: []
    });
  }
});

/**
 * Get advisers only
 */
router.get('/advisers', async (req, res) => {
  try {
    const [advisers] = await pool.query(
      `SELECT id, first_name, last_name, email FROM users 
       WHERE role = 'adviser' 
       ORDER BY first_name, last_name`
    );

    res.json({
      status: 'success',
      data: {
        advisers: advisers.map(a => ({
          id: a.id,
          firstName: a.first_name,
          lastName: a.last_name,
          email: a.email
        }))
      }
    });
  } catch (err) {
    console.error('Error fetching advisers:', err);
    res.status(500).json({ error: 'Failed to fetch advisers' });
  }
});

/**
 * Get teacher credentials (username, email, password)
 */
router.get('/:id/credentials', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get teacher details including password from database
    const [teacher] = await pool.query(
      `SELECT id, username, email, password, plain_password as plainPassword, 
       first_name as firstName, last_name as lastName, role
       FROM users 
       WHERE id = ? AND role IN ('teacher', 'adviser', 'subject_teacher')`,
      [id]
    );

    if (!teacher || teacher.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const teacherData = teacher[0];
    
    // Determine which password to use
    let passwordToShow;
    
    if (teacherData.plainPassword) {
      // Use stored plain password (for individually created accounts)
      passwordToShow = teacherData.plainPassword;
      console.log(`Using stored plain password for teacher: ${teacherData.username}`);
    } else if (teacherData.password) {
      // Use regular password field (for bulk imports)
      passwordToShow = teacherData.password;
      console.log(`Using regular password for teacher: ${teacherData.username}`);
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
