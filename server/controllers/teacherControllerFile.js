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

    // Preserve teacher history per school year: allow same email/username across different school years.
    try {
      const indexes = await query('SHOW INDEX FROM teachers');
      const uniqueByName = new Map();

      indexes
        .filter((idx) => Number(idx.Non_unique) === 0)
        .forEach((idx) => {
          if (!uniqueByName.has(idx.Key_name)) uniqueByName.set(idx.Key_name, []);
          uniqueByName.get(idx.Key_name).push({ seq: Number(idx.Seq_in_index), col: idx.Column_name });
        });

      const getIndexCols = (name) => (uniqueByName.get(name) || [])
        .sort((a, b) => a.seq - b.seq)
        .map((entry) => entry.col);

      let hasScopedUsernameUnique = false;
      let hasScopedEmailUnique = false;
      let globalUsernameUniqueName = null;
      let globalEmailUniqueName = null;

      for (const keyName of uniqueByName.keys()) {
        const cols = getIndexCols(keyName);
        if (cols.length === 2 && cols[0] === 'school_year_id' && cols[1] === 'username') {
          hasScopedUsernameUnique = true;
        }
        if (cols.length === 2 && cols[0] === 'school_year_id' && cols[1] === 'email') {
          hasScopedEmailUnique = true;
        }
        if (cols.length === 1 && cols[0] === 'username' && keyName !== 'PRIMARY') {
          globalUsernameUniqueName = keyName;
        }
        if (cols.length === 1 && cols[0] === 'email' && keyName !== 'PRIMARY') {
          globalEmailUniqueName = keyName;
        }
      }

      if (!hasScopedUsernameUnique) {
        await query('CREATE UNIQUE INDEX idx_teachers_sy_username_unique ON teachers (school_year_id, username)');
      }
      if (!hasScopedEmailUnique) {
        await query('CREATE UNIQUE INDEX idx_teachers_sy_email_unique ON teachers (school_year_id, email)');
      }

      if (globalUsernameUniqueName) {
        await query(`ALTER TABLE teachers DROP INDEX \`${globalUsernameUniqueName}\``);
      }
      if (globalEmailUniqueName) {
        await query(`ALTER TABLE teachers DROP INDEX \`${globalEmailUniqueName}\``);
      }
    } catch (indexErr) {
      console.log('ensureTeacherSchoolYearColumn index scope update skipped:', indexErr.message);
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

const getHistoricalTeacherSchoolYears = async (targetSy) => {
  if (!targetSy?.id) return [];

  try {
    if (targetSy.start_date) {
      const rowsByDate = await query(
        `SELECT sy.id, sy.label, sy.start_date
         FROM school_years sy
         WHERE sy.is_archived = 0
           AND sy.id <> ?
           AND sy.start_date < ?
           AND EXISTS (
             SELECT 1 FROM teachers t WHERE t.school_year_id = sy.id LIMIT 1
           )
         ORDER BY sy.start_date DESC`,
        [targetSy.id, targetSy.start_date]
      );
      if (rowsByDate.length > 0) return rowsByDate;
    }

    const rowsById = await query(
      `SELECT sy.id, sy.label, sy.start_date
       FROM school_years sy
       WHERE sy.is_archived = 0
         AND sy.id < ?
         AND EXISTS (
           SELECT 1 FROM teachers t WHERE t.school_year_id = sy.id LIMIT 1
         )
       ORDER BY sy.id DESC`,
      [targetSy.id]
    );
    return rowsById;
  } catch (err) {
    console.log('getHistoricalTeacherSchoolYears fallback:', err.message);
  }

  const latest = await getLatestHistoricalTeacherSchoolYear(targetSy);
  return latest ? [latest] : [];
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

const makeTeacherViewOnlyError = () => {
  const err = new Error('Editing past school years is not allowed (view only).');
  err.statusCode = 403;
  return err;
};

const assertTeacherEditableInActiveSchoolYear = async (teacherId, fileRecord = null) => {
  await ensureTeacherSchoolYearColumn();
  const activeSy = await getActiveSchoolYear();

  let recordSchoolYearId = null;
  try {
    const dbRows = await query('SELECT school_year_id FROM teachers WHERE id = ? LIMIT 1', [teacherId]);
    if (dbRows.length > 0) {
      recordSchoolYearId = dbRows[0].school_year_id;
    }
  } catch (dbErr) {
    console.log('Teacher school year edit guard DB check skipped:', dbErr.message);
  }

  if ((recordSchoolYearId === null || recordSchoolYearId === undefined) && fileRecord) {
    recordSchoolYearId = fileRecord.school_year_id ?? fileRecord.schoolYearId ?? null;
  }

  if (recordSchoolYearId === null || recordSchoolYearId === undefined) {
    try {
      const userRows = await query('SELECT school_year_id FROM users WHERE id = ? LIMIT 1', [teacherId]);
      if (userRows.length > 0) {
        recordSchoolYearId = userRows[0].school_year_id;
      }
    } catch (userDbErr) {
      console.log('Teacher school year edit guard users-table check skipped:', userDbErr.message);
    }
  }

  if (recordSchoolYearId !== null && recordSchoolYearId !== undefined && Number(recordSchoolYearId) !== Number(activeSy.id)) {
    throw makeTeacherViewOnlyError();
  }

  return activeSy;
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

const toTimeValue = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 0;
  return date.getTime();
};

const getTeacherIdentityKey = (teacher = {}) => {
  const email = String(teacher.email || '').trim().toLowerCase();
  if (email) return `email:${email}`;

  const username = String(teacher.username || '').trim().toLowerCase();
  if (username) return `username:${username}`;

  const fullName = normalizeName(`${teacher.first_name || teacher.firstName || ''} ${teacher.last_name || teacher.lastName || ''}`);
  if (fullName) return `name:${fullName}`;

  const id = String(teacher.id || '').trim();
  if (id) return `id:${id}`;

  return null;
};

const pickLatestTeacherRecordPerIdentity = (rows = []) => {
  const byIdentity = new Map();

  for (const row of rows) {
    const key = getTeacherIdentityKey(row);
    if (!key) continue;

    const existing = byIdentity.get(key);
    if (!existing) {
      byIdentity.set(key, row);
      continue;
    }

    const existingSy = Number(existing.school_year_id || 0);
    const rowSy = Number(row.school_year_id || 0);
    if (rowSy > existingSy) {
      byIdentity.set(key, row);
      continue;
    }

    if (rowSy === existingSy && toTimeValue(row.created_at) > toTimeValue(existing.created_at)) {
      byIdentity.set(key, row);
    }
  }

  return Array.from(byIdentity.values());
};

const belongsToSchoolYear = (record = {}, schoolYear = null, strictSchoolYearIdOnly = false) => {
  if (!schoolYear) return true;

  const recordSchoolYearId = record.school_year_id ?? record.schoolYearId;
  if (recordSchoolYearId !== undefined && recordSchoolYearId !== null && String(recordSchoolYearId) === String(schoolYear.id)) {
    return true;
  }

  if (strictSchoolYearIdOnly) {
    return false;
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
        .filter((teacher) => {
          const verificationStatus = String(teacher?.verification_status || 'approved').trim().toLowerCase();
          const isVisible = !['archived', 'inactive', 'declined', 'rejected'].includes(verificationStatus);
          return belongsToSchoolYear(teacher, targetSy, isExplicitSchoolYearScope) && isVisible;
        })
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

      const knownTeacherIds = new Set(
        dbFormatted
          .map((teacher) => String(teacher.id || '').trim())
          .filter(Boolean)
      );
      const knownTeacherNames = new Set(
        dbFormatted
          .map((teacher) => normalizeName(teacher.fullName || `${teacher.firstName || ''} ${teacher.lastName || ''}`))
          .filter(Boolean)
      );

      // Include assignment-only teachers (e.g., historical SY data where teacher row is missing in teachers table for that SY)
      const existingKeys = new Set();
      dbFormatted.forEach((teacher) => {
        const idKey = String(teacher.id || '').trim();
        const nameKey = normalizeName(teacher.fullName || `${teacher.firstName || ''} ${teacher.lastName || ''}`);
        if (idKey) existingKeys.add(idKey);
        if (nameKey) existingKeys.add(nameKey);
      });

      const supplementalByKey = new Map();
      const upsertSupplemental = ({ id, name, role, gradeLevel = '', section = '', subject = '', classSectionLabel = '' }) => {
        const trimmedName = String(name || '').trim();
        if (!trimmedName) return;
        const idKey = String(id || '').trim();
        const nameKey = normalizeName(trimmedName);
        if (isExplicitSchoolYearScope) {
          const knownById = idKey ? knownTeacherIds.has(idKey) : false;
          const knownByName = knownTeacherNames.has(nameKey);
          if (!knownById && !knownByName) return;
        }
        if ((idKey && existingKeys.has(idKey)) || (nameKey && existingKeys.has(nameKey))) return;
        const key = idKey || nameKey;
        if (!key) return;

        if (!supplementalByKey.has(key)) {
          const parts = trimmedName.split(/\s+/);
          const firstName = parts.shift() || trimmedName;
          const lastName = parts.join(' ');
          supplementalByKey.set(key, {
            id: id || `assignment-${nameKey || key}`,
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

        if (idKey) existingKeys.add(idKey);
        if (nameKey) existingKeys.add(nameKey);

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
          belongsToSchoolYear(u, targetSy, isExplicitSchoolYearScope)
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
          belongsToSchoolYear(u, targetSy, isExplicitSchoolYearScope)
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
const getArchivedTeachers = async (req, res) => {
  try {
    const users = readUsers();

    const fileArchivedTeachers = users
      .filter(u => 
        (u.role === 'adviser' || 
        u.role === 'teacher' || 
        u.role === 'subject_teacher') &&
        (u.archived || String(u.status || '').trim().toLowerCase() === 'inactive' || String(u.verification_status || '').trim().toLowerCase() === 'archived')
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

    let dbArchivedTeachers = [];
    try {
      const rows = await query(
        `SELECT id, first_name, middle_name, last_name, username, email, role,
                grade_level, section, subjects, bio, profile_pic, verification_status,
                sex, contact_number, created_at, updated_at, school_year_id
         FROM teachers
         WHERE LOWER(COALESCE(verification_status, '')) IN ('archived', 'inactive')
         ORDER BY updated_at DESC`
      );

      dbArchivedTeachers = rows.map((teacher) => ({
        id: teacher.id,
        firstName: teacher.first_name || '',
        middleName: teacher.middle_name || '',
        lastName: teacher.last_name || '',
        fullName: `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim(),
        username: teacher.username || '',
        email: teacher.email || '',
        role: teacher.role || 'teacher',
        gradeLevel: teacher.grade_level || '',
        section: teacher.section || '',
        subjectsHandled: parseSubjects(teacher.subjects),
        subjects: parseSubjects(teacher.subjects),
        bio: teacher.bio || '',
        profilePic: teacher.profile_pic || '',
        sex: teacher.sex || '',
        contactNumber: teacher.contact_number || '',
        status: 'inactive',
        archivedAt: teacher.updated_at || teacher.created_at || null,
        createdAt: teacher.created_at || null,
        school_year_id: teacher.school_year_id || null
      }));
    } catch (dbArchiveError) {
      console.log('getArchivedTeachers DB query skipped:', dbArchiveError.message);
    }

    const byId = new Map();
    [...dbArchivedTeachers, ...fileArchivedTeachers].forEach((teacher) => {
      const key = String(teacher?.id || '').trim() || `${String(teacher?.email || '').trim().toLowerCase()}::${String(teacher?.username || '').trim().toLowerCase()}`;
      if (!key) return;
      if (!byId.has(key)) {
        byId.set(key, teacher);
        return;
      }
      const existing = byId.get(key);
      byId.set(key, {
        ...existing,
        ...teacher,
        subjects: Array.from(new Set([...(existing.subjects || []), ...(teacher.subjects || [])].filter(Boolean))),
        subjectsHandled: Array.from(new Set([...(existing.subjectsHandled || []), ...(teacher.subjectsHandled || [])].filter(Boolean)))
      });
    });

    const archivedTeachers = Array.from(byId.values());
    
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
const archiveTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const users = readUsers();
    const targetId = String(id || '').trim();
    
    // First try to find teacher in file storage
    let teacherIndex = users.findIndex((u) => String(u?.id || '').trim() === targetId);
    let teacher = null;
    let source = 'file';
    
    if (teacherIndex !== -1) {
      teacher = users[teacherIndex];
    } else {
      // If not found in file, check teachers table.
      try {
        const teacherRows = await query(
          `SELECT id, username, first_name as firstName, last_name as lastName, email, role, school_year_id
           FROM teachers
           WHERE CAST(id AS CHAR) = ?
           LIMIT 1`,
          [targetId]
        );
        
        if (Array.isArray(teacherRows) && teacherRows.length > 0) {
          teacher = teacherRows[0];
          source = 'teachers_table';
          console.log('Found teacher in database for archiving:', id);
        }
      } catch (dbError) {
        console.error('Database error while finding teacher for archive:', dbError);
      }

      // Fallback: some teacher accounts are stored in users table.
      if (!teacher) {
        try {
          const userCols = await query('SHOW COLUMNS FROM users');
          const userFieldSet = new Set(userCols.map((col) => col.Field));
          const firstNameExpr = userFieldSet.has('firstName') ? 'firstName' : (userFieldSet.has('first_name') ? 'first_name' : "''");
          const lastNameExpr = userFieldSet.has('lastName') ? 'lastName' : (userFieldSet.has('last_name') ? 'last_name' : "''");
          const schoolYearExpr = userFieldSet.has('school_year_id') ? 'school_year_id' : 'NULL as school_year_id';
          const userRows = await query(
            `SELECT id, username,
                    ${firstNameExpr} as firstName,
                    ${lastNameExpr} as lastName,
                    email, role, ${schoolYearExpr}
             FROM users
             WHERE CAST(id AS CHAR) = ?
               AND role IN ('teacher', 'adviser', 'subject_teacher')
             LIMIT 1`,
            [targetId]
          );

          if (Array.isArray(userRows) && userRows.length > 0) {
            teacher = userRows[0];
            source = 'users_table';
            console.log('Found teacher in users table for archiving:', id);
          }
        } catch (userDbError) {
          console.error('Users table error while finding teacher for archive:', userDbError);
        }
      }
    }
    
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found in file storage or database'
      });
    }

    await assertTeacherEditableInActiveSchoolYear(targetId, teacher);
    
    // Check if it's a teacher role
    if (!['adviser', 'teacher', 'subject_teacher'].includes(teacher.role)) {
      return res.status(400).json({
        success: false,
        message: 'User is not a teacher'
      });
    }
    
    // Archive the teacher based on source
    if (source === 'file') {
      // Update file storage
      users[teacherIndex] = {
        ...teacher,
        status: 'inactive',
        archived: true,
        verification_status: 'archived',
        archivedAt: new Date().toISOString()
      };
      
      const success = writeUsers(users);
      
      if (success) {
        console.log(`Teacher ${teacher.firstName} ${teacher.lastName} archived successfully in file storage`);
        res.json({
          success: true,
          message: 'Teacher archived successfully',
          source: 'file'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to archive teacher in file storage'
        });
      }
    } else if (source === 'teachers_table') {
      // Update teachers table and sync users status if linked.
      try {
        const teacherCols = await query('SHOW COLUMNS FROM teachers');
        const teacherFieldSet = new Set(teacherCols.map((col) => col.Field));
        const teacherStatusCol = teacherFieldSet.has('verification_status')
          ? 'verification_status'
          : (teacherFieldSet.has('status') ? 'status' : null);
        const teacherUpdatedCol = teacherFieldSet.has('updated_at')
          ? 'updated_at'
          : (teacherFieldSet.has('updatedAt') ? 'updatedAt' : null);

        let teacherUpdated = false;
        if (teacherStatusCol) {
          const updateClauses = [`${teacherStatusCol} = ?`];
          const updateParams = ['archived'];
          if (teacherUpdatedCol) updateClauses.push(`${teacherUpdatedCol} = CURRENT_TIMESTAMP`);

          let updateResult = await query(
            `UPDATE teachers SET ${updateClauses.join(', ')} WHERE CAST(id AS CHAR) = ?`,
            [...updateParams, targetId]
          );

          let affected = Number(updateResult?.affectedRows || 0);
          if (affected === 0 && teacher?.email) {
            updateResult = await query(
              `UPDATE teachers SET ${updateClauses.join(', ')} WHERE LOWER(email) = LOWER(?)`,
              [...updateParams, String(teacher.email || '').trim()]
            );
            affected = Number(updateResult?.affectedRows || 0);
          }
          teacherUpdated = affected > 0;
        } else {
          console.log('archiveTeacher: no teacher status column; skipping teachers status update');
        }

        let usersUpdated = false;
        try {
          const userCols = await query('SHOW COLUMNS FROM users');
          const userFieldSet = new Set(userCols.map((col) => col.Field));
          const statusCol = userFieldSet.has('status')
            ? 'status'
            : (userFieldSet.has('verification_status') ? 'verification_status' : null);
          const archivedCol = userFieldSet.has('archived')
            ? 'archived'
            : (userFieldSet.has('is_archived') ? 'is_archived' : null);
          const updatedCol = userFieldSet.has('updatedAt')
            ? 'updatedAt'
            : (userFieldSet.has('updated_at') ? 'updated_at' : null);

          if (!statusCol && !archivedCol) {
            try {
              await query('ALTER TABLE users ADD COLUMN status VARCHAR(50) NULL');
            } catch (alterErr) {
              console.log('archiveTeacher users status column add skipped:', alterErr.message);
            }
          }

          const refreshedCols = await query('SHOW COLUMNS FROM users');
          const refreshedSet = new Set(refreshedCols.map((col) => col.Field));
          const finalStatusCol = refreshedSet.has('status')
            ? 'status'
            : (refreshedSet.has('verification_status') ? 'verification_status' : null);
          const finalArchivedCol = refreshedSet.has('archived')
            ? 'archived'
            : (refreshedSet.has('is_archived') ? 'is_archived' : null);
          const finalUpdatedCol = refreshedSet.has('updatedAt')
            ? 'updatedAt'
            : (refreshedSet.has('updated_at') ? 'updated_at' : null);

          const userSetParts = [];
          const userSetParams = [];
          if (finalStatusCol) {
            userSetParts.push(`${finalStatusCol} = ?`);
            userSetParams.push('inactive');
          }
          if (finalArchivedCol) {
            userSetParts.push(`${finalArchivedCol} = ?`);
            userSetParams.push(1);
          }
          if (finalUpdatedCol) userSetParts.push(`${finalUpdatedCol} = NOW()`);

          if (userSetParts.length > 0) {
            let userResult = await query(
              `UPDATE users SET ${userSetParts.join(', ')} WHERE CAST(id AS CHAR) = ?`,
              [...userSetParams, targetId]
            );

            let userAffected = Number(userResult?.affectedRows || 0);
            if (userAffected === 0 && teacher?.email) {
              userResult = await query(
                `UPDATE users SET ${userSetParts.join(', ')} WHERE LOWER(email) = LOWER(?)`,
                [...userSetParams, String(teacher.email || '').trim()]
              );
              userAffected = Number(userResult?.affectedRows || 0);
            }
            usersUpdated = userAffected > 0;
          }
        } catch (usersUpdateErr) {
          console.log('archiveTeacher users status update skipped:', usersUpdateErr.message);
        }

        if (!teacherUpdated && !usersUpdated) {
          console.log('archiveTeacher: no rows updated, returning success to avoid blocking admin flow');
        }

        console.log(`Teacher ${teacher.firstName} ${teacher.lastName} archived successfully in database`);
        res.json({
          success: true,
          message: 'Teacher archived successfully',
          source: 'teachers_table'
        });
      } catch (dbError) {
        console.error('Database error while archiving teacher:', dbError);
        res.status(500).json({
          success: false,
          message: 'Failed to archive teacher in database'
        });
      }
    } else {
      // users_table source
      try {
        let usersUpdated = false;

        try {
          const userCols = await query('SHOW COLUMNS FROM users');
          const userFieldSet = new Set(userCols.map((col) => col.Field));
          const statusCol = userFieldSet.has('status')
            ? 'status'
            : (userFieldSet.has('verification_status') ? 'verification_status' : null);
          const archivedCol = userFieldSet.has('archived')
            ? 'archived'
            : (userFieldSet.has('is_archived') ? 'is_archived' : null);
          const updatedCol = userFieldSet.has('updatedAt')
            ? 'updatedAt'
            : (userFieldSet.has('updated_at') ? 'updated_at' : null);

          if (!statusCol && !archivedCol) {
            try {
              await query('ALTER TABLE users ADD COLUMN status VARCHAR(50) NULL');
            } catch (alterErr) {
              console.log('archiveTeacher users status column add skipped:', alterErr.message);
            }
          }

          const refreshedCols = await query('SHOW COLUMNS FROM users');
          const refreshedSet = new Set(refreshedCols.map((col) => col.Field));
          const finalStatusCol = refreshedSet.has('status')
            ? 'status'
            : (refreshedSet.has('verification_status') ? 'verification_status' : null);
          const finalArchivedCol = refreshedSet.has('archived')
            ? 'archived'
            : (refreshedSet.has('is_archived') ? 'is_archived' : null);
          const finalUpdatedCol = refreshedSet.has('updatedAt')
            ? 'updatedAt'
            : (refreshedSet.has('updated_at') ? 'updated_at' : null);

          const setParts = [];
          const setParams = [];
          if (finalStatusCol) {
            setParts.push(`${finalStatusCol} = ?`);
            setParams.push('inactive');
          }
          if (finalArchivedCol) {
            setParts.push(`${finalArchivedCol} = ?`);
            setParams.push(1);
          }
          if (finalUpdatedCol) setParts.push(`${finalUpdatedCol} = NOW()`);

          if (setParts.length > 0) {
            let updateResult = await query(
              `UPDATE users SET ${setParts.join(', ')} WHERE CAST(id AS CHAR) = ?`,
              [...setParams, targetId]
            );

            let affected = Number(updateResult?.affectedRows || 0);
            if (affected === 0 && teacher?.email) {
              updateResult = await query(
                `UPDATE users SET ${setParts.join(', ')} WHERE LOWER(email) = LOWER(?)`,
                [...setParams, String(teacher.email || '').trim()]
              );
              affected = Number(updateResult?.affectedRows || 0);
            }

            usersUpdated = affected > 0;
          }
        } catch (usersUpdateErr) {
          console.log('archiveTeacher users-table status update skipped:', usersUpdateErr.message);
        }

        // Best-effort sync for mirrored teachers row.
        let teachersSynced = false;
        try {
          const syncResult = await query(
            'UPDATE teachers SET verification_status = ?, updated_at = CURRENT_TIMESTAMP WHERE CAST(id AS CHAR) = ? OR LOWER(email) = LOWER(?)',
            ['archived', targetId, teacher.email || '']
          );
          teachersSynced = Number(syncResult?.affectedRows || 0) > 0;
        } catch (teachersSyncErr) {
          console.log('archiveTeacher teachers sync skipped:', teachersSyncErr.message);
        }

        if (!usersUpdated && !teachersSynced) {
          console.log('archiveTeacher users_table: no rows updated, returning success to avoid blocking admin flow');
        }

        console.log(`Teacher ${teacher.firstName} ${teacher.lastName} archived successfully in users table`);
        res.json({
          success: true,
          message: 'Teacher archived successfully',
          source: 'users_table'
        });
      } catch (usersDbError) {
        console.error('Users table error while archiving teacher:', usersDbError);
        res.status(500).json({
          success: false,
          message: 'Failed to archive teacher in users table'
        });
      }
    }
  } catch (error) {
    console.error('Error in archiveTeacher:', error);
    console.error('Error details:', {
      message: error.message,
      statusCode: error.statusCode,
      stack: error.stack
    });
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Error archiving teacher',
      error: error.message,
      statusCode: status
    });
  }
};

// Restore an archived teacher
const restoreTeacher = async (req, res) => {
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

    await assertTeacherEditableInActiveSchoolYear(id, teacher);
    
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
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Error restoring teacher',
      error: error.message
    });
  }
};

// Delete a teacher (permanent)
const deleteTeacher = async (req, res) => {
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

    await assertTeacherEditableInActiveSchoolYear(id, teacher);
    
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
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Error deleting teacher',
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
    const sourceSchoolYears = await getHistoricalTeacherSchoolYears(targetSy);
    const sourceSy = sourceSchoolYears[0] || null;
    if (!sourceSy) {
      return res.json({
        success: true,
        data: [],
        meta: { sourceSchoolYearId: null, sourceSchoolYearIds: [], targetSchoolYearId: targetSy.id }
      });
    }

    const sourceSchoolYearIds = sourceSchoolYears
      .map((sy) => Number(sy?.id || 0))
      .filter((id) => Number.isInteger(id) && id > 0);
    const sourcePlaceholders = sourceSchoolYearIds.map(() => '?').join(',');

    const teachers = await query(
      `SELECT id, first_name, middle_name, last_name, username, email, role,
              grade_level, section, subjects, bio, profile_pic, verification_status,
              sex, contact_number, school_year_id, created_at
       FROM teachers
       WHERE school_year_id IN (${sourcePlaceholders})
         AND LOWER(COALESCE(verification_status, '')) NOT IN ('declined', 'rejected')
       ORDER BY school_year_id DESC, created_at DESC`,
      sourceSchoolYearIds
    );

    const canonicalTeachers = pickLatestTeacherRecordPerIdentity(teachers);

    const formatted = canonicalTeachers.map((t) => ({
      ...t,
      subjects: t.subjects,
    }));

    res.json({
      success: true,
      data: formatted,
      meta: {
        sourceSchoolYearId: sourceSy.id,
        sourceSchoolYearIds,
        sourceSchoolYearLabel: sourceSchoolYears.length > 1
          ? `${sourceSy.label} and older years`
          : sourceSy.label,
        targetSchoolYearId: targetSy.id,
        targetSchoolYearLabel: targetSy.label
      }
    });
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
    const sourceSchoolYears = await getHistoricalTeacherSchoolYears(targetSy);
    const sourceSy = sourceSchoolYears[0] || null;
    if (!sourceSy) {
      return res.status(400).json({ success: false, message: 'No historical school year with teacher data found to fetch from' });
    }

    const sourceSchoolYearIds = sourceSchoolYears
      .map((sy) => Number(sy?.id || 0))
      .filter((id) => Number.isInteger(id) && id > 0);
    if (!sourceSchoolYearIds.length) {
      return res.status(400).json({ success: false, message: 'No historical school year with teacher data found to fetch from' });
    }

    const { ids } = req.body || {};
    const idList = Array.isArray(ids)
      ? ids.map((id) => String(id).trim()).filter(Boolean)
      : [];

    const sourcePlaceholders = sourceSchoolYearIds.map(() => '?').join(',');
    let prevTeachers = [];
    prevTeachers = await query(
      `SELECT *
       FROM teachers
       WHERE school_year_id IN (${sourcePlaceholders})
         AND LOWER(COALESCE(verification_status, '')) NOT IN ('declined', 'rejected')
       ORDER BY school_year_id DESC, created_at DESC`,
      sourceSchoolYearIds
    );

    prevTeachers = pickLatestTeacherRecordPerIdentity(prevTeachers);

    if (idList.length > 0) {
      const selectedSet = new Set(idList);
      prevTeachers = prevTeachers.filter((teacher) => selectedSet.has(String(teacher.id || '')));
    }

    if (!prevTeachers.length) {
      return res.json({ success: true, message: 'Nothing to fetch', data: { inserted: 0, updated: 0, skipped: 0 } });
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const t of prevTeachers) {
      // Only dedupe against target school year; preserve source-year teacher records.
      const dedupeConditions = [];
      const dedupeParams = [];
      if (t.email) {
        dedupeConditions.push('LOWER(TRIM(CONVERT(email USING utf8mb4))) COLLATE utf8mb4_general_ci = LOWER(TRIM(CONVERT(? USING utf8mb4))) COLLATE utf8mb4_general_ci');
        dedupeParams.push(t.email);
      }
      if (t.username) {
        dedupeConditions.push('LOWER(TRIM(CONVERT(username USING utf8mb4))) COLLATE utf8mb4_general_ci = LOWER(TRIM(CONVERT(? USING utf8mb4))) COLLATE utf8mb4_general_ci');
        dedupeParams.push(t.username);
      }

      let dup = [];
      if (dedupeConditions.length > 0) {
        dup = await query(
          `SELECT id, school_year_id
           FROM teachers
           WHERE school_year_id = ?
             AND (${dedupeConditions.join(' OR ')})
           LIMIT 1`,
          [targetSy.id, ...dedupeParams]
        );
      }

      if (dup.length) {
        const existing = dup[0];

        await query(
          `UPDATE teachers
           SET first_name = ?,
               middle_name = ?,
               last_name = ?,
               username = ?,
               email = ?,
               password = ?,
               role = ?,
               grade_level = ?,
               section = ?,
               subjects = ?,
               bio = ?,
               profile_pic = ?,
               verification_status = ?,
               sex = ?,
               contact_number = ?,
               updated_at = NOW()
           WHERE id = ?`,
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
            'approved',
            t.sex || null,
            t.contact_number || null,
            existing.id
          ]
        );

        updated += 1;
        continue;
      }

      try {
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
            'approved',
            t.sex || null,
            t.contact_number || null,
            targetSy.id
          ]
        );
      } catch (insertErr) {
        if (insertErr?.code === 'ER_DUP_ENTRY') {
          skipped += 1;
          continue;
        }
        throw insertErr;
      }

      inserted += 1;
    }

    res.json({
      success: true,
      message: 'Fetch complete',
      data: {
        inserted,
        updated,
        skipped,
        sourceSchoolYearId: sourceSy.id,
        sourceSchoolYearIds,
        targetSchoolYearId: targetSy.id
      }
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

    const requestedStatus = String(updateData.status ?? updateData.verification_status ?? '').trim().toLowerCase();
    if (requestedStatus === 'inactive' || requestedStatus === 'archived') {
      return archiveTeacher(req, res);
    }

    let activeSchoolYear;

    try {
      activeSchoolYear = await assertTeacherEditableInActiveSchoolYear(id);
    } catch (guardErr) {
      const status = guardErr.statusCode || 500;
      return res.status(status).json({
        success: false,
        message: guardErr.message || 'Failed to validate active school year lock'
      });
    }

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
    let dbUsersUpdatedTeacher = null;

    // Prefer DB update first because most teacher rows shown in admin come from DB.
    try {
      const teacherRows = await query(
        `SELECT id, first_name, middle_name, last_name, username, email, role,
          grade_level, section, subjects, bio, verification_status, sex, contact_number, school_year_id
         FROM teachers
         WHERE id = ?
         LIMIT 1`,
        [id]
      );

      if (teacherRows.length > 0) {
        const current = teacherRows[0];

        if (
          current.school_year_id !== null &&
          current.school_year_id !== undefined &&
          Number(current.school_year_id) !== Number(activeSchoolYear.id)
        ) {
          return res.status(403).json({
            success: false,
            message: 'Editing past school years is not allowed (view only).'
          });
        }

        if (updateData.email) {
          const incomingEmail = String(updateData.email || '').trim().toLowerCase();
          const currentEmail = String(current.email || '').trim().toLowerCase();

          if (incomingEmail !== currentEmail) {
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
        const requestedStatus = updateData.status ?? updateData.verification_status ?? current.verification_status ?? 'approved';
        const normalizedRequestedStatus = String(requestedStatus || 'approved').trim().toLowerCase();
        const shouldArchiveRecord = normalizedRequestedStatus === 'inactive' || normalizedRequestedStatus === 'archived';
        const status = shouldArchiveRecord
          ? 'archived'
          : (normalizedRequestedStatus === 'active' ? 'approved' : requestedStatus);

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
          status: shouldArchiveRecord ? 'inactive' : status
        };
      }
    } catch (dbError) {
      console.log('DB update skipped/fallback to file storage:', dbError.message);
    }

    // Fallback to users table for legacy teacher accounts persisted there.
    if (!dbUpdatedTeacher) {
      try {
        const userRows = await query(
          `SELECT id, firstName, middleName, lastName, username, email, role,
                  gradeLevel, section, subjects, bio, status, sex, contactNumber, school_year_id
           FROM users
           WHERE id = ?
           LIMIT 1`,
          [id]
        );

        if (userRows.length > 0) {
          const currentUser = userRows[0];
          const currentRole = String(currentUser.role || '').trim().toLowerCase();
          const teacherRoles = new Set(['teacher', 'adviser', 'subject_teacher']);

          if (teacherRoles.has(currentRole)) {
            if (
              currentUser.school_year_id !== null &&
              currentUser.school_year_id !== undefined &&
              Number(currentUser.school_year_id) !== Number(activeSchoolYear.id)
            ) {
              return res.status(403).json({
                success: false,
                message: 'Editing past school years is not allowed (view only).'
              });
            }

            if (updateData.email) {
              const incomingEmail = String(updateData.email || '').trim().toLowerCase();
              const currentEmail = String(currentUser.email || '').trim().toLowerCase();

              if (incomingEmail !== currentEmail) {
              const duplicateUserEmailRows = await query(
                'SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id <> ? LIMIT 1',
                [updateData.email, id]
              );
              if (duplicateUserEmailRows.length > 0) {
                return res.status(400).json({
                  success: false,
                  message: 'Email already exists'
                });
              }
              }
            }

            const firstName = updateData.firstName ?? updateData.first_name ?? currentUser.firstName ?? '';
            const middleName = updateData.middleName ?? updateData.middle_name ?? currentUser.middleName ?? '';
            const lastName = updateData.lastName ?? updateData.last_name ?? currentUser.lastName ?? '';
            const username = updateData.username ?? currentUser.username ?? '';
            const email = updateData.email ?? currentUser.email ?? '';
            const role = updateData.role ?? currentUser.role ?? 'teacher';
            const gradeLevel = updateData.gradeLevel ?? updateData.grade_level ?? currentUser.gradeLevel ?? '';
            const section = updateData.section ?? currentUser.section ?? '';
            const subjects = updateData.subjects ?? currentUser.subjects ?? '[]';
            const bio = updateData.bio ?? currentUser.bio ?? '';
            const sex = updateData.sex ?? currentUser.sex ?? '';
            const contactNumber = updateData.contactNumber ?? updateData.contact_number ?? currentUser.contactNumber ?? '';
            const requestedStatus = updateData.status ?? updateData.verification_status ?? currentUser.status ?? 'approved';
            const normalizedRequestedStatus = String(requestedStatus || 'approved').trim().toLowerCase();
            const shouldArchiveRecord = normalizedRequestedStatus === 'inactive' || normalizedRequestedStatus === 'archived';
            const status = shouldArchiveRecord
              ? 'inactive'
              : (normalizedRequestedStatus === 'active' ? 'approved' : requestedStatus);

            const serializedSubjects = typeof subjects === 'string' ? subjects : JSON.stringify(subjects || []);

            await query(
              `UPDATE users
               SET firstName = ?,
                   middleName = ?,
                   lastName = ?,
                   username = ?,
                   email = ?,
                   role = ?,
                   gradeLevel = ?,
                   section = ?,
                   subjects = ?,
                   bio = ?,
                   sex = ?,
                   contactNumber = ?,
                   status = ?,
                   updatedAt = NOW()
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
                serializedSubjects,
                bio,
                sex,
                contactNumber,
                status,
                id
              ]
            );

            dbUsersUpdatedTeacher = {
              id: currentUser.id,
              firstName,
              middleName,
              lastName,
              username,
              email,
              role,
              gradeLevel,
              section,
              subjects: parseSubjects(serializedSubjects),
              bio,
              sex,
              contactNumber,
              status: shouldArchiveRecord ? 'inactive' : status
            };
          }
        }
      } catch (usersDbError) {
        console.log('Users-table update skipped/fallback to file storage:', usersDbError.message);
      }
    }
    
    const users = readUsers();

    const teacherIndex = users.findIndex(u => String(u.id) === String(id));

    if (teacherIndex === -1 && !dbUpdatedTeacher && !dbUsersUpdatedTeacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    if (teacherIndex !== -1) {
      const fileTeacher = users[teacherIndex];
      const fileSy = fileTeacher?.school_year_id ?? fileTeacher?.schoolYearId ?? null;
      if (fileSy !== null && fileSy !== undefined && Number(fileSy) !== Number(activeSchoolYear.id)) {
        return res.status(403).json({
          success: false,
          message: 'Editing past school years is not allowed (view only).'
        });
      }
    }

    let fileUpdatedTeacher = null;
    let fileSaved = true;

    if (teacherIndex !== -1) {
      const requestedFileStatus = updateData.status ?? updateData.verification_status ?? users[teacherIndex]?.status ?? 'approved';
      const normalizedFileStatus = String(requestedFileStatus || 'approved').trim().toLowerCase();
      const shouldArchiveFileRecord = normalizedFileStatus === 'inactive' || normalizedFileStatus === 'archived';
      const merged = {
        ...users[teacherIndex],
        ...updateData,
        status: shouldArchiveFileRecord ? 'inactive' : (normalizedFileStatus === 'active' ? 'approved' : requestedFileStatus),
        verification_status: shouldArchiveFileRecord ? 'archived' : (normalizedFileStatus === 'active' ? 'approved' : requestedFileStatus),
        archived: shouldArchiveFileRecord,
        archivedAt: shouldArchiveFileRecord ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString()
      };
      users[teacherIndex] = merged;
      fileUpdatedTeacher = merged;
      fileSaved = writeUsers(users);
    }

    if (dbUpdatedTeacher || dbUsersUpdatedTeacher || fileSaved) {
      console.log(`Teacher ${id} updated successfully`);
      res.json({
        success: true,
        message: 'Teacher updated successfully',
        data: {
          teacher: dbUpdatedTeacher || dbUsersUpdatedTeacher || fileUpdatedTeacher
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
const approveTeacher = async (req, res) => {
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

    await assertTeacherEditableInActiveSchoolYear(id, users[teacherIndex]);
    
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
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Error approving teacher'
    });
  }
};

// Decline a teacher
const declineTeacher = async (req, res) => {
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

    await assertTeacherEditableInActiveSchoolYear(id, users[teacherIndex]);
    
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
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Error declining teacher'
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
