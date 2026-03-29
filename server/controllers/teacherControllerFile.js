// server/controllers/teacherControllerFile.js
// File-based teacher controller for when database is unavailable

const { readUsers, writeUsers } = require('../utils/fileStorage');
const { query } = require('../config/database');

const normalizeName = (value = '') => value.toString().trim().toLowerCase().replace(/\s+/g, ' ');

const parseSubjects = (subjects) => {
  if (Array.isArray(subjects)) return subjects;
  if (!subjects) return [];
  if (typeof subjects === 'string') {
    if (subjects.startsWith('[')) {
      try {
        const parsed = JSON.parse(subjects);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        return subjects.split(',').map(subject => subject.trim()).filter(Boolean);
      }
    }
    return subjects.split(',').map(subject => subject.trim()).filter(Boolean);
  }
  return [];
};

// Get all teachers/advisers from users.json
const getAllTeachers = async (req, res) => {
  try {
    try {
      const dbTeachers = await query(
        `SELECT id, first_name, middle_name, last_name, username, email, role,
                grade_level, section, subjects, bio, profile_pic, verification_status, created_at
         FROM teachers
         ORDER BY first_name, last_name`
      );

      if (dbTeachers.length > 0) {
        let classAssignments = [];
        let classesWithAdvisers = [];
        let subjectTeachers = [];

        try {
          classAssignments = await query(
            `SELECT grade_level, section, adviser_id, adviser_name FROM class_assignments`
          );
        } catch (error) {
          classAssignments = [];
        }

        try {
          classesWithAdvisers = await query(
            `SELECT grade, section, adviser_id, adviser_name FROM classes WHERE adviser_id IS NOT NULL OR adviser_name IS NOT NULL`
          );
        } catch (error) {
          classesWithAdvisers = [];
        }

        try {
          subjectTeachers = await query(
            `SELECT class_id, teacher_id, teacher_name, subject, day, start_time, end_time FROM subject_teachers`
          );
        } catch (error) {
          subjectTeachers = [];
        }

        const dbFormatted = dbTeachers.map((teacher) => {
          const fullName = `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim();
          const normalizedFullName = normalizeName(fullName);

          const adviserMatch = classesWithAdvisers.find((item) =>
            String(item.adviser_id) === String(teacher.id) || normalizeName(item.adviser_name) === normalizedFullName
          );

          const assignmentMatch = classAssignments.find((item) =>
            String(item.adviser_id) === String(teacher.id) || normalizeName(item.adviser_name) === normalizedFullName
          );

          const subjectMatches = subjectTeachers.filter((item) =>
            String(item.teacher_id) === String(teacher.id) || normalizeName(item.teacher_name) === normalizedFullName
          );

          const derivedRole = adviserMatch || assignmentMatch
            ? 'adviser'
            : subjectMatches.length > 0
              ? 'subject_teacher'
              : (teacher.role || 'teacher');

          const derivedGradeLevel = adviserMatch?.grade || assignmentMatch?.grade_level || teacher.grade_level || '';
          const derivedSection = adviserMatch?.section || assignmentMatch?.section || teacher.section || '';
          const derivedSubjects = subjectMatches.length > 0
            ? [...new Set(subjectMatches.map((item) => item.subject).filter(Boolean))]
            : parseSubjects(teacher.subjects);

          return {
            id: teacher.id,
            firstName: teacher.first_name || '',
            middleName: teacher.middle_name || '',
            lastName: teacher.last_name || '',
            fullName,
            username: teacher.username,
            email: teacher.email,
            role: derivedRole,
            gradeLevel: derivedGradeLevel,
            section: derivedSection,
            position: teacher.role,
            subjectsHandled: derivedSubjects,
            subjects: derivedSubjects,
            bio: teacher.bio || '',
            profilePic: teacher.profile_pic || '',
            status: teacher.verification_status || 'approved',
            createdAt: teacher.created_at
          };
        });

        // Merge DB teachers with file-based teachers (users.json) to show newly created records
        const users = readUsers();
        const fileTeachers = users
          .filter(u =>
            (u.role === 'adviser' || u.role === 'teacher' || u.role === 'subject_teacher') &&
            !u.archived
          )
          .map(u => ({
            id: u.id,
            firstName: u.firstName || u.first_name || '',
            middleName: u.middleName || u.middle_name || '',
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
            status: u.status || 'approved',
            createdAt: u.createdAt
          }));

        // Avoid duplicates by email or username
        const deduped = [...dbFormatted];
        const existingKeys = new Set(
          deduped.map(t => (t.email || '').toLowerCase())
        );

        fileTeachers.forEach(ft => {
          const key = (ft.email || '').toLowerCase();
          if (!existingKeys.has(key)) {
            deduped.push(ft);
            existingKeys.add(key);
          }
        });

        console.log(`getAllTeachers: Merged ${dbFormatted.length} DB teachers with ${fileTeachers.length} file teachers => ${deduped.length} total`);

        return res.json({
          status: 'success',
          data: {
            teachers: deduped
          },
          teachers: deduped
        });
      }
    } catch (dbError) {
      console.log('getAllTeachers DB lookup failed, falling back to users.json:', dbError.message);
    }

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
      console.error('Failed to write users to file');
      res.status(500).json({
        success: false,
        message: 'Failed to save teacher data'
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
