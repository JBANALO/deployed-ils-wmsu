// server/controllers/teacherControllerFile.js
// File-based teacher controller for when database is unavailable

const { readUsers } = require('../utils/fileStorage');

// Get all teachers/advisers from users.json
const getAllTeachers = (req, res) => {
  try {
    const users = readUsers();
    
    // Filter for users with teacher-related roles
    const teachers = users
      .filter(u => 
        u.role === 'adviser' || 
        u.role === 'teacher' || 
        u.role === 'subject_teacher' ||
        (u.position && u.position.includes('Adviser'))
      )
      .map(u => ({
        id: u.id,
        firstName: u.firstName || u.first_name || '',
        lastName: u.lastName || u.last_name || '',
        fullName: `${u.firstName || u.first_name || ''} ${u.lastName || u.last_name || ''}`.trim(),
        username: u.username,
        email: u.email,
        role: u.role || 'teacher',
        gradeLevel: u.gradeLevel || u.grade_level,
        section: u.section,
        position: u.position,
        department: u.department,
        subjectsHandled: u.subjectsHandled || u.subjects,
        status: u.status,
        createdAt: u.createdAt
      }));
    
    console.log(`getAllTeachers: Found ${teachers.length} teachers from users.json`);
    
    res.json({
      status: 'success',
      data: {
        teachers: teachers
      },
      teachers: teachers  // Also return at top level for backward compatibility
    });
  } catch (error) {
    console.error('Error in getAllTeachers:', error);
    res.status(500).json({ 
      message: 'Error fetching teachers', 
      error: error.message 
    });
  }
};

// Get pending teachers
const getPendingTeachers = (req, res) => {
  try {
    const users = readUsers();
    
    const teachers = users
      .filter(u => 
        (u.role === 'adviser' || u.role === 'teacher') &&
        u.status === 'pending'
      )
      .map(u => ({
        id: u.id,
        firstName: u.firstName || u.first_name || '',
        lastName: u.lastName || u.last_name || '',
        email: u.email,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt
      }));
    
    res.json({
      status: 'success',
      data: { teachers },
      teachers
    });
  } catch (error) {
    console.error('Error in getPendingTeachers:', error);
    res.status(500).json({ 
      message: 'Error fetching pending teachers', 
      error: error.message 
    });
  }
};

// Get advisers specifically
const getAdvisers = (req, res) => {
  try {
    const users = readUsers();
    
    const advisers = users
      .filter(u => u.role === 'adviser')
      .map(u => ({
        id: u.id,
        firstName: u.firstName || u.first_name || '',
        lastName: u.lastName || u.last_name || '',
        fullName: `${u.firstName || u.first_name || ''} ${u.lastName || u.last_name || ''}`.trim(),
        email: u.email,
        gradeLevel: u.gradeLevel || u.grade_level,
        section: u.section,
        status: u.status,
        role: 'adviser'
      }));
    
    console.log(`getAdvisers: Found ${advisers.length} advisers`);
    
    res.json({
      success: true,
      data: advisers,
      advisers: advisers  // For backward compatibility
    });
  } catch (error) {
    console.error('Error in getAdvisers:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching advisers', 
      error: error.message 
    });
  }
};

module.exports = {
  getAllTeachers,
  getPendingTeachers,
  getAdvisers
};
