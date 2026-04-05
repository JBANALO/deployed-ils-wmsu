// server/controllers/classControllerWithRoleFilter.js
// MySQL-based class controller with role-based filtering and school-year scoping
// Returns ONLY the classes a teacher is assigned to (as adviser or subject teacher)

const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

let classesSchemaChecked = false;
let classesHasSchoolYearColumn = false;

const getActiveSchoolYear = async () => {
  const [rows] = await pool.query(
    'SELECT id, label, start_date FROM school_years WHERE is_active = 1 AND is_archived = 0 LIMIT 1'
  );
  if (!rows.length) throw new Error('No active school year found');
  return rows[0];
};

const getSchoolYearById = async (schoolYearId) => {
  if (!schoolYearId) return null;
  const [rows] = await pool.query(
    'SELECT id, label, start_date FROM school_years WHERE id = ? AND is_archived = 0 LIMIT 1',
    [schoolYearId]
  );
  return rows[0] || null;
};

const resolveSchoolYear = async (req) => {
  const requestedId = req?.query?.schoolYearId || req?.body?.schoolYearId;
  if (requestedId) {
    const sy = await getSchoolYearById(requestedId);
    if (sy) return sy;
  }
  return getActiveSchoolYear();
};

const ensureClassAssignmentsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS class_assignments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      grade_level VARCHAR(50) NOT NULL,
      section VARCHAR(100) NOT NULL,
      adviser_id VARCHAR(255) NOT NULL,
      adviser_name VARCHAR(255) DEFAULT '',
      school_year_id INT NULL,
      INDEX idx_class_assignments_school_year (school_year_id)
    )
  `);

  try {
    const [columns] = await pool.query('SHOW COLUMNS FROM class_assignments');
    const hasSchoolYearId = columns.some((column) => column.Field === 'school_year_id');
    if (!hasSchoolYearId) {
      await pool.query('ALTER TABLE class_assignments ADD COLUMN school_year_id INT NULL');
      await pool.query('CREATE INDEX idx_class_assignments_school_year ON class_assignments (school_year_id)');
    }
  } catch (error) {
    console.log('ensureClassAssignmentsTable schema update skipped:', error.message);
  }
};

const ensureClassesSchoolYearColumn = async () => {
  if (classesSchemaChecked) return;

  try {
    const [columns] = await pool.query('SHOW COLUMNS FROM classes');
    classesHasSchoolYearColumn = columns.some((column) => column.Field === 'school_year_id');

    if (!classesHasSchoolYearColumn) {
      try {
        await pool.query('ALTER TABLE classes ADD COLUMN school_year_id INT NULL');
        await pool.query('CREATE INDEX idx_classes_school_year ON classes (school_year_id)');
        classesHasSchoolYearColumn = true;
      } catch (alterError) {
        console.log('ensureClassesSchoolYearColumn alter skipped:', alterError.message);
      }
    }
  } catch (error) {
    console.log('ensureClassesSchoolYearColumn check skipped:', error.message);
    classesHasSchoolYearColumn = false;
  }

  classesSchemaChecked = true;
};

const getPreviousSchoolYear = async (activeStartDate) => {
  const [rows] = await pool.query(
    'SELECT id, label, start_date FROM school_years WHERE is_archived = 0 AND start_date < ? ORDER BY start_date DESC LIMIT 1',
    [activeStartDate]
  );
  return rows[0] || null;
};

/**
 * Get classes visible to a specific teacher based on their role
 * - If adviser: shows the class they advise
 * - If subject teacher: shows classes where they teach specific subjects
 * - If neither: shows empty list
 */
const getTeacherVisibleClasses = async (req, res) => {
  try {
    await ensureClassesSchoolYearColumn();
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'userId required' 
      });
    }

    console.log(`getTeacherVisibleClasses - userId: ${userId}`);

    // Try to get from database first
    try {
      const targetSy = await resolveSchoolYear(req);
      // Get the user to check their role
      const [userRows] = await pool.query(
        `SELECT id, firstName, lastName, role, gradeLevel, section FROM users WHERE id = ?`,
        [userId]
      );

      if (!userRows || userRows.length === 0) {
        console.log(`User ${userId} not found in database`);
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      const user = userRows[0];
      console.log(`Found user: ${user.firstName} ${user.lastName} (role: ${user.role})`);

      let visibleClasses = [];

      // If adviser: get the class they advise
      if (user.role === 'adviser' || user.role === 'teacher') {
        const [adviserClasses] = await pool.query(
          `SELECT c.* FROM classes c WHERE c.adviser_id = ? AND c.school_year_id = ?`,
          [userId, targetSy.id]
        );

        visibleClasses = adviserClasses.map(cls => ({
          ...cls,
          role_in_class: 'adviser'
        }));

        console.log(`Found ${visibleClasses.length} classes as adviser`);
      }

      // If subject teacher: get classes where they teach
      if (user.role === 'subject_teacher' || user.role === 'teacher') {
        const [teacherClasses] = await pool.query(
          `SELECT DISTINCT c.*,
                  GROUP_CONCAT(DISTINCT st.subject) as subjects_teaching
           FROM classes c
           JOIN subject_teachers st ON c.id = st.class_id
           WHERE st.teacher_id = ? AND st.school_year_id = ?
           GROUP BY c.id`,
          [userId, targetSy.id]
        );

        const subjectTeacherClasses = teacherClasses.map(cls => ({
          ...cls,
          role_in_class: 'subject_teacher'
        }));

        // Combine and deduplicate
        visibleClasses = [...visibleClasses, ...subjectTeacherClasses];

        console.log(`Found ${subjectTeacherClasses.length} classes as subject teacher`);
      }

      // Fetch subject_teachers details for all visible classes
      for (let i = 0; i < visibleClasses.length; i++) {
        try {
          const [stRows] = await pool.query(
            `SELECT teacher_id, teacher_name, subject, day, start_time, end_time FROM subject_teachers WHERE class_id = ? AND school_year_id = ?`,
            [visibleClasses[i].id, targetSy.id]
          );
          visibleClasses[i].subject_teachers = stRows;
        } catch (e) {
          visibleClasses[i].subject_teachers = [];
        }
      }

      console.log(`Total visible classes for user ${userId}: ${visibleClasses.length}`);
      
      return res.json({ 
        success: true, 
        data: visibleClasses,
        user_role: user.role,
        message: `${visibleClasses.length} classes visible to this user`
      });

    } catch (dbError) {
      console.log('Database query failed in getTeacherVisibleClasses:', dbError.message);
      const visibleClasses = [];

      console.log(`Fallback: Found ${visibleClasses.length} classes for user ${userId}`);
      
      return res.json({ 
        success: true, 
        data: visibleClasses,
        message: `${visibleClasses.length} classes visible to this user (file-based)`
      });
    }

  } catch (error) {
    console.error('Error in getTeacherVisibleClasses:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching teacher classes: ' + error.message 
    });
  }
};

/**
 * Get all classes (admin view - for admin pages)
 */
const getAllClasses = async (req, res) => {
  try {
    await ensureClassesSchoolYearColumn();
    await ensureClassAssignmentsTable();
    console.log('getAllClasses - attempting database connection');

    try {
      const targetSy = await resolveSchoolYear(req);
      // Try database first - query classes table with subject_teachers
      const [rows] = await pool.query(
        `SELECT c.* FROM classes c WHERE c.school_year_id = ? ORDER BY c.grade, c.section`,
        [targetSy.id]
      );

      console.log(`Database: Found ${rows.length} classes`);
      
      // If classes table has data, fetch subject_teachers for each class
      if (rows.length > 0) {
        const normalizeGrade = (value = '') => String(value).trim().toLowerCase().replace(/^grade\s+/i, '').replace(/\s+/g, ' ');
        const normalizeSection = (value = '') => String(value).trim().toLowerCase().replace(/\s+/g, ' ');
        const normalizeClassId = (value = '') => String(value).trim().toLowerCase();
        const classKey = (grade, section) => `${normalizeGrade(grade)}::${normalizeSection(section)}`;
        const classSlug = (grade, section) => `${String(grade || '').toLowerCase().replace(/\s+/g, '-')}-${String(section || '').toLowerCase().replace(/\s+/g, '-')}`;

        // Try to fetch subject_teachers
        let subjectTeachersMap = {};
        let classAssignmentsMap = {};
        try {
          const [stRows] = await pool.query(
            `SELECT class_id, teacher_id, teacher_name, subject, day, start_time, end_time
             FROM subject_teachers
             WHERE school_year_id = ?`,
            [targetSy.id]
          );
          stRows.forEach(st => {
            const idKey = normalizeClassId(st.class_id);
            if (!subjectTeachersMap[idKey]) subjectTeachersMap[idKey] = [];
            subjectTeachersMap[idKey].push(st);
          });
        } catch (stError) {
          console.log('Could not fetch subject_teachers:', stError.message);
        }

        // Merge adviser assignment history for the selected school year
        try {
          const [caRows] = await pool.query(
            `SELECT class_id, grade_level, section, adviser_id, adviser_name
             FROM class_assignments
             WHERE school_year_id = ?`,
            [targetSy.id]
          );
          caRows.forEach((ca) => {
            if (ca.class_id) {
              classAssignmentsMap[`id:${normalizeClassId(ca.class_id)}`] = ca;
            }
            if (ca.grade_level && ca.section) {
              classAssignmentsMap[`gs:${classKey(ca.grade_level, ca.section)}`] = ca;
            }
          });
        } catch (caError) {
          console.log('Could not fetch class_assignments:', caError.message);
        }

        const classesWithST = rows.map((cls) => {
          const idKey = `id:${normalizeClassId(cls.id)}`;
          const slugKey = `id:${normalizeClassId(classSlug(cls.grade, cls.section))}`;
          const gsKey = `gs:${classKey(cls.grade, cls.section)}`;
          const classAssignment = classAssignmentsMap[idKey] || classAssignmentsMap[slugKey] || classAssignmentsMap[gsKey] || null;

          const stById = subjectTeachersMap[normalizeClassId(cls.id)] || [];
          const stBySlug = subjectTeachersMap[normalizeClassId(classSlug(cls.grade, cls.section))] || [];
          const mergedSubjectTeachers = [...stById, ...stBySlug];

          return {
            ...cls,
            adviser_id: cls.adviser_id || classAssignment?.adviser_id || null,
            adviser_name: cls.adviser_name || classAssignment?.adviser_name || '',
            subject_teachers: mergedSubjectTeachers
          };
        });

        return res.json({ 
          success: true, 
          data: classesWithST
        });
      }
      // Otherwise fall through to generate from students table
      throw new Error('classes table is empty, falling back to students table');

    } catch (dbError) {
      console.log('classes table not available, generating from students:', dbError.message);
      
      // Fallback: generate classes from students table
      try {
        const targetSy = await resolveSchoolYear(req);
        const normalizeGrade = (value = '') => String(value).trim().toLowerCase().replace(/^grade\s+/i, '').replace(/\s+/g, ' ');
        const normalizeSection = (value = '') => String(value).trim().toLowerCase().replace(/\s+/g, ' ');
        const classKey = (grade, section) => `${normalizeGrade(grade)}::${normalizeSection(section)}`;
        const slugKey = (grade, section) => `${String(grade || '').toLowerCase().replace(/\s+/g, '-')}-${String(section || '').toLowerCase().replace(/\s+/g, '-')}`;
        const normalizeClassId = (value = '') => String(value).trim().toLowerCase().replace(/\s+/g, '-');

        const [studentRows] = await pool.query(
          `SELECT grade_level, section, COUNT(*) as student_count FROM students WHERE school_year_id = ? GROUP BY grade_level, section ORDER BY grade_level, section`,
          [targetSy.id]
        );

        // Fetch advisers from teachers table (has grade_level + section columns)
        let adviserRows = [];
        try {
          const [ar] = await pool.query(
            `SELECT id, first_name, last_name, grade_level, section
             FROM teachers
             WHERE role IN ('adviser', 'Adviser', 'teacher', 'subject_teacher')
               AND grade_level IS NOT NULL
               AND section IS NOT NULL
               AND school_year_id = ?`,
            [targetSy.id]
          );
          adviserRows = ar;
        } catch (e) {
          console.log('Could not fetch advisers from teachers table:', e.message);
        }

        // Also fetch from class_assignments (stores UUID-based assignments from file system advisers)
        let caRows = [];
        try {
          const [ca] = await pool.query(
            `SELECT grade_level, section, adviser_id, adviser_name
             FROM class_assignments
             WHERE school_year_id = ?`,
            [targetSy.id]
          );
          caRows = ca;
        } catch (e) { /* table may not exist yet */ }

        // Pull subject teacher assignments so previous-year cards can display historical entries.
        let subjectTeacherRows = [];
        try {
          const [st] = await pool.query(
            `SELECT class_id, teacher_id, teacher_name, subject, day, start_time, end_time
             FROM subject_teachers
             WHERE school_year_id = ?`,
            [targetSy.id]
          );
          subjectTeacherRows = st;
        } catch (e) { /* table may not exist yet */ }

        const subjectTeachersByClassKey = {};
        subjectTeacherRows.forEach((st) => {
          const key = normalizeClassId(st.class_id || '');
          if (!key) return;
          if (!subjectTeachersByClassKey[key]) subjectTeachersByClassKey[key] = [];
          subjectTeachersByClassKey[key].push(st);
        });
        
        const gradeOrder = { 'Kindergarten': 0, 'Grade 1': 1, 'Grade 2': 2, 'Grade 3': 3, 'Grade 4': 4, 'Grade 5': 5, 'Grade 6': 6 };
        const classes = studentRows.map(row => {
          const gradeSlug = (row.grade_level || '').toLowerCase().replace(/\s+/g, '-');
          const sectionSlug = (row.section || '').toLowerCase().replace(/\s+/g, '-');
          // Find matching adviser: class_assignments takes priority (most recent assignment)
          const caMatch = caRows.find(ca => classKey(ca.grade_level, ca.section) === classKey(row.grade_level, row.section));
          const adviser = adviserRows.find(u =>
            classKey(u.grade_level, u.section) === classKey(row.grade_level, row.section)
          );
          const adviserId = caMatch ? caMatch.adviser_id : (adviser ? adviser.id : null);
          const adviserName = caMatch ? caMatch.adviser_name :
            (adviser ? `${adviser.first_name || ''} ${adviser.last_name || ''}`.trim() : '');

          const classSlug = normalizeClassId(slugKey(row.grade_level, row.section));
          const subjectTeachers = [
            ...(subjectTeachersByClassKey[classSlug] || []),
            ...(subjectTeachersByClassKey[normalizeClassId(classKey(row.grade_level, row.section))] || [])
          ];

          return {
            id: `${gradeSlug}-${sectionSlug}`,
            grade: row.grade_level,
            section: row.section,
            student_count: row.student_count,
            adviser_id: adviserId,
            adviser_name: adviserName,
            subject_teachers: subjectTeachers
          };
        }).sort((a, b) => {
          const ao = gradeOrder[a.grade] ?? 99;
          const bo = gradeOrder[b.grade] ?? 99;
          if (ao !== bo) return ao - bo;
          return (a.section || '').localeCompare(b.section || '');
        });

        console.log(`Generated ${classes.length} classes from students table`);
        return res.json({ success: true, data: classes });

      } catch (studentsError) {
        console.log('Students table also unavailable, using file-based system:', studentsError.message);
        // Last resort: file-based
        return res.json({ success: true, data: [], message: 'No classes data available' });
      }
    }

  } catch (error) {
    console.error('Error in getAllClasses:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching classes: ' + error.message 
    });
  }
};

/**
 * Get classes for a specific adviser
 */
const getAdviserClasses = async (req, res) => {
  try {
    await ensureClassesSchoolYearColumn();
    await ensureClassAssignmentsTable();
    const { adviserId } = req.params;
    const targetSy = await resolveSchoolYear(req);
    console.log(`getAdviserClasses - adviserId: ${adviserId}`);

    try {
      // First try direct match on classes.adviser_id
      const [rows] = await pool.query(
        `SELECT c.* FROM classes c WHERE c.adviser_id = ? AND c.school_year_id = ?`,
        [adviserId, targetSy.id]
      );

      console.log(`Database: Found ${rows.length} classes for adviser ${adviserId} (direct match)`);

      if (rows.length > 0) {
        return res.json({ success: true, data: rows });
      }

      // Fallback: look up teacher in teachers table by id, match class by grade_level+section
      const [teachers] = await pool.query(
        `SELECT id, first_name, last_name, grade_level, section FROM teachers WHERE id = ?`,
        [adviserId]
      );

      if (teachers.length > 0) {
        const teacher = teachers[0];
        console.log(`Found teacher: ${teacher.first_name} ${teacher.last_name}, grade_level: ${teacher.grade_level}, section: ${teacher.section}`);

        if (teacher.grade_level && teacher.section) {
          const [classRows] = await pool.query(
            `SELECT c.* FROM classes c WHERE c.grade = ? AND c.section = ? AND c.school_year_id = ?`,
            [teacher.grade_level, teacher.section, targetSy.id]
          );

          console.log(`Matched ${classRows.length} class(es) by grade_level+section for teacher ${adviserId}`);

          // Stamp adviser info onto the result so frontend knows it's assigned
          const enriched = classRows.map(cls => ({
            ...cls,
            adviser_id: adviserId,
            adviser_name: `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim()
          }));

          return res.json({ success: true, data: enriched });
        }
      }

      // No match found at all
      console.log(`No classes found for adviser ${adviserId}`);

      // Final fallback: match by adviser_name for cases where IDs are mismatched (UUID vs numeric)
      try {
        const [teacherRows] = await pool.query(
          `SELECT id, first_name, last_name FROM teachers WHERE id = ?`,
          [adviserId]
        );
        if (teacherRows.length > 0) {
          const t = teacherRows[0];
          const fullName = `${t.first_name || ''} ${t.last_name || ''}`.trim();
          const [nameMatchRows] = await pool.query(
            `SELECT c.* FROM classes c WHERE (c.adviser_name LIKE ? OR c.adviser_name LIKE ?) AND c.school_year_id = ?`,
            [`%${t.first_name}%${t.last_name}%`, `%${t.last_name}%${t.first_name}%`, targetSy.id]
          );
          if (nameMatchRows.length > 0) {
            console.log(`Name fallback matched ${nameMatchRows.length} class(es) for adviser '${fullName}'`);
            // Also fix the stale adviser_id in classes table so future lookups work by ID
            await pool.query(
              `UPDATE classes SET adviser_id = ? WHERE (adviser_name LIKE ? OR adviser_name LIKE ?) AND school_year_id = ?`,
              [String(adviserId), `%${t.first_name}%${t.last_name}%`, `%${t.last_name}%${t.first_name}%`, targetSy.id]
            );
            const enriched = nameMatchRows.map(cls => ({ ...cls, adviser_id: String(adviserId), adviser_name: fullName }));
            return res.json({ success: true, data: enriched });
          }
        }
      } catch (nameErr) {
        console.log('Name fallback error:', nameErr.message);
      }

      return res.json({ success: true, data: [] });

    } catch (dbError) {
      console.log('DB error in getAdviserClasses:', dbError.message);
      return res.json({ success: true, data: [] });
    }

  } catch (error) {
    console.error('Error in getAdviserClasses:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching adviser classes: ' + error.message 
    });
  }
};

/**
 * Get classes where a specific subject teacher teaches
 */
const getSubjectTeacherClasses = async (req, res) => {
  try {
    await ensureClassesSchoolYearColumn();
    const { userId } = req.params;
    const targetSy = await resolveSchoolYear(req);
    console.log(`getSubjectTeacherClasses - userId: ${userId}`);

    try {
      const [rows] = await pool.query(
        `SELECT DISTINCT c.*,
                GROUP_CONCAT(DISTINCT st.subject) as subjects_teaching
         FROM classes c
         JOIN subject_teachers st
           ON (
             LOWER(TRIM(CAST(c.id AS CHAR))) = LOWER(TRIM(st.class_id))
             OR LOWER(REPLACE(CONCAT(TRIM(c.grade), '-', TRIM(c.section)), ' ', '-')) = LOWER(REPLACE(TRIM(st.class_id), ' ', '-'))
           )
         WHERE st.teacher_id = ?
           AND st.school_year_id = ?
           AND c.school_year_id = ?
         GROUP BY c.id`,
        [userId, targetSy.id, targetSy.id]
      );

      console.log(`Database: Found ${rows.length} classes for subject teacher ${userId}`);
      
      return res.json({ success: true, data: rows });

    } catch (dbError) {
      console.log('DB error in getSubjectTeacherClasses:', dbError.message);
      return res.json({ success: true, data: [] });
    }

  } catch (error) {
    console.error('Error in getSubjectTeacherClasses:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching subject teacher classes: ' + error.message 
    });
  }
};

/**
 * Assign adviser to a class
 */
const assignAdviserToClass = async (req, res) => {
  try {
    await ensureClassesSchoolYearColumn();
    await ensureClassAssignmentsTable();
    const { classId } = req.params;
    const { adviser_id, adviser_name, grade, section } = req.body;
    const targetSy = await resolveSchoolYear(req);
    const gradeLevel = grade;
    const classSection = section;

    console.log(`assignAdviserToClass - classId: ${classId}, adviser_id: ${adviser_id}, adviser_name: ${adviser_name}, grade: ${gradeLevel}, section: ${classSection}`);

    if (!adviser_id || !gradeLevel || !classSection) {
      return res.status(400).json({ success: false, message: 'adviser_id, grade, and section are required' });
    }

    await ensureClassAssignmentsTable();

    const [existingAssignmentRows] = await pool.query(
      `SELECT id FROM class_assignments
       WHERE grade_level = ? AND section = ? AND school_year_id = ?
       ORDER BY id DESC LIMIT 1`,
      [gradeLevel, classSection, targetSy.id]
    );

    if (existingAssignmentRows.length > 0) {
      await pool.query(
        `UPDATE class_assignments
         SET adviser_id = ?, adviser_name = ?, school_year_id = ?
         WHERE id = ?`,
        [String(adviser_id), adviser_name || '', targetSy.id, existingAssignmentRows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO class_assignments (grade_level, section, adviser_id, adviser_name, school_year_id)
         VALUES (?, ?, ?, ?, ?)`,
        [gradeLevel, classSection, String(adviser_id), adviser_name || '', targetSy.id]
      );
    }

    // ALSO update the classes table (critical for frontend display)
    try {
      await pool.query(
        `UPDATE classes SET adviser_id = ?, adviser_name = ? WHERE grade = ? AND section = ? AND school_year_id = ?`,
        [String(adviser_id), adviser_name || '', gradeLevel, classSection, targetSy.id]
      );
      console.log('✅ Updated classes table');
    } catch(e) { 
      console.log('Could not update classes table:', e.message); 
    }

    // Also try to update teachers table if adviser_id is an integer
    const numericId = parseInt(adviser_id);
    if (!isNaN(numericId) && String(numericId) === String(adviser_id)) {
      try {
        await pool.query(
          `UPDATE teachers SET grade_level = ?, section = ? WHERE id = ? AND school_year_id = ?`,
          [gradeLevel, classSection, numericId, targetSy.id]
        );
      } catch(e) { console.log('Could not update teachers table:', e.message); }
    }

    return res.json({ 
      success: true, 
      message: 'Adviser assigned successfully',
      data: { classId, adviser_id, adviser_name, grade: gradeLevel, section: classSection }
    });

  } catch (error) {
    console.error('Error in assignAdviserToClass:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error assigning adviser: ' + error.message 
    });
  }
};

/**
 * Unassign adviser from a class
 */
const unassignAdviserFromClass = async (req, res) => {
  try {
    await ensureClassesSchoolYearColumn();
    await ensureClassAssignmentsTable();
    const { classId } = req.params;
    const { adviser_id, grade, section } = req.body;
    const targetSy = await resolveSchoolYear(req);

    console.log(`unassignAdviserFromClass - classId: ${classId}, adviser_id: ${adviser_id}, grade: ${grade}, section: ${section}`);

    if (adviser_id) {
      // Remove from class_assignments
      try {
        await ensureClassAssignmentsTable();
        await pool.query(
          `DELETE FROM class_assignments WHERE adviser_id = ? AND school_year_id = ?`,
          [String(adviser_id), targetSy.id]
        );
      } catch(e) { /* table may not exist */ }
      // Also clear from teachers table if numeric ID
      const numericId = parseInt(adviser_id);
      if (!isNaN(numericId) && String(numericId) === String(adviser_id)) {
        try {
          await pool.query(
            `UPDATE teachers SET grade_level = NULL, section = NULL WHERE id = ? AND school_year_id = ?`,
            [numericId, targetSy.id]
          );
        } catch(e) { /* ignore */ }
      }
    } else {
      try {
        await ensureClassAssignmentsTable();
        await pool.query(
          `DELETE FROM class_assignments WHERE LOWER(REPLACE(CONCAT(grade_level, '-', section), ' ', '-')) = ? AND school_year_id = ?`,
          [classId, targetSy.id]
        );
      } catch(e) { /* table may not exist */ }
    }

    // ALSO clear from classes table (critical for frontend display)
    try {
      if (grade && section) {
        await pool.query(
          `UPDATE classes SET adviser_id = NULL, adviser_name = NULL WHERE grade = ? AND section = ? AND school_year_id = ?`,
          [grade, section, targetSy.id]
        );
      } else if (classId) {
        // Parse classId to get grade and section
        await pool.query(
          `UPDATE classes SET adviser_id = NULL, adviser_name = NULL WHERE id = ? AND school_year_id = ?`,
          [classId, targetSy.id]
        );
      }
      console.log('✅ Cleared adviser from classes table');
    } catch(e) { 
      console.log('Could not update classes table:', e.message); 
    }

    return res.json({ success: true, message: 'Adviser unassigned successfully' });

  } catch (error) {
    console.error('Error in unassignAdviserFromClass:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error unassigning adviser: ' + error.message 
    });
  }
};

/**
 * Assign a subject teacher to a class
 */
const assignSubjectTeacher = async (req, res) => {
  try {
    await ensureClassesSchoolYearColumn();
    const { classId } = req.params;
    const { teacher_id, teacher_name, subject, day, start_time, end_time } = req.body;
    const targetSy = await resolveSchoolYear(req);
    const assignmentDay = day || 'Monday';
    const assignmentStart = start_time || '08:00';
    const assignmentEnd = end_time || '09:00';

    console.log(`assignSubjectTeacher - classId: ${classId}, teacher_id: ${teacher_id}, subject: ${subject}`);

    if (!teacher_id || !subject) {
      return res.status(400).json({ 
        success: false, 
        message: 'teacher_id and subject are required' 
      });
    }

    if (assignmentStart >= assignmentEnd) {
      return res.status(400).json({
        success: false,
        message: 'End time must be later than start time'
      });
    }

    // Ensure subject_teachers table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subject_teachers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        class_id VARCHAR(100) NOT NULL,
        teacher_id VARCHAR(255) NOT NULL,
        teacher_name VARCHAR(255),
        subject VARCHAR(100) NOT NULL,
        school_year_id INT NULL,
        day VARCHAR(20) DEFAULT 'Monday',
        start_time VARCHAR(10) DEFAULT '08:00',
        end_time VARCHAR(10) DEFAULT '09:00',
        assignedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_assignment (class_id, teacher_id, subject, school_year_id)
      )
    `);

    try {
      const [columns] = await pool.query('SHOW COLUMNS FROM subject_teachers');
      const hasSchoolYearId = columns.some((column) => column.Field === 'school_year_id');
      if (!hasSchoolYearId) {
        await pool.query('ALTER TABLE subject_teachers ADD COLUMN school_year_id INT NULL');
      }
    } catch (columnError) {
      console.log('subject_teachers school_year_id check skipped:', columnError.message);
    }

    // Check for class-level schedule conflict on the same day/time
    const classConflictSql = classesHasSchoolYearColumn
      ? `SELECT c.grade, c.section, st.teacher_name, st.subject, st.day, st.start_time, st.end_time
         FROM subject_teachers st
         JOIN classes c ON st.class_id = c.id
         WHERE st.class_id = ? AND st.day = ? AND st.school_year_id = ? AND c.school_year_id = ?
         AND NOT (st.end_time <= ? OR st.start_time >= ?)`
      : `SELECT c.grade, c.section, st.teacher_name, st.subject, st.day, st.start_time, st.end_time
         FROM subject_teachers st
         JOIN classes c ON st.class_id = c.id
         WHERE st.class_id = ? AND st.day = ? AND st.school_year_id = ?
         AND NOT (st.end_time <= ? OR st.start_time >= ?)`;
    const classConflictParams = classesHasSchoolYearColumn
      ? [classId, assignmentDay, targetSy.id, targetSy.id, assignmentStart, assignmentEnd]
      : [classId, assignmentDay, targetSy.id, assignmentStart, assignmentEnd];
    const [classConflicts] = await pool.query(classConflictSql, classConflictParams);

    if (classConflicts.length > 0) {
      const conflict = classConflicts[0];
      return res.status(400).json({
        success: false,
        message: `Time conflict: ${conflict.teacher_name || 'Another teacher'} already teaches ${conflict.subject} in ${conflict.grade} - ${conflict.section} on ${conflict.day} from ${conflict.start_time} to ${conflict.end_time}`
      });
    }

    // Check for teacher-level schedule conflict on the same day/time across any class
    const teacherConflictSql = classesHasSchoolYearColumn
      ? `SELECT c.grade, c.section, st.subject, st.day, st.start_time, st.end_time
         FROM subject_teachers st
         JOIN classes c ON st.class_id = c.id
         WHERE st.teacher_id = ? AND st.day = ? AND st.school_year_id = ? AND c.school_year_id = ?
         AND NOT (st.end_time <= ? OR st.start_time >= ?)`
      : `SELECT c.grade, c.section, st.subject, st.day, st.start_time, st.end_time
         FROM subject_teachers st
         JOIN classes c ON st.class_id = c.id
         WHERE st.teacher_id = ? AND st.day = ? AND st.school_year_id = ?
         AND NOT (st.end_time <= ? OR st.start_time >= ?)`;
    const teacherConflictParams = classesHasSchoolYearColumn
      ? [teacher_id, assignmentDay, targetSy.id, targetSy.id, assignmentStart, assignmentEnd]
      : [teacher_id, assignmentDay, targetSy.id, assignmentStart, assignmentEnd];
    const [teacherConflicts] = await pool.query(teacherConflictSql, teacherConflictParams);

    if (teacherConflicts.length > 0) {
      const conflict = teacherConflicts[0];
      return res.status(400).json({
        success: false,
        message: `Time conflict: Teacher is already assigned to ${conflict.grade} - ${conflict.section} (${conflict.subject}) on ${conflict.day} from ${conflict.start_time} to ${conflict.end_time}`
      });
    }

    // Check if already assigned
    const [existing] = await pool.query(
      `SELECT id FROM subject_teachers WHERE class_id = ? AND teacher_id = ? AND subject = ? AND school_year_id = ?`,
      [classId, teacher_id, subject, targetSy.id]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'This teacher is already assigned to this class for this subject'
      });
    }

    // Insert new assignment
    await pool.query(
      `INSERT INTO subject_teachers (class_id, teacher_id, teacher_name, subject, school_year_id, day, start_time, end_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [classId, teacher_id, teacher_name || '', subject, targetSy.id, assignmentDay, assignmentStart, assignmentEnd]
    );

    console.log('✅ Subject teacher assigned successfully');
    
    return res.json({
      success: true,
      message: 'Subject teacher assigned successfully',
      data: { classId, teacher_id, teacher_name, subject, day: assignmentDay, start_time: assignmentStart, end_time: assignmentEnd }
    });

  } catch (error) {
    console.error('Error in assignSubjectTeacher:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning subject teacher: ' + error.message
    });
  }
};

/**
 * Unassign a subject teacher from a class
 */
const unassignSubjectTeacher = async (req, res) => {
  try {
    await ensureClassesSchoolYearColumn();
    const { classId, teacherId } = req.params;
    const targetSy = await resolveSchoolYear(req);

    console.log(`unassignSubjectTeacher - classId: ${classId}, teacherId: ${teacherId}`);

    await pool.query(
      `DELETE FROM subject_teachers WHERE class_id = ? AND teacher_id = ? AND school_year_id = ?`,
      [classId, teacherId, targetSy.id]
    );

    console.log('✅ Subject teacher unassigned successfully');
    
    return res.json({
      success: true,
      message: 'Subject teacher unassigned successfully'
    });

  } catch (error) {
    console.error('Error in unassignSubjectTeacher:', error);
    res.status(500).json({
      success: false,
      message: 'Error unassigning subject teacher: ' + error.message
    });
  }
};

// List classes from the previous (non-archived) school year
const getPreviousYearClasses = async (req, res) => {
  try {
    await ensureClassesSchoolYearColumn();
    const targetSy = await resolveSchoolYear(req);
    const prevSy = await getPreviousSchoolYear(targetSy.start_date);
    if (!prevSy) {
      return res.json({ success: true, data: [], meta: { sourceSchoolYearId: null, targetSchoolYearId: targetSy.id } });
    }

    const [prevClasses] = await pool.query(
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
const fetchClassesFromPreviousYear = async (req, res) => {
  try {
    await ensureClassesSchoolYearColumn();
    const targetSy = await resolveSchoolYear(req);
    const activeSy = await getActiveSchoolYear();
    if (!targetSy || targetSy.id !== activeSy.id) {
      return res.status(400).json({ success: false, message: 'Edits are only allowed in the active school year' });
    }

    const prevSy = await getPreviousSchoolYear(targetSy.start_date);
    if (!prevSy) {
      return res.status(400).json({ success: false, message: 'No previous school year found to fetch from' });
    }

    const { ids } = req.body || {};
    const idList = Array.isArray(ids) && ids.length > 0 ? ids : null;

    const [prevClasses] = await pool.query(
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
      const [dup] = await pool.query(
        'SELECT id FROM classes WHERE grade = ? AND section = ? AND school_year_id = ? LIMIT 1',
        [cls.grade, cls.section, targetSy.id]
      );
      if (dup.length) {
        skipped += 1;
        continue;
      }

      const newId = uuidv4();
      await pool.query(
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
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch classes from previous year' });
  }
};

module.exports = {
  getTeacherVisibleClasses,
  getAllClasses,
  getAdviserClasses,
  getSubjectTeacherClasses,
  assignAdviserToClass,
  unassignAdviserFromClass,
  assignSubjectTeacher,
  unassignSubjectTeacher,
  getPreviousYearClasses,
  fetchClassesFromPreviousYear
};
