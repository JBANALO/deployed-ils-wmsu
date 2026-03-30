// server/controllers/classControllerMySQL.js
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

let classSyEnsured = false;
let subjectTeacherSyEnsured = false;

const ensureClassSchoolYearColumn = async () => {
  if (classSyEnsured) return;
  const columns = await query('SHOW COLUMNS FROM classes');
  const hasSy = columns.some((c) => c.Field === 'school_year_id');
  if (!hasSy) {
    await query('ALTER TABLE classes ADD COLUMN school_year_id INT NULL');
    await query('CREATE INDEX idx_classes_school_year ON classes (school_year_id)');
  }
  classSyEnsured = true;
};

const ensureSubjectTeacherSchoolYearColumn = async () => {
  if (subjectTeacherSyEnsured) return;
  const columns = await query('SHOW COLUMNS FROM subject_teachers');
  const hasSy = columns.some((c) => c.Field === 'school_year_id');
  if (!hasSy) {
    await query('ALTER TABLE subject_teachers ADD COLUMN school_year_id INT NULL');
    await query('CREATE INDEX idx_subject_teachers_school_year ON subject_teachers (school_year_id)');
  }
  subjectTeacherSyEnsured = true;
};

const getSchoolYearById = async (schoolYearId) => {
  if (!schoolYearId) return null;
  const rows = await query(
    'SELECT id, label, start_date FROM school_years WHERE id = ? AND is_archived = 0 LIMIT 1',
    [schoolYearId]
  );
  return rows[0] || null;
};

const getActiveSchoolYear = async () => {
  const rows = await query('SELECT id, label, start_date FROM school_years WHERE is_active = 1 AND is_archived = 0 LIMIT 1');
  if (!rows.length) throw new Error('No active school year found');
  return rows[0];
};

const resolveSchoolYear = async (req) => {
  const requestedId = req?.query?.schoolYearId || req?.body?.schoolYearId;
  if (requestedId) {
    const sy = await getSchoolYearById(requestedId);
    if (sy) return sy;
  }
  return getActiveSchoolYear();
};

const getPreviousSchoolYear = async (activeStartDate) => {
  const rows = await query(
    'SELECT id, label, start_date FROM school_years WHERE is_archived = 0 AND start_date < ? ORDER BY start_date DESC LIMIT 1',
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

exports.createClass = async (req, res) => {
  try {
    await ensureClassSchoolYearColumn();
    const activeSy = await getActiveSchoolYear();
    const { grade, section, adviserId } = req.body;
    const classId = uuidv4();

    await query(
      'INSERT INTO classes (id, grade, section, adviser_id, school_year_id, createdAt) VALUES (?, ?, ?, ?, ?, NOW())',
      [classId, grade, section, adviserId || null, activeSy.id]
    );

    res.status(201).json({ message: 'Class created', classId });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
};

exports.getAllClasses = async (req, res) => {
  try {
    await ensureClassSchoolYearColumn();
    await ensureSubjectTeacherSchoolYearColumn();
    const targetSy = await resolveSchoolYear(req);
    const classes = await query('SELECT * FROM classes WHERE school_year_id = ? ORDER BY grade, section', [targetSy.id]);
    
    // Fetch subject teachers and adviser info for each class
    const classesWithTeachers = await Promise.all(classes.map(async (cls) => {
      try {
        // Fetch subject teachers
        const subjectTeachers = await query(
          `SELECT st.*, u.firstName, u.lastName 
           FROM subject_teachers st 
           LEFT JOIN users u ON st.teacher_id = u.id COLLATE utf8mb4_unicode_ci
           WHERE st.class_id = ? AND st.school_year_id = ?` ,
          [cls.id, targetSy.id]
        );
        
        // Fetch adviser info - check both adviser_id in classes table and gradeLevel/section in users/teachers tables
        let adviserName = null;
        let adviserId = cls.adviser_id;
        
        if (cls.adviser_id) {
          // First, check if adviser_id exists in users table
          try {
            const advisers = await query(
              `SELECT id, firstName, lastName FROM users WHERE id = ? AND role = 'adviser'`,
              [cls.adviser_id]
            );
            if (advisers.length > 0) {
              adviserName = `${advisers[0].firstName} ${advisers[0].lastName}`;
              adviserId = advisers[0].id;
            }
          } catch (err) {
            console.error(`Error fetching adviser for class ${cls.id}:`, err);
          }
        }
        
        // If no adviser found via adviser_id, search by grade and section in both tables
        if (!adviserName) {
          try {
            // First check users table
            const advisersFromUsers = await query(
              `SELECT id, firstName, lastName FROM users 
               WHERE role = 'adviser' AND gradeLevel = ? AND section = ?`,
              [cls.grade, cls.section]
            );
            if (advisersFromUsers.length > 0) {
              adviserName = `${advisersFromUsers[0].firstName} ${advisersFromUsers[0].lastName}`;
              adviserId = advisersFromUsers[0].id;
            }
          } catch (err) {
            console.error(`Error searching adviser in users table for class ${cls.id}:`, err);
          }
        }
        
        // If still no adviser found, check teachers table
        if (!adviserName) {
          try {
            const advisersFromTeachers = await query(
              `SELECT id, first_name, last_name FROM teachers 
               WHERE role = 'adviser' AND grade_level = ? AND section = ?`,
              [cls.grade, cls.section]
            );
            if (advisersFromTeachers.length > 0) {
              adviserName = `${advisersFromTeachers[0].first_name} ${advisersFromTeachers[0].last_name}`;
              adviserId = advisersFromTeachers[0].id;
            }
          } catch (err) {
            console.error(`Error searching adviser in teachers table for class ${cls.id}:`, err);
          }
        }
        
        return {
          ...cls,
          adviser_id: adviserId,
          adviser_name: adviserName,
          subject_teachers: subjectTeachers.map(st => ({
            id: st.id,
            teacher_id: st.teacher_id,
            teacher_name: st.teacher_name || (st.firstName && st.lastName ? `${st.firstName} ${st.lastName}` : 'Unknown'),
            subject: st.subject,
            day: st.day || 'Monday - Friday',
            start_time: st.start_time || '08:00',
            end_time: st.end_time || '09:00'
          }))
        };
      } catch (error) {
        console.error(`Error fetching data for class ${cls.id}:`, error);
        return {
          ...cls,
          adviser_name: null,
          subject_teachers: []
        };
      }
    }));
    
    res.json({
      status: 'success',
      data: classesWithTeachers,
      classes: classesWithTeachers,  // For backward compatibility
      meta: { schoolYearId: targetSy.id }
    });
  } catch (error) {
    console.error('Error in getAllClasses:', error);
    res.status(500).json({ error: error.message });
  }
};

// List classes from the previous (non-archived) school year
exports.getPreviousYearClasses = async (req, res) => {
  try {
    await ensureClassSchoolYearColumn();
    const targetSy = await resolveSchoolYear(req);
    const prevSy = await getPreviousSchoolYear(targetSy.start_date);
    if (!prevSy) {
      return res.json({ success: true, data: [], meta: { sourceSchoolYearId: null, targetSchoolYearId: targetSy.id } });
    }

    const prevClasses = await query(
      'SELECT id, grade, section, adviser_id FROM classes WHERE school_year_id = ? ORDER BY grade, section',
      [prevSy.id]
    );

    res.json({
      success: true,
      data: prevClasses,
      meta: { sourceSchoolYearId: prevSy.id, targetSchoolYearId: targetSy.id }
    });
  } catch (error) {
    console.error('Error fetching previous year classes:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch previous year classes' });
  }
};

// Copy selected classes from previous school year into the active year
exports.fetchClassesFromPreviousYear = async (req, res) => {
  try {
    await ensureClassSchoolYearColumn();
    await ensureSubjectTeacherSchoolYearColumn();

    const targetSy = await resolveSchoolYear(req);
    await assertActiveTargetSchoolYear(targetSy);
    const prevSy = await getPreviousSchoolYear(targetSy.start_date);
    if (!prevSy) {
      return res.status(400).json({ success: false, message: 'No previous school year found to fetch from' });
    }

    const { ids } = req.body || {};
    const idList = Array.isArray(ids) && ids.length > 0 ? ids : null;

    const prevClasses = await query(
      `SELECT * FROM classes WHERE school_year_id = ? ${idList ? 'AND id IN (?)' : ''}`,
      idList ? [prevSy.id, idList] : [prevSy.id]
    );

    if (!prevClasses.length) {
      return res.json({ success: true, message: 'Nothing to fetch', data: { inserted: 0, skipped: 0 } });
    }

    let inserted = 0;
    let skipped = 0;

    for (const cls of prevClasses) {
      // Skip if a class with the same grade + section already exists in the target SY
      const dup = await query(
        'SELECT id FROM classes WHERE grade = ? AND section = ? AND school_year_id = ? LIMIT 1',
        [cls.grade, cls.section, targetSy.id]
      );
      if (dup.length) {
        skipped += 1;
        continue;
      }

      const newId = uuidv4();
      await query(
        'INSERT INTO classes (id, grade, section, adviser_id, school_year_id, createdAt) VALUES (?, ?, ?, ?, ?, NOW())',
        [newId, cls.grade, cls.section, null, targetSy.id]
      );

      inserted += 1;
    }

    res.json({
      success: true,
      message: 'Classes fetched from previous year',
      data: { inserted, skipped, sourceSchoolYearId: prevSy.id, targetSchoolYearId: targetSy.id }
    });
  } catch (error) {
    console.error('Error fetching classes from previous year:', error);
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message || 'Failed to fetch classes from previous year' });
  }
};

exports.getSubjectTeacherClasses = async (req, res) => {
  try {
    await ensureClassSchoolYearColumn();
    await ensureSubjectTeacherSchoolYearColumn();
    const activeSy = await resolveSchoolYear(req);
    const { userId } = req.params;
    console.log('Fetching classes for subject teacher:', userId);

    const classes = await query(
      `SELECT DISTINCT c.* FROM classes c 
       INNER JOIN subject_teachers st ON c.id = st.class_id 
       WHERE st.teacher_id = ? AND st.school_year_id = ? AND c.school_year_id = ?`,
      [userId, activeSy.id, activeSy.id]
    );

    // Fetch subject teachers for each class
    const classesWithTeachers = await Promise.all(classes.map(async (cls) => {
      try {
        const subjectTeachers = await query(
          `SELECT st.* FROM subject_teachers st WHERE st.class_id = ? AND st.school_year_id = ?`,
          [cls.id, activeSy.id]
        );
        return {
          ...cls,
          subject_teachers: subjectTeachers
        };
      } catch (error) {
        return { ...cls, subject_teachers: [] };
      }
    }));

    console.log('Found classes for subject teacher:', classesWithTeachers.length);
    res.json({
      success: true,
      data: classesWithTeachers
    });
  } catch (error) {
    console.error('Error fetching subject teacher classes:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getAdviserClasses = async (req, res) => {
  try {
    await ensureClassSchoolYearColumn();
    await ensureSubjectTeacherSchoolYearColumn();
    const activeSy = await resolveSchoolYear(req);
    const { adviserId } = req.params;
    console.log('Fetching classes for adviser:', adviserId);

    // First, try to find the adviser's gradeLevel and section
    let adviserGradeLevel = null;
    let adviserSection = null;

    // Check users table
    try {
      const user = await query(
        `SELECT gradeLevel, section FROM users WHERE id = ? AND role = 'adviser'`,
        [adviserId]
      );
      if (user.length > 0) {
        adviserGradeLevel = user[0].gradeLevel;
        adviserSection = user[0].section;
      }
    } catch (err) {
      console.log('Could not find adviser in users table:', err.message);
    }

    // If not found in users table, check teachers table
    if (!adviserGradeLevel || !adviserSection) {
      try {
        const teacher = await query(
          `SELECT grade_level, section FROM teachers WHERE id = ? AND role = 'adviser'`,
          [adviserId]
        );
        if (teacher.length > 0) {
          adviserGradeLevel = teacher[0].grade_level;
          adviserSection = teacher[0].section;
        }
      } catch (err) {
        console.log('Could not find adviser in teachers table:', err.message);
      }
    }

    // Find classes by adviser_id first, then by gradeLevel/section
    let classes = [];
    
    // Query classes where adviser_id matches
    const classesById = await query(
      'SELECT * FROM classes WHERE adviser_id = ? AND school_year_id = ? ORDER BY grade, section',
      [adviserId, activeSy.id]
    );
    classes = classesById;

    // Also query classes by gradeLevel/section if adviser is assigned that way
    if (adviserGradeLevel && adviserSection) {
      const classesByGradeSection = await query(
        'SELECT * FROM classes WHERE grade = ? AND section = ? AND school_year_id = ? ORDER BY grade, section',
        [adviserGradeLevel, adviserSection, activeSy.id]
      );
      
      // Merge and deduplicate
      const classIds = new Set(classes.map(c => c.id));
      classesByGradeSection.forEach(c => {
        if (!classIds.has(c.id)) {
          classes.push(c);
        }
      });
    }

    console.log('Found classes for adviser:', classes.length);
    res.json({
      success: true,
      data: classes
    });
  } catch (error) {
    console.error('Error fetching adviser classes:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getClassById = async (req, res) => {
  try {
    await ensureClassSchoolYearColumn();
    const activeSy = await resolveSchoolYear(req);
    const { id } = req.params;
    const classes = await query('SELECT * FROM classes WHERE id = ? AND school_year_id = ?', [id, activeSy.id]);
    
    if (classes.length === 0) {
      return res.status(404).json({ message: 'Class not found' });
    }

    res.json(classes[0]);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
};

exports.updateClass = async (req, res) => {
  try {
    await ensureClassSchoolYearColumn();
    const activeSy = await getActiveSchoolYear();
    const { id } = req.params;
    const { grade, section, adviserId } = req.body;

    const result = await query(
      'UPDATE classes SET grade = ?, section = ?, adviser_id = ? WHERE id = ? AND school_year_id = ?',
      [grade, section, adviserId || null, id, activeSy.id]
    );

    if (result.affectedRows === 0) {
      return res.status(403).json({ message: 'Cannot edit class in a non-active school year' });
    }

    res.json({ message: 'Class updated' });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
};

exports.deleteClass = async (req, res) => {
  try {
    await ensureClassSchoolYearColumn();
    const activeSy = await getActiveSchoolYear();
    const { id } = req.params;
    const result = await query('DELETE FROM classes WHERE id = ? AND school_year_id = ?', [id, activeSy.id]);
    if (result.affectedRows === 0) {
      return res.status(403).json({ message: 'Cannot delete class in a non-active school year' });
    }
    res.json({ message: 'Class deleted' });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
};

exports.getSubjectTeachers = async (req, res) => {
  try {
    await ensureSubjectTeacherSchoolYearColumn();
    const activeSy = await getActiveSchoolYear();
    const { id } = req.params;
    const teachers = await query(
      'SELECT st.*, u.firstName, u.lastName FROM subject_teachers st JOIN users u ON st.teacher_id = u.id WHERE st.class_id = ? AND st.school_year_id = ?',
      [id, activeSy.id]
    );
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.addSubjectTeacher = async (req, res) => {
  try {
    await ensureSubjectTeacherSchoolYearColumn();
    const activeSy = await getActiveSchoolYear();
    const { classId } = req.params;
    const { teacherId, subject } = req.body;

    const owningClass = await query('SELECT id FROM classes WHERE id = ? AND school_year_id = ?', [classId, activeSy.id]);
    if (!owningClass.length) {
      return res.status(403).json({ success: false, message: 'Cannot modify a class outside the active school year' });
    }

    try {
      await query(
        'INSERT INTO subject_teachers (class_id, teacher_id, subject, school_year_id, assignedAt) VALUES (?, ?, ?, ?, NOW())',
        [classId, teacherId, subject, activeSy.id]
      );
    } catch (err) {
      // If columns don't match, try alternate format
      if (err.message && err.message.includes("Unknown column")) {
        console.log('Table structure different, using basic insert');
        await query(
          'INSERT INTO subject_teachers (class_id, teacher_id, subject, school_year_id) VALUES (?, ?, ?, ?)',
          [classId, teacherId, subject, activeSy.id]
        );
      } else {
        throw err;
      }
    }

    res.status(201).json({ message: 'Subject teacher added', id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.assignAdviserToClass = async (req, res) => {
  try {
    await ensureClassSchoolYearColumn();
    const activeSy = await getActiveSchoolYear();
    const { classId } = req.params;
    const { adviser_id, adviser_name } = req.body;

    console.log('assignAdviserToClass - classId:', classId, 'adviser_id:', adviser_id, 'adviser_name:', adviser_name);

    // Update only adviser_id for now (skip adviser_name due to database issues)
    const result = await query(
      'UPDATE classes SET adviser_id = ? WHERE id = ? AND school_year_id = ?',
      [adviser_id, classId, activeSy.id]
    );

    if (result.affectedRows === 0) {
      return res.status(403).json({ success: false, message: 'Cannot edit adviser for a non-active school year' });
    }

    res.json({ 
      success: true, 
      message: 'Adviser assigned successfully',
      data: { adviser_id, adviser_name }
    });
  } catch (error) {
    console.error('Error in assignAdviserToClass:', error);
    res.status(500).json({ success: false, message: 'Error assigning adviser: ' + error.message });
  }
};

exports.unassignAdviser = async (req, res) => {
  try {
    await ensureClassSchoolYearColumn();
    const activeSy = await getActiveSchoolYear();
    const { classId } = req.params;

    console.log('unassignAdviser - classId:', classId);

    const result = await query(
      'UPDATE classes SET adviser_id = NULL WHERE id = ? AND school_year_id = ?',
      [classId, activeSy.id]
    );

    if (result.affectedRows === 0) {
      return res.status(403).json({ success: false, message: 'Cannot edit adviser for a non-active school year' });
    }

    res.json({ success: true, message: 'Adviser unassigned successfully' });
  } catch (error) {
    console.error('Error in unassignAdviser:', error);
    res.status(500).json({ success: false, message: 'Error unassigning adviser: ' + error.message });
  }
};

exports.assignSubjectTeacherToClass = async (req, res) => {
  try {
    await ensureSubjectTeacherSchoolYearColumn();
    const activeSy = await getActiveSchoolYear();
    const { classId } = req.params;
    const { teacher_id, teacher_name, subject, day, start_time, end_time } = req.body;

    const owningClass = await query('SELECT id FROM classes WHERE id = ? AND school_year_id = ?', [classId, activeSy.id]);
    if (!owningClass.length) {
      return res.status(403).json({ success: false, message: 'Cannot modify a class outside the active school year' });
    }

    console.log('assignSubjectTeacherToClass - classId:', classId, 'teacher_id:', teacher_id, 'subject:', subject, 'day:', day);

    // Try to insert with all fields first
    try {
      const result = await query(
        'INSERT INTO subject_teachers (class_id, teacher_id, teacher_name, subject, day, start_time, end_time, school_year_id, assignedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
        [classId, teacher_id, teacher_name, subject, day, start_time || '08:00', end_time || '09:00', activeSy.id]
      );
      
      res.json({ 
        success: true, 
        message: 'Subject teacher assigned successfully',
        data: { classId, teacher_id, teacher_name, subject, day }
      });
    } catch (err) {
      // If columns don't exist, try inserting without them
      if (err.message && err.message.includes("Unknown column")) {
        console.log('⚠️  Schedule columns (day, start_time, end_time) not found. Please run migration: fix_subject_teachers_columns.cjs');
        console.log('Proceeding with basic insert. Note: Schedule information will not be stored.');
        const result = await query(
          'INSERT INTO subject_teachers (class_id, teacher_id, teacher_name, subject, school_year_id, assignedAt) VALUES (?, ?, ?, ?, ?, NOW())',
          [classId, teacher_id, teacher_name, subject, activeSy.id]
        );
        
        res.json({ 
          success: true, 
          message: 'Subject teacher assigned (schedule columns not available in database yet)',
          warning: 'Please run database migration to store schedule information',
          data: { classId, teacher_id, teacher_name, subject, day }
        });
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.error('Error in assignSubjectTeacherToClass:', error);
    res.status(500).json({ success: false, message: 'Database error: ' + error.message });
  }
};

exports.unassignSubjectTeacher = async (req, res) => {
  try {
    await ensureSubjectTeacherSchoolYearColumn();
    const activeSy = await getActiveSchoolYear();
    const { classId, teacherId } = req.params;

    console.log('unassignSubjectTeacher - classId:', classId, 'teacherId:', teacherId);

    const result = await query(
      'DELETE FROM subject_teachers WHERE class_id = ? AND teacher_id = ? AND school_year_id = ?',
      [classId, teacherId, activeSy.id]
    );

    if (result.affectedRows === 0) {
      return res.status(403).json({ success: false, message: 'Cannot modify a class outside the active school year' });
    }

    res.json({ success: true, message: 'Subject teacher unassigned successfully' });
  } catch (error) {
    console.error('Error in unassignSubjectTeacher:', error);
    res.status(500).json({ success: false, message: 'Error unassigning subject teacher: ' + error.message });
  }
};

// List classes from previous school year for optional fetch
exports.getPreviousYearClasses = async (req, res) => {
  try {
    await ensureClassSchoolYearColumn();
    await ensureSubjectTeacherSchoolYearColumn();
    const targetSy = await resolveSchoolYear(req);
    const prevSy = await getPreviousSchoolYear(targetSy.start_date);
    if (!prevSy) return res.json({ success: true, data: [] });

    const classes = await query(
      'SELECT * FROM classes WHERE school_year_id = ? ORDER BY grade, section',
      [prevSy.id]
    );

    // Fetch subject teachers for these classes
    const classIds = classes.map((c) => c.id);
    let subjectTeachers = [];
    if (classIds.length) {
      subjectTeachers = await query(
        `SELECT * FROM subject_teachers WHERE school_year_id = ? AND class_id IN (?)`,
        [prevSy.id, classIds]
      );
    }

    const classesWithTeachers = classes.map((cls) => ({
      ...cls,
      subject_teachers: subjectTeachers.filter((st) => st.class_id === cls.id)
    }));

    res.json({ success: true, data: classesWithTeachers, meta: { sourceSchoolYearId: prevSy.id, targetSchoolYearId: targetSy.id } });
  } catch (error) {
    console.error('Error fetching previous year classes:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch previous year classes' });
  }
};

// Copy selected classes (and subject teacher assignments) from previous year into active year
exports.fetchClassesFromPreviousYear = async (req, res) => {
  try {
    await ensureClassSchoolYearColumn();
    await ensureSubjectTeacherSchoolYearColumn();
    const targetSy = await resolveSchoolYear(req);
    await assertActiveTargetSchoolYear(targetSy);
    const prevSy = await getPreviousSchoolYear(targetSy.start_date);
    if (!prevSy) {
      return res.status(400).json({ success: false, message: 'No previous school year found to fetch from' });
    }

    const { ids } = req.body || {};
    const idList = Array.isArray(ids) && ids.length > 0 ? ids : null;

    const prevClasses = await query(
      `SELECT * FROM classes WHERE school_year_id = ? ${idList ? 'AND id IN (?)' : ''} ORDER BY grade, section`,
      idList ? [prevSy.id, idList] : [prevSy.id]
    );

    if (!prevClasses.length) {
      return res.json({ success: true, message: 'Nothing to fetch', data: { inserted: 0, skipped: 0 } });
    }

    // Preload subject teachers for all previous classes
    const prevClassIds = prevClasses.map((c) => c.id);
    let prevSubjectTeachers = [];
    if (prevClassIds.length) {
      prevSubjectTeachers = await query(
        `SELECT * FROM subject_teachers WHERE school_year_id = ? AND class_id IN (?)`,
        [prevSy.id, prevClassIds]
      );
    }

    let inserted = 0;
    let skipped = 0;

    for (const cls of prevClasses) {
      const dup = await query(
        'SELECT id FROM classes WHERE grade = ? AND section = ? AND school_year_id = ?',
        [cls.grade, cls.section, targetSy.id]
      );
      if (dup.length) {
        skipped += 1;
        continue;
      }

      const newId = uuidv4();
      await query(
        'INSERT INTO classes (id, grade, section, adviser_id, adviser_name, school_year_id, createdAt) VALUES (?, ?, ?, ?, ?, ?, NOW())',
        [newId, cls.grade, cls.section, cls.adviser_id || null, cls.adviser_name || null, targetSy.id]
      );

      const teachersForClass = prevSubjectTeachers.filter((st) => st.class_id === cls.id);
      for (const st of teachersForClass) {
        try {
          await query(
            'INSERT INTO subject_teachers (class_id, teacher_id, teacher_name, subject, day, start_time, end_time, school_year_id, assignedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
            [newId, st.teacher_id, st.teacher_name, st.subject, st.day || null, st.start_time || null, st.end_time || null, targetSy.id]
          );
        } catch (err) {
          if (err.message && err.message.includes('Unknown column')) {
            await query(
              'INSERT INTO subject_teachers (class_id, teacher_id, teacher_name, subject, school_year_id, assignedAt) VALUES (?, ?, ?, ?, ?, NOW())',
              [newId, st.teacher_id, st.teacher_name, st.subject, targetSy.id]
            );
          } else {
            throw err;
          }
        }
      }

      inserted += 1;
    }

    res.json({
      success: true,
      message: 'Fetch complete',
      data: { inserted, skipped, sourceSchoolYearId: prevSy.id, targetSchoolYearId: targetSy.id }
    });
  } catch (error) {
    console.error('Error fetching classes from previous year:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch classes from previous year' });
  }
};
