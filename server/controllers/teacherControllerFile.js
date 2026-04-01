// server/controllers/teacherControllerFile.js
// File-based teacher controller for when database is unavailable

const { readUsers, writeUsers } = require('../utils/fileStorage');
const { query } = require('../config/database');

let teacherSyEnsured = false;

const ensureTeacherSchoolYearColumn = async () => {
  if (teacherSyEnsured) return;
  try {
    const cols = await query('SHOW COLUMNS FROM teachers');
    const hasSy = cols.some((c) => c.Field === 'school_year_id');
    if (!hasSy) {
      await query('ALTER TABLE teachers ADD COLUMN school_year_id INT NULL');
      await query('CREATE INDEX idx_teachers_school_year ON teachers (school_year_id)');
    }
    teacherSyEnsured = true;
  } catch (err) {
    console.log('ensureTeacherSchoolYearColumn skipped:', err.message);
  }
};

const getActiveSchoolYear = async () => {
  const rows = await query('SELECT id, label, start_date FROM school_years WHERE is_active = 1 AND is_archived = 0 LIMIT 1');
  if (!rows.length) throw new Error('No active school year found');
  return rows[0];
};

const getSchoolYearById = async (schoolYearId) => {
  if (!schoolYearId) return null;
  const rows = await query(
    'SELECT id, label, start_date FROM school_years WHERE id = ? AND is_archived = 0 LIMIT 1',
    [schoolYearId]
  );
  return rows[0] || null;
};

const getPreviousSchoolYear = async (activeStartDate) => {
  const rows = await query(
    'SELECT id, label FROM school_years WHERE is_archived = 0 AND start_date < ? ORDER BY start_date DESC LIMIT 1',
    [activeStartDate]
  );
  return rows[0] || null;
};

const assertActiveTargetSchoolYear = async (targetSy) => {
  const active = await getActiveSchoolYear();
  if (!targetSy || targetSy.id !== active.id) {
    const err = new Error('Edits are only allowed in the active school year');
    err.statusCode = 400;
    throw err;
  }
  return active;
};

const resolveSchoolYear = async (req) => {
  const requestedId = req?.query?.schoolYearId || req?.body?.schoolYearId;
  if (requestedId) {
    const sy = await getSchoolYearById(requestedId);
    if (sy) return sy;
  }
  return getActiveSchoolYear();
};

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
      await ensureTeacherSchoolYearColumn();
      const targetSy = await resolveSchoolYear(req);
      const isExplicitSchoolYearScope = Boolean(req?.query?.schoolYearId || req?.body?.schoolYearId);

      const dbTeachers = await query(
        `SELECT id, first_name, middle_name, last_name, username, email, role,
                grade_level, section, subjects, bio, profile_pic, verification_status, created_at
         FROM teachers
         WHERE school_year_id = ?
         ORDER BY first_name, last_name`,
        [targetSy.id]
      );

      let classAssignments = [];
      let classesWithAdvisers = [];
      let subjectTeachers = [];

      try {
        classAssignments = await query(
          `SELECT grade_level, section, adviser_id, adviser_name
           FROM class_assignments
           WHERE school_year_id = ?${isExplicitSchoolYearScope ? '' : ' OR school_year_id IS NULL'}`,
          [targetSy.id]
        );
      } catch (error) {
        classAssignments = [];
      }

      try {
        classesWithAdvisers = await query(
          `SELECT grade, section, adviser_id, adviser_name
           FROM classes
           WHERE school_year_id = ? AND (adviser_id IS NOT NULL OR adviser_name IS NOT NULL)`,
          [targetSy.id]
        );
      } catch (error) {
        classesWithAdvisers = [];
      }

      // Legacy global fallback is only allowed when no explicit school year scope is requested.
      if (classesWithAdvisers.length === 0 && !isExplicitSchoolYearScope) {
        try {
          classesWithAdvisers = await query(
            `SELECT grade, section, adviser_id, adviser_name
             FROM classes
             WHERE (adviser_id IS NOT NULL OR adviser_name IS NOT NULL)
             ORDER BY id DESC`
          );
        } catch (error) {
          classesWithAdvisers = [];
        }
      }

      try {
        subjectTeachers = await query(
          `SELECT class_id, teacher_id, teacher_name, subject, day, start_time, end_time
           FROM subject_teachers
           WHERE school_year_id = ?${isExplicitSchoolYearScope ? '' : ' OR school_year_id IS NULL'}`,
          [targetSy.id]
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

      // Include assignment-only teachers (e.g., historical SY data where teacher row is missing in teachers table for that SY)
      const existingKeys = new Set(
        dbFormatted.map((t) => String(t.id || '').trim() || normalizeName(t.fullName))
      );

      const supplementalByKey = new Map();
      const upsertSupplemental = ({ id, name, role, gradeLevel = '', section = '', subject = '' }) => {
        const trimmedName = String(name || '').trim();
        if (!trimmedName) return;
        const key = String(id || '').trim() || normalizeName(trimmedName);
        if (existingKeys.has(key)) return;

        if (!supplementalByKey.has(key)) {
          const parts = trimmedName.split(/\s+/);
          const firstName = parts.shift() || trimmedName;
          const lastName = parts.join(' ');
          supplementalByKey.set(key, {
            id: id || `assignment-${key}`,
            firstName,
            middleName: '',
            lastName,
            fullName: trimmedName,
            username: '',
            email: '',
            role: role || 'teacher',
            gradeLevel: gradeLevel || '',
            section: section || '',
            position: role || 'teacher',
            subjectsHandled: [],
            subjects: [],
            bio: '',
            profilePic: '',
            status: 'approved',
            createdAt: null
          });
        }

        const existing = supplementalByKey.get(key);
        if (role === 'adviser') existing.role = 'adviser';
        if (subject && !existing.subjects.includes(subject)) {
          existing.subjects.push(subject);
          existing.subjectsHandled = existing.subjects;
          if (existing.role !== 'adviser') existing.role = 'subject_teacher';
        }
        if (!existing.gradeLevel && gradeLevel) existing.gradeLevel = gradeLevel;
        if (!existing.section && section) existing.section = section;
      };

      classAssignments.forEach((item) => {
        upsertSupplemental({
          id: item.adviser_id,
          name: item.adviser_name,
          role: 'adviser',
          gradeLevel: item.grade_level,
          section: item.section
        });
      });

      classesWithAdvisers.forEach((item) => {
        upsertSupplemental({
          id: item.adviser_id,
          name: item.adviser_name,
          role: 'adviser',
          gradeLevel: item.grade,
          section: item.section
        });
      });

      subjectTeachers.forEach((item) => {
        upsertSupplemental({
          id: item.teacher_id,
          name: item.teacher_name,
          role: 'subject_teacher',
          subject: item.subject
        });
      });

      const mergedTeachers = [...dbFormatted, ...Array.from(supplementalByKey.values())];

      console.log(`getAllTeachers: Returning ${mergedTeachers.length} teachers for school year ${targetSy.id}`);

      return res.json({
        status: 'success',
        data: {
          teachers: mergedTeachers
        },
        teachers: mergedTeachers,
        meta: { schoolYearId: targetSy.id }
      });
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

// List teachers from previous school year (for optional fetch)
const getPreviousYearTeachers = async (req, res) => {
  try {
    await ensureTeacherSchoolYearColumn();
    const targetSy = await resolveSchoolYear(req);
    const prevSy = await getPreviousSchoolYear(targetSy.start_date);
    if (!prevSy) return res.json({ success: true, data: [] });

    const teachers = await query(
      `SELECT id, first_name, middle_name, last_name, username, email, role,
              grade_level, section, subjects, bio, profile_pic, verification_status, created_at
       FROM teachers
       WHERE school_year_id = ?
       ORDER BY first_name, last_name`,
      [prevSy.id]
    );

    const formatted = teachers.map((t) => ({
      ...t,
      subjects: t.subjects,
    }));

    res.json({ success: true, data: formatted, meta: { sourceSchoolYearId: prevSy.id, targetSchoolYearId: targetSy.id } });
  } catch (error) {
    console.error('Error fetching previous year teachers:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch previous year teachers' });
  }
};

// Copy selected teachers from previous school year into active school year
const fetchTeachersFromPreviousYear = async (req, res) => {
  try {
    await ensureTeacherSchoolYearColumn();
    const targetSy = await resolveSchoolYear(req);
    await assertActiveTargetSchoolYear(targetSy);
    const prevSy = await getPreviousSchoolYear(targetSy.start_date);
    if (!prevSy) {
      return res.status(400).json({ success: false, message: 'No previous school year found to fetch from' });
    }

    const { ids } = req.body || {};
    const idList = Array.isArray(ids)
      ? ids.map((id) => String(id).trim()).filter(Boolean)
      : [];

    let prevTeachers = [];
    if (idList.length > 0) {
      const placeholders = idList.map(() => '?').join(',');
      prevTeachers = await query(
        `SELECT * FROM teachers WHERE school_year_id = ? AND id IN (${placeholders})`,
        [prevSy.id, ...idList]
      );
    } else {
      prevTeachers = await query(
        'SELECT * FROM teachers WHERE school_year_id = ?',
        [prevSy.id]
      );
    }

    if (!prevTeachers.length) {
      return res.json({ success: true, message: 'Nothing to fetch', data: { inserted: 0, skipped: 0 } });
    }

    let inserted = 0;
    let skipped = 0;

    for (const t of prevTeachers) {
      // Skip duplicates in current school year by email or username
      const dup = await query(
        'SELECT id FROM teachers WHERE (email = ? OR username = ?) AND school_year_id = ?',
        [t.email, t.username, targetSy.id]
      );
      if (dup.length) {
        skipped += 1;
        continue;
      }

      await query(
        `INSERT INTO teachers (first_name, middle_name, last_name, username, email, password, role,
                               grade_level, section, subjects, bio, profile_pic, verification_status,
                               school_year_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          t.first_name,
          t.middle_name,
          t.last_name,
          t.username,
          t.email,
          t.password,
          t.role,
          t.grade_level,
          t.section,
          t.subjects,
          t.bio,
          t.profile_pic,
          t.verification_status || 'approved',
          targetSy.id
        ]
      );

      inserted += 1;
    }

    res.json({
      success: true,
      message: 'Fetch complete',
      data: { inserted, skipped, sourceSchoolYearId: prevSy.id, targetSchoolYearId: targetSy.id }
    });
  } catch (error) {
    console.error('Error fetching teachers from previous year:', error);
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message || 'Failed to fetch teachers from previous year' });
  }
};

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
  updateTeacher,
  getPreviousYearTeachers,
  fetchTeachersFromPreviousYear
};
