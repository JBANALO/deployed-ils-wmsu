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

        const teachers = dbTeachers.map((teacher) => {
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

        console.log(`getAllTeachers: Found ${teachers.length} teachers from database`);

        return res.json({
          status: 'success',
          data: {
            teachers
          },
          teachers
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
const createTeacher = async (req, res) => {
  try {
    const {
      firstName,
      middleName,
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

    const teacherId = require('uuid').v4();
    const normalizedRole = role || 'teacher';
    const normalizedSubjects = Array.isArray(subjects)
      ? subjects
      : (typeof subjects === 'string' ? subjects.split(',').map(s => s.trim()).filter(Boolean) : []);
    const subjectsValue = normalizedSubjects.length > 0 ? JSON.stringify(normalizedSubjects) : null;
    let dbPersisted = false;

    // Try database-first persistence so newly created teachers immediately appear
    // in /teachers and dashboard lists that read from MySQL.
    try {
      const existingInTeachers = await query(
        'SELECT id FROM teachers WHERE email = ? OR username = ? LIMIT 1',
        [email, username]
      );
      const existingInUsers = await query(
        'SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1',
        [email, username]
      );

      if (existingInTeachers.length > 0 || existingInUsers.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email or username already exists'
        });
      }

      await query(
        `INSERT INTO teachers (
          id, first_name, middle_name, last_name, username, email, password,
          role, grade_level, section, subjects, bio, profile_pic, verification_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          teacherId,
          firstName,
          middleName || null,
          lastName,
          username,
          email,
          password,
          normalizedRole,
          gradeLevel || null,
          section || null,
          subjectsValue,
          bio || '',
          req.body.profilePic || null,
          'approved'
        ]
      );
      dbPersisted = true;

      // Keep users table in sync for pages that fetch teacher counts/lists via /users.
      try {
        const userColumns = await query('SHOW COLUMNS FROM users');
        const fields = new Set(userColumns.map(col => col.Field));

        const firstNameCol = fields.has('first_name') ? 'first_name' : (fields.has('firstName') ? 'firstName' : null);
        const lastNameCol = fields.has('last_name') ? 'last_name' : (fields.has('lastName') ? 'lastName' : null);
        const createdAtCol = fields.has('created_at') ? 'created_at' : (fields.has('createdAt') ? 'createdAt' : null);
        const updatedAtCol = fields.has('updated_at') ? 'updated_at' : (fields.has('updatedAt') ? 'updatedAt' : null);

        const insertCols = ['id'];
        const insertVals = [teacherId];
        const placeholders = ['?'];

        if (firstNameCol) {
          insertCols.push(firstNameCol);
          insertVals.push(firstName);
          placeholders.push('?');
        }

        if (fields.has('middle_name')) {
          insertCols.push('middle_name');
          insertVals.push(middleName || null);
          placeholders.push('?');
        }

        if (lastNameCol) {
          insertCols.push(lastNameCol);
          insertVals.push(lastName);
          placeholders.push('?');
        }

        if (fields.has('full_name')) {
          insertCols.push('full_name');
          insertVals.push(`${firstName} ${lastName}`.trim());
          placeholders.push('?');
        }

        if (fields.has('username')) {
          insertCols.push('username');
          insertVals.push(username);
          placeholders.push('?');
        }

        if (fields.has('email')) {
          insertCols.push('email');
          insertVals.push(email);
          placeholders.push('?');
        }

        if (fields.has('password')) {
          insertCols.push('password');
          insertVals.push(password);
          placeholders.push('?');
        }

        if (fields.has('role')) {
          insertCols.push('role');
          insertVals.push(normalizedRole);
          placeholders.push('?');
        }

        if (fields.has('approval_status')) {
          insertCols.push('approval_status');
          insertVals.push('approved');
          placeholders.push('?');
        }

        if (fields.has('status')) {
          insertCols.push('status');
          insertVals.push('approved');
          placeholders.push('?');
        }

        if (createdAtCol) {
          insertCols.push(createdAtCol);
          placeholders.push('NOW()');
        }

        if (updatedAtCol) {
          insertCols.push(updatedAtCol);
          placeholders.push('NOW()');
        }

        if (insertCols.length > 1) {
          await query(
            `INSERT INTO users (${insertCols.join(', ')}) VALUES (${placeholders.join(', ')})`,
            insertVals
          );
        }
      } catch (syncError) {
        console.log('createTeacher: users table sync skipped:', syncError.message);
      }
    } catch (dbError) {
      console.log('createTeacher: database insert failed, falling back to users.json:', dbError.message);
    }
    
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
      id: teacherId,
      firstName,
      middleName: middleName || '',
      lastName,
      email,
      username,
      password, // In production, this should be hashed
      role: normalizedRole,
      gradeLevel,
      section,
      subjects: normalizedSubjects,
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
      if (dbPersisted) {
        console.log('Teacher saved in database; users.json sync failed.');
        res.status(201).json({
          success: true,
          message: 'Teacher created successfully',
          data: {
            teacher: {
              id: teacherId,
              firstName,
              middleName: middleName || '',
              lastName,
              email,
              username,
              role: normalizedRole,
              gradeLevel,
              section,
              subjects: normalizedSubjects,
              bio: bio || '',
              status: 'approved'
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
