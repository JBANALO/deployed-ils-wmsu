// server/controllers/teacherControllerFile.js
// File-based teacher controller for when database is unavailable

const { readUsers, writeUsers } = require('../utils/fileStorage');

// Get all teachers/advisers from users.json
const getAllTeachers = (req, res) => {
  try {
    const users = readUsers();
    
    // Filter for users with teacher-related roles and not archived
    const teachers = users
      .filter(u => 
        (u.role === 'adviser' || 
        u.role === 'teacher' || 
        u.role === 'subject_teacher' ||
        (u.position && u.position.includes('Adviser'))) &&
        !u.archived
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
        subjects: u.subjects || [],
        bio: u.bio || '',
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

// Get archived teachers
const getArchivedTeachers = (req, res) => {
  try {
    const users = readUsers();
    
    // Filter for archived teachers
    const archivedTeachers = users
      .filter(u => 
        (u.role === 'adviser' || 
        u.role === 'teacher' || 
        u.role === 'subject_teacher') &&
        u.archived
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
        subjects: u.subjects || [],
        bio: u.bio || '',
        status: u.status,
        archivedAt: u.archivedAt || u.archived_date,
        createdAt: u.createdAt
      }));
    
    console.log(`getArchivedTeachers: Found ${archivedTeachers.length} archived teachers`);
    
    res.json({
      status: 'success',
      data: {
        teachers: archivedTeachers
      },
      teachers: archivedTeachers
    });
  } catch (error) {
    console.error('Error in getArchivedTeachers:', error);
    res.status(500).json({ 
      message: 'Error fetching archived teachers', 
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
      .filter(u => u.role === 'adviser' && !u.archived)
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

// Archive a teacher
const archiveTeacher = (req, res) => {
  try {
    const { id } = req.params;
    const users = readUsers();
    
    const teacherIndex = users.findIndex(u => u.id === id);
    
    if (teacherIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }
    
    const teacher = users[teacherIndex];
    
    // Check if it's a teacher role
    if (!['adviser', 'teacher', 'subject_teacher'].includes(teacher.role)) {
      return res.status(400).json({
        success: false,
        message: 'User is not a teacher'
      });
    }
    
    // Archive the teacher
    users[teacherIndex] = {
      ...teacher,
      archived: true,
      archivedAt: new Date().toISOString()
    };
    
    const success = writeUsers(users);
    
    if (success) {
      console.log(`Teacher ${teacher.firstName} ${teacher.lastName} archived successfully`);
      res.json({
        success: true,
        message: 'Teacher archived successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to archive teacher'
      });
    }
  } catch (error) {
    console.error('Error in archiveTeacher:', error);
    res.status(500).json({
      success: false,
      message: 'Error archiving teacher',
      error: error.message
    });
  }
};

// Restore an archived teacher
const restoreTeacher = (req, res) => {
  try {
    const { id } = req.params;
    const users = readUsers();
    
    const teacherIndex = users.findIndex(u => u.id === id);
    
    if (teacherIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }
    
    const teacher = users[teacherIndex];
    
    // Check if it's archived
    if (!teacher.archived) {
      return res.status(400).json({
        success: false,
        message: 'Teacher is not archived'
      });
    }
    
    // Restore the teacher
    users[teacherIndex] = {
      ...teacher,
      archived: false,
      archivedAt: null,
      restoredAt: new Date().toISOString()
    };
    
    const success = writeUsers(users);
    
    if (success) {
      console.log(`Teacher ${teacher.firstName} ${teacher.lastName} restored successfully`);
      res.json({
        success: true,
        message: 'Teacher restored successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to restore teacher'
      });
    }
  } catch (error) {
    console.error('Error in restoreTeacher:', error);
    res.status(500).json({
      success: false,
      message: 'Error restoring teacher',
      error: error.message
    });
  }
};

// Delete a teacher (permanent)
const deleteTeacher = (req, res) => {
  try {
    const { id } = req.params;
    const users = readUsers();
    
    const teacherIndex = users.findIndex(u => u.id === id);
    
    if (teacherIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }
    
    const teacher = users[teacherIndex];
    
    // Check if it's a teacher role
    if (!['adviser', 'teacher', 'subject_teacher'].includes(teacher.role)) {
      return res.status(400).json({
        success: false,
        message: 'User is not a teacher'
      });
    }
    
    // Remove the teacher
    users.splice(teacherIndex, 1);
    
    const success = writeUsers(users);
    
    if (success) {
      console.log(`Teacher ${teacher.firstName} ${teacher.lastName} deleted permanently`);
      res.json({
        success: true,
        message: 'Teacher deleted permanently'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to delete teacher'
      });
    }
  } catch (error) {
    console.error('Error in deleteTeacher:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting teacher',
      error: error.message
    });
  }
};

// Permanent delete (alias for deleteTeacher)
const permanentDeleteTeacher = deleteTeacher;

// Create a new teacher
const createTeacher = (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      username,
      password,
      role,
      gradeLevel,
      section,
      subjects,
      bio
    } = req.body;
    
    const users = readUsers();
    
    // Check if email or username already exists
    const existingUser = users.find(u => u.email === email || u.username === username);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email or username already exists'
      });
    }
    
    // Create new teacher
    const newTeacher = {
      id: require('uuid').v4(),
      firstName,
      lastName,
      email,
      username,
      password, // In production, this should be hashed
      role: role || 'teacher',
      gradeLevel,
      section,
      subjects: subjects || [],
      bio: bio || '',
      status: 'approved',
      archived: false,
      createdAt: new Date().toISOString()
    };
    
    users.push(newTeacher);
    
    const success = writeUsers(users);
    
    if (success) {
      console.log(`Teacher ${firstName} ${lastName} created successfully`);
      res.status(201).json({
        success: true,
        message: 'Teacher created successfully',
        data: {
          teacher: {
            id: newTeacher.id,
            firstName: newTeacher.firstName,
            lastName: newTeacher.lastName,
            email: newTeacher.email,
            username: newTeacher.username,
            role: newTeacher.role,
            gradeLevel: newTeacher.gradeLevel,
            section: newTeacher.section,
            subjects: newTeacher.subjects,
            bio: newTeacher.bio,
            status: newTeacher.status
          }
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to create teacher'
      });
    }
  } catch (error) {
    console.error('Error in createTeacher:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating teacher',
      error: error.message
    });
  }
};

// Update a teacher
const updateTeacher = (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const users = readUsers();
    
    const teacherIndex = users.findIndex(u => u.id === id);
    
    if (teacherIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }
    
    // Update teacher data
    users[teacherIndex] = {
      ...users[teacherIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    const success = writeUsers(users);
    
    if (success) {
      console.log(`Teacher ${id} updated successfully`);
      res.json({
        success: true,
        message: 'Teacher updated successfully',
        data: {
          teacher: users[teacherIndex]
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to update teacher'
      });
    }
  } catch (error) {
    console.error('Error in updateTeacher:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating teacher',
      error: error.message
    });
  }
};

// Approve a teacher
const approveTeacher = (req, res) => {
  try {
    const { id } = req.params;
    const users = readUsers();
    
    // Find teacher index
    const teacherIndex = users.findIndex(u => u.id === id);
    if (teacherIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }
    
    // Approve teacher
    users[teacherIndex] = {
      ...users[teacherIndex],
      status: 'approved',
      archived: false,
      approvedAt: new Date().toISOString()
    };
    
    const success = writeUsers(users);
    
    if (success) {
      console.log(`Teacher ${users[teacherIndex].firstName} ${users[teacherIndex].lastName} approved successfully`);
      res.json({
        success: true,
        message: 'Teacher approved successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to approve teacher'
      });
    }
  } catch (error) {
    console.error('Error in approveTeacher:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving teacher'
    });
  }
};

// Decline a teacher
const declineTeacher = (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const users = readUsers();
    
    // Find teacher index
    const teacherIndex = users.findIndex(u => u.id === id);
    if (teacherIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }
    
    // Decline teacher
    users[teacherIndex] = {
      ...users[teacherIndex],
      status: 'declined',
      archived: true,
      declinedAt: new Date().toISOString(),
      declineReason: reason || 'No reason provided'
    };
    
    const success = writeUsers(users);
    
    if (success) {
      console.log(`Teacher ${users[teacherIndex].firstName} ${users[teacherIndex].lastName} declined successfully`);
      res.json({
        success: true,
        message: 'Teacher declined successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to decline teacher'
      });
    }
  } catch (error) {
    console.error('Error in declineTeacher:', error);
    res.status(500).json({
      success: false,
      message: 'Error declining teacher'
    });
  }
};

// Get declined teachers
const getDeclinedTeachers = (req, res) => {
  try {
    const users = readUsers();
    
    // Filter for declined teachers
    const declinedTeachers = users
      .filter(u => 
        (u.role === 'adviser' || u.role === 'teacher' || u.role === 'subject_teacher') &&
        u.status === 'declined'
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
        subjects: u.subjects || [],
        bio: u.bio || '',
        status: u.status,
        declinedAt: u.declinedAt,
        declineReason: u.declineReason,
        createdAt: u.createdAt
      }));
    
    console.log(`getDeclinedTeachers: Found ${declinedTeachers.length} declined teachers`);
    res.json({
      success: true,
      data: { teachers: declinedTeachers }
    });
  } catch (error) {
    console.error('Error in getDeclinedTeachers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching declined teachers'
    });
  }
};

module.exports = {
  getAllTeachers,
  getArchivedTeachers,
  getPendingTeachers,
  getAdvisers,
  getDeclinedTeachers,
  archiveTeacher,
  restoreTeacher,
  deleteTeacher,
  permanentDeleteTeacher,
  createTeacher,
  approveTeacher,
  declineTeacher,
  updateTeacher
};
