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

module.exports = router;
