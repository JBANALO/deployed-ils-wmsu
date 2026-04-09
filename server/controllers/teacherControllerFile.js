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
    const hasSex = cols.some((c) => c.Field === 'sex');
    const hasContactNumber = cols.some((c) => c.Field === 'contact_number');
    if (!hasSy) {
      await query('ALTER TABLE teachers ADD COLUMN school_year_id INT NULL');
      await query('CREATE INDEX idx_teachers_school_year ON teachers (school_year_id)');
    }
    if (!hasSex) {
      await query('ALTER TABLE teachers ADD COLUMN sex VARCHAR(20) NULL');
    }
    if (!hasContactNumber) {
      await query('ALTER TABLE teachers ADD COLUMN contact_number VARCHAR(50) NULL');
    }
    teacherSyEnsured = true;
  } catch (err) {
    console.log('ensureTeacherSchoolYearColumn skipped:', err.message);
  }
};

const getActiveSchoolYear = async () => {
  const rows = await query('SELECT id, label, start_date, end_date FROM school_years WHERE is_active = 1 AND is_archived = 0 LIMIT 1');
  if (!rows.length) throw new Error('No active school year found');
  return rows[0];
};

const getSchoolYearById = async (schoolYearId) => {
  if (!schoolYearId) return null;
  const rows = await query(
    'SELECT id, label, start_date, end_date FROM school_years WHERE id = ? AND is_archived = 0 LIMIT 1',
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

const getLatestHistoricalTeacherSchoolYear = async (targetSy) => {
  if (!targetSy?.id) return null;

  try {
    if (targetSy.start_date) {
      const byDate = await query(
        `SELECT sy.id, sy.label, sy.start_date
         FROM school_years sy
         WHERE sy.is_archived = 0
           AND sy.id <> ?
           AND sy.start_date < ?
           AND EXISTS (
             SELECT 1 FROM teachers t WHERE t.school_year_id = sy.id LIMIT 1
           )
         ORDER BY sy.start_date DESC
         LIMIT 1`,
        [targetSy.id, targetSy.start_date]
      );
      if (byDate[0]) return byDate[0];
    }

    const byId = await query(
      `SELECT sy.id, sy.label, sy.start_date
       FROM school_years sy
       WHERE sy.is_archived = 0
         AND sy.id < ?
         AND EXISTS (
           SELECT 1 FROM teachers t WHERE t.school_year_id = sy.id LIMIT 1
         )
       ORDER BY sy.id DESC
       LIMIT 1`,
      [targetSy.id]
    );
    if (byId[0]) return byId[0];
  } catch (err) {
    console.log('getLatestHistoricalTeacherSchoolYear fallback:', err.message);
  }

  return getPreviousSchoolYear(targetSy.start_date);
};

const getNearestTeacherSchoolYearWithData = async (targetSy) => {
  if (!targetSy?.id) return null;

  try {
    if (targetSy.start_date) {
      const byDateDistance = await query(
        `SELECT sy.id, sy.label, sy.start_date
         FROM school_years sy
         WHERE sy.is_archived = 0
           AND sy.id <> ?
           AND EXISTS (
             SELECT 1 FROM teachers t WHERE t.school_year_id = sy.id LIMIT 1
           )
         ORDER BY ABS(DATEDIFF(sy.start_date, ?)) ASC, sy.start_date DESC
         LIMIT 1`,
        [targetSy.id, targetSy.start_date]
      );
      if (byDateDistance[0]) return byDateDistance[0];
    }

    const byIdDistance = await query(
      `SELECT sy.id, sy.label, sy.start_date
       FROM school_years sy
       WHERE sy.is_archived = 0
         AND sy.id <> ?
         AND EXISTS (
           SELECT 1 FROM teachers t WHERE t.school_year_id = sy.id LIMIT 1
         )
       ORDER BY ABS(sy.id - ?) ASC, sy.id DESC
       LIMIT 1`,
      [targetSy.id, targetSy.id]
    );
    if (byIdDistance[0]) return byIdDistance[0];
  } catch (err) {
    console.log('getNearestTeacherSchoolYearWithData fallback:', err.message);
  }

  return null;
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

const belongsToSchoolYear = (record = {}, schoolYear = null) => {
  if (!schoolYear) return true;

  const recordSchoolYearId = record.school_year_id ?? record.schoolYearId;
  if (recordSchoolYearId !== undefined && recordSchoolYearId !== null && String(recordSchoolYearId) === String(schoolYear.id)) {
    return true;
  }

  const recordCreatedAt = record.created_at || record.createdAt;
  if (!recordCreatedAt || !schoolYear.start_date || !schoolYear.end_date) {
    return false;
  }

  const createdAt = new Date(recordCreatedAt);
  const startDate = new Date(`${schoolYear.start_date}T00:00:00`);
  const endDate = new Date(`${schoolYear.end_date}T23:59:59.999`);
  return createdAt >= startDate && createdAt <= endDate;
};

// Get all teachers/advisers from users.json
const getAllTeachers = async (req, res) => {
  try {
    const targetSy = await resolveSchoolYear(req);
    const isExplicitSchoolYearScope = Boolean(req?.query?.schoolYearId || req?.body?.schoolYearId);

    try {
      await ensureTeacherSchoolYearColumn();

      const dbTeachers = await query(
        `SELECT id, first_name, middle_name, last_name, username, email, role,
          grade_level, section, subjects, bio, profile_pic, verification_status,
          sex, contact_number,
                school_year_id, created_at
         FROM teachers
         ORDER BY first_name, last_name`
      );

      let classAssignments = [];
      let classesWithAdvisers = [];
      let subjectTeachers = [];
      let classesForYear = [];

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

      try {
        classesForYear = await query(
          `SELECT id, grade, section
           FROM classes
           WHERE school_year_id = ?`,
          [targetSy.id]
        );
      } catch (error) {
        classesForYear = [];
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

      const normalizeClassId = (value = '') => String(value || '').trim().toLowerCase().replace(/\s+/g, '-');
      const slugForClass = (grade = '', section = '') => `${String(grade || '').trim().toLowerCase().replace(/\s+/g, '-')}-${String(section || '').trim().toLowerCase().replace(/\s+/g, '-')}`;
      const classByIdOrSlug = new Map();

      classesForYear.forEach((item) => {
        const info = {
          grade: item.grade || '',
          section: item.section || ''
        };
        classByIdOrSlug.set(normalizeClassId(item.id), info);
        classByIdOrSlug.set(normalizeClassId(slugForClass(item.grade, item.section)), info);
      });

      const resolveClassInfo = (classId) => classByIdOrSlug.get(normalizeClassId(classId)) || null;

      const dbFormatted = dbTeachers
        .filter((teacher) => belongsToSchoolYear(teacher, targetSy))
        .map((teacher) => {
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

        const subjectClassInfos = subjectMatches
          .map((item) => resolveClassInfo(item.class_id))
          .filter(Boolean);

        const derivedClassSections = [...new Set(
          subjectClassInfos
            .map((item) => `${item.grade} - ${item.section}`.trim())
            .filter((label) => label && label !== '-')
        )];

        const derivedRole = adviserMatch || assignmentMatch
          ? 'adviser'
          : subjectMatches.length > 0
            ? 'subject_teacher'
            : (teacher.role || 'teacher');

        const derivedGradeLevel = adviserMatch?.grade || assignmentMatch?.grade_level || teacher.grade_level || subjectClassInfos[0]?.grade || '';
        const derivedSection = adviserMatch?.section || assignmentMatch?.section || teacher.section || subjectClassInfos[0]?.section || '';
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
          classSections: derivedClassSections,
          bio: teacher.bio || '',
          profilePic: teacher.profile_pic || '',
          sex: teacher.sex || '',
          contactNumber: teacher.contact_number || '',
          status: teacher.verification_status || 'approved',
          createdAt: teacher.created_at,
          school_year_id: teacher.school_year_id || null
        };
      });

      // Include assignment-only teachers (e.g., historical SY data where teacher row is missing in teachers table for that SY)
      const existingKeys = new Set(
        dbFormatted.map((t) => String(t.id || '').trim() || normalizeName(t.fullName))
      );

      const supplementalByKey = new Map();
      const upsertSupplemental = ({ id, name, role, gradeLevel = '', section = '', subject = '', classSectionLabel = '' }) => {
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
            classSections: [],
            bio: '',
            profilePic: '',
            sex: '',
            contactNumber: '',
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
        if (classSectionLabel && !existing.classSections.includes(classSectionLabel)) {
          existing.classSections.push(classSectionLabel);
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
        const classInfo = resolveClassInfo(item.class_id);
        const classSectionLabel = classInfo ? `${classInfo.grade} - ${classInfo.section}` : '';
        upsertSupplemental({
          id: item.teacher_id,
          name: item.teacher_name,
          role: 'subject_teacher',
          subject: item.subject,
          gradeLevel: classInfo?.grade || '',
          section: classInfo?.section || '',
          classSectionLabel
        });
      });

      const mergedTeachers = [...dbFormatted, ...Array.from(supplementalByKey.values())];

      // Merge in file-backed teachers too, because some create/import flows still persist in users.json.
      const fileUsers = readUsers();
      const fileTeachers = fileUsers
        .filter((u) =>
          (u.role === 'adviser' || u.role === 'teacher' || u.role === 'subject_teacher' ||
            (u.position && u.position.includes('Adviser'))) &&
          !u.archived &&
          belongsToSchoolYear(u, targetSy)
        )
        .map((u) => ({
          id: u.id,
          firstName: u.firstName || u.first_name || '',
          middleName: u.middleName || u.middle_name || '',
          lastName: u.lastName || u.last_name || '',
          fullName: `${u.firstName || u.first_name || ''} ${u.lastName || u.last_name || ''}`.trim(),
          username: u.username,
          email: u.email,
          role: u.role || 'teacher',
          gradeLevel: u.gradeLevel || u.grade_level || '',
          section: u.section || '',
          position: u.position || u.role || 'teacher',
          department: u.department,
          subjectsHandled: u.subjectsHandled || u.subjects || [],
          subjects: u.subjects || [],
          bio: u.bio || '',
          profilePic: u.profilePic || u.profile_pic || '',
          sex: u.sex || '',
          contactNumber: u.contactNumber || u.contact_number || '',
          status: u.status || 'approved',
          createdAt: u.createdAt || u.created_at || null,
          school_year_id: u.school_year_id || null
        }));

      const mergedByIdentity = new Map();
      const makeIdentityKey = (teacher) => {
        const emailKey = (teacher.email || '').toString().trim().toLowerCase();
        if (emailKey) return `email:${emailKey}`;
        const usernameKey = (teacher.username || '').toString().trim().toLowerCase();
        if (usernameKey) return `username:${usernameKey}`;
        return `name:${normalizeName(`${teacher.firstName || ''} ${teacher.lastName || ''}`)}`;
      };

      [...mergedTeachers, ...fileTeachers].forEach((teacher) => {
        const key = makeIdentityKey(teacher);
        if (!mergedByIdentity.has(key)) {
          mergedByIdentity.set(key, {
            ...teacher,
            subjects: Array.isArray(teacher.subjects) ? teacher.subjects : parseSubjects(teacher.subjects),
            subjectsHandled: Array.isArray(teacher.subjectsHandled) ? teacher.subjectsHandled : parseSubjects(teacher.subjectsHandled),
            classSections: Array.isArray(teacher.classSections) ? teacher.classSections : []
          });
          return;
        }

        const existing = mergedByIdentity.get(key);
        const incomingSubjects = Array.isArray(teacher.subjects) ? teacher.subjects : parseSubjects(teacher.subjects);
        const incomingHandled = Array.isArray(teacher.subjectsHandled) ? teacher.subjectsHandled : parseSubjects(teacher.subjectsHandled);
        const incomingClassSections = Array.isArray(teacher.classSections) ? teacher.classSections : [];

        existing.subjects = [...new Set([...(existing.subjects || []), ...incomingSubjects, ...incomingHandled].filter(Boolean))];
        existing.subjectsHandled = existing.subjects;
        existing.classSections = [...new Set([...(existing.classSections || []), ...incomingClassSections].filter(Boolean))];

        if ((!existing.gradeLevel || !existing.section) && teacher.gradeLevel && teacher.section) {
          existing.gradeLevel = existing.gradeLevel || teacher.gradeLevel;
          existing.section = existing.section || teacher.section;
        }

        const roleRank = { adviser: 3, subject_teacher: 2, teacher: 1 };
        const existingRank = roleRank[existing.role] || 0;
        const incomingRank = roleRank[teacher.role] || 0;
        if (incomingRank > existingRank) {
          existing.role = teacher.role;
        }

        if (!existing.firstName && teacher.firstName) existing.firstName = teacher.firstName;
        if (!existing.lastName && teacher.lastName) existing.lastName = teacher.lastName;
        if (!existing.username && teacher.username) existing.username = teacher.username;
        if (!existing.email && teacher.email) existing.email = teacher.email;
        if (!existing.sex && teacher.sex) existing.sex = teacher.sex;
        if (!existing.contactNumber && teacher.contactNumber) existing.contactNumber = teacher.contactNumber;
      });

      const unifiedTeachers = Array.from(mergedByIdentity.values());

      console.log(`getAllTeachers: Returning ${unifiedTeachers.length} teachers for school year ${targetSy.id}`);

      return res.json({
        status: 'success',
        data: {
          teachers: unifiedTeachers
        },
        teachers: unifiedTeachers,
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
          !u.archived &&
          belongsToSchoolYear(u, targetSy)
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
        sex: u.sex || '',
        contactNumber: u.contactNumber || u.contact_number || '',
        status: u.status,
          createdAt: u.createdAt,
          school_year_id: u.school_year_id || null
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
    const sourceSy = await getLatestHistoricalTeacherSchoolYear(targetSy);
    if (!sourceSy) return res.json({ success: true, data: [] });

    const teachers = await query(
      `SELECT id, first_name, middle_name, last_name, username, email, role,
              grade_level, section, subjects, bio, profile_pic, verification_status, sex, contact_number, created_at
       FROM teachers
       WHERE school_year_id = ?
       ORDER BY first_name, last_name`,
      [sourceSy.id]
    );

    const formatted = teachers.map((t) => ({
      ...t,
      subjects: t.subjects,
    }));

    res.json({ success: true, data: formatted, meta: { sourceSchoolYearId: sourceSy.id, targetSchoolYearId: targetSy.id } });
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
    const sourceSy = await getLatestHistoricalTeacherSchoolYear(targetSy);
    if (!sourceSy) {
      return res.status(400).json({ success: false, message: 'No historical school year with teacher data found to fetch from' });
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
        [sourceSy.id, ...idList]
      );
    } else {
      prevTeachers = await query(
        'SELECT * FROM teachers WHERE school_year_id = ?',
        [sourceSy.id]
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
                               sex, contact_number,
                               school_year_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
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
          t.sex || null,
          t.contact_number || null,
          targetSy.id
        ]
      );

      inserted += 1;
    }

    res.json({
      success: true,
      message: 'Fetch complete',
      data: { inserted, skipped, sourceSchoolYearId: sourceSy.id, targetSchoolYearId: targetSy.id }
    });
  } catch (error) {
    console.error('Error fetching teachers from previous year:', error);
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message || 'Failed to fetch teachers from previous year' });
  }
};

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
      bio,
      sex,
      contactNumber
    } = req.body;
    
    const activeSchoolYear = await getActiveSchoolYear();
    const users = readUsers();

    let dbDuplicate = false;
    try {
      const duplicateRows = await query(
        'SELECT id FROM teachers WHERE email = ? OR username = ? LIMIT 1',
        [email, username]
      );
      dbDuplicate = duplicateRows.length > 0;
    } catch (error) {
      console.log('Duplicate check in DB skipped:', error.message);
    }
    
    // Check if email or username already exists
    const existingUser = users.find(u => u.email === email || u.username === username);
    if (existingUser || dbDuplicate) {
      return res.status(400).json({
        success: false,
        message: 'Email or username already exists'
      });
    }
    
    // Create new teacher
    const newTeacher = {
      id: require('uuid').v4(),
      firstName,
      middleName: middleName || '',
      lastName,
      email,
      username,
      password, // In production, this should be hashed
      role: role || 'teacher',
      gradeLevel,
      section,
      subjects: subjects || [],
      bio: bio || '',
      sex: sex || '',
      contactNumber: contactNumber || '',
      status: 'approved',
      archived: false,
      createdAt: new Date().toISOString(),
      school_year_id: activeSchoolYear.id
    };

    let createdTeacherId = newTeacher.id;
    let dbSaved = false;
    try {
      await ensureTeacherSchoolYearColumn();
      const insertResult = await query(
        `INSERT INTO teachers (
           first_name, middle_name, last_name, username, email, password, role,
           grade_level, section, subjects, bio, profile_pic, verification_status,
           sex, contact_number,
           school_year_id, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          firstName,
          middleName || '',
          lastName,
          username,
          email,
          password,
          role || 'teacher',
          gradeLevel || '',
          section || '',
          JSON.stringify(subjects || []),
          bio || '',
          '',
          'approved',
          sex || null,
          contactNumber || null,
          activeSchoolYear.id
        ]
      );
      createdTeacherId = insertResult?.insertId || createdTeacherId;
      dbSaved = true;
    } catch (error) {
      console.log('DB insert skipped/fallback to file storage:', error.message);
    }

    users.push(newTeacher);
    const fileSaved = writeUsers(users);

    if (dbSaved || fileSaved) {
      console.log(`Teacher ${firstName} ${lastName} created successfully`);
      res.status(201).json({
        success: true,
        message: 'Teacher created successfully',
        data: {
          teacher: {
            id: createdTeacherId,
            firstName: newTeacher.firstName,
            middleName: newTeacher.middleName,
            lastName: newTeacher.lastName,
            email: newTeacher.email,
            username: newTeacher.username,
            role: newTeacher.role,
            gradeLevel: newTeacher.gradeLevel,
            section: newTeacher.section,
            subjects: newTeacher.subjects,
            bio: newTeacher.bio,
            sex: newTeacher.sex,
            contactNumber: newTeacher.contactNumber,
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
const updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Normalize and validate institutional email domain.
    if (updateData.email !== undefined) {
      const normalizedEmail = String(updateData.email || '')
        .trim()
        .toLowerCase()
        .replace(/@wmsu\.edu\.com$/i, '@wmsu.edu.ph');

      if (!normalizedEmail || !/^[^\s@]+@wmsu\.edu\.ph$/i.test(normalizedEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Email must use the @wmsu.edu.ph domain'
        });
      }

      updateData.email = normalizedEmail;
    }

    let dbUpdatedTeacher = null;

    // Prefer DB update first because most teacher rows shown in admin come from DB.
    try {
      const teacherRows = await query(
        `SELECT id, first_name, middle_name, last_name, username, email, role,
          grade_level, section, subjects, bio, verification_status, sex, contact_number
         FROM teachers
         WHERE id = ?
         LIMIT 1`,
        [id]
      );

      if (teacherRows.length > 0) {
        const current = teacherRows[0];

        if (updateData.email) {
          const duplicateEmailRows = await query(
            'SELECT id FROM teachers WHERE email = ? AND id <> ? LIMIT 1',
            [updateData.email, id]
          );
          if (duplicateEmailRows.length > 0) {
            return res.status(400).json({
              success: false,
              message: 'Email already exists'
            });
          }
        }

        const firstName = updateData.firstName ?? updateData.first_name ?? current.first_name ?? '';
        const middleName = updateData.middleName ?? updateData.middle_name ?? current.middle_name ?? '';
        const lastName = updateData.lastName ?? updateData.last_name ?? current.last_name ?? '';
        const username = updateData.username ?? current.username ?? '';
        const email = updateData.email ?? current.email ?? '';
        const role = updateData.role ?? current.role ?? 'teacher';
        const gradeLevel = updateData.gradeLevel ?? updateData.grade_level ?? current.grade_level ?? '';
        const section = updateData.section ?? current.section ?? '';
        const subjects = updateData.subjects ?? current.subjects ?? '[]';
        const bio = updateData.bio ?? current.bio ?? '';
        const sex = updateData.sex ?? current.sex ?? '';
        const contactNumber = updateData.contactNumber ?? updateData.contact_number ?? current.contact_number ?? '';
        const status = updateData.status ?? updateData.verification_status ?? current.verification_status ?? 'approved';

        await query(
          `UPDATE teachers
           SET first_name = ?,
               middle_name = ?,
               last_name = ?,
               username = ?,
               email = ?,
               role = ?,
               grade_level = ?,
               section = ?,
               subjects = ?,
               bio = ?,
                 sex = ?,
                 contact_number = ?,
               verification_status = ?,
               updated_at = NOW()
           WHERE id = ?`,
          [
            firstName,
            middleName,
            lastName,
            username,
            email,
            role,
            gradeLevel,
            section,
            typeof subjects === 'string' ? subjects : JSON.stringify(subjects || []),
            bio,
            sex,
            contactNumber,
            status,
            id
          ]
        );

        dbUpdatedTeacher = {
          id: current.id,
          firstName,
          middleName,
          lastName,
          username,
          email,
          role,
          gradeLevel,
          section,
          subjects: parseSubjects(subjects),
          bio,
          sex,
          contactNumber,
          status
        };
      }
    } catch (dbError) {
      console.log('DB update skipped/fallback to file storage:', dbError.message);
    }
    
    const users = readUsers();

    const teacherIndex = users.findIndex(u => String(u.id) === String(id));

    if (teacherIndex === -1 && !dbUpdatedTeacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    let fileUpdatedTeacher = null;
    let fileSaved = true;

    if (teacherIndex !== -1) {
      const merged = {
        ...users[teacherIndex],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      users[teacherIndex] = merged;
      fileUpdatedTeacher = merged;
      fileSaved = writeUsers(users);
    }

    if (dbUpdatedTeacher || fileSaved) {
      console.log(`Teacher ${id} updated successfully`);
      res.json({
        success: true,
        message: 'Teacher updated successfully',
        data: {
          teacher: dbUpdatedTeacher || fileUpdatedTeacher
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
