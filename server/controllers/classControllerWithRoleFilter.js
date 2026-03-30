// server/controllers/classControllerWithRoleFilter.js
// MySQL-based class controller with role-based filtering and school-year scoping
// Returns ONLY the classes a teacher is assigned to (as adviser or subject teacher)

const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

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
        // Try to fetch subject_teachers
        let subjectTeachersMap = {};
        try {
          const [stRows] = await pool.query(
            `SELECT class_id, teacher_id, teacher_name, subject, day, start_time, end_time FROM subject_teachers WHERE school_year_id = ?`,
            [targetSy.id]
          );
          stRows.forEach(st => {
            if (!subjectTeachersMap[st.class_id]) {
              subjectTeachersMap[st.class_id] = [];
            }
            subjectTeachersMap[st.class_id].push(st);
          });
        } catch (stError) {
          console.log('Could not fetch subject_teachers:', stError.message);
        }

        const classesWithST = rows.map(cls => ({
          ...cls,
          subject_teachers: subjectTeachersMap[cls.id] || []
        }));

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
        const [studentRows] = await pool.query(
          `SELECT grade_level, section, COUNT(*) as student_count FROM students WHERE school_year_id = ? GROUP BY grade_level, section ORDER BY grade_level, section`,
          [targetSy.id]
        );

        // Fetch advisers from teachers table (has grade_level + section columns)
        let adviserRows = [];
        try {
          const [ar] = await pool.query(
            `SELECT id, first_name, last_name, grade_level, section FROM teachers WHERE role IN ('adviser', 'Adviser') AND grade_level IS NOT NULL AND section IS NOT NULL AND school_year_id = ?`,
            [targetSy.id]
          );
          adviserRows = ar;
        } catch (e) {
          console.log('Could not fetch advisers from teachers table:', e.message);
        }

        // Also fetch from class_assignments (stores UUID-based assignments from file system advisers)
        let caRows = [];
        try {
          const [ca] = await pool.query(`SELECT grade_level, section, adviser_id, adviser_name FROM class_assignments WHERE school_year_id = ?`, [targetSy.id]);
          caRows = ca;
        } catch (e) { /* table may not exist yet */ }
        
        const gradeOrder = { 'Kindergarten': 0, 'Grade 1': 1, 'Grade 2': 2, 'Grade 3': 3, 'Grade 4': 4, 'Grade 5': 5, 'Grade 6': 6 };
        const classes = studentRows.map(row => {
          const gradeSlug = (row.grade_level || '').toLowerCase().replace(/\s+/g, '-');
          const sectionSlug = (row.section || '').toLowerCase().replace(/\s+/g, '-');
          // Find matching adviser: class_assignments takes priority (most recent assignment)
          const caMatch = caRows.find(ca => ca.grade_level === row.grade_level && ca.section === row.section);
          const adviser = adviserRows.find(u =>
            u.grade_level === row.grade_level && u.section === row.section
          );
          const adviserId = caMatch ? caMatch.adviser_id : (adviser ? adviser.id : null);
          const adviserName = caMatch ? caMatch.adviser_name :
            (adviser ? `${adviser.first_name || ''} ${adviser.last_name || ''}`.trim() : '');
          return {
            id: `${gradeSlug}-${sectionSlug}`,
            grade: row.grade_level,
            section: row.section,
            student_count: row.student_count,
            adviser_id: adviserId,
            adviser_name: adviserName
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
    const { adviserId } = req.params;
    console.log(`getAdviserClasses - adviserId: ${adviserId}`);

    try {
      // First try direct match on classes.adviser_id
      const [rows] = await pool.query(
        `SELECT c.* FROM classes c WHERE c.adviser_id = ?`,
        [adviserId]
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
          const targetSy = await resolveSchoolYear(req);

        if (teacher.grade_level && teacher.section) {
          const [classRows] = await pool.query(
            `SELECT c.* FROM classes c WHERE c.grade = ? AND c.section = ?`,
            [teacher.grade_level, teacher.section]
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
            await pool.query(
              `UPDATE classes SET adviser_id = ? WHERE id = ? AND school_year_id = ?`,
              [adviser_id, classId, targetSy.id]
          const [nameMatchRows] = await pool.query(
            `SELECT c.* FROM classes c WHERE c.adviser_name LIKE ? OR c.adviser_name LIKE ?`,
            [`%${t.first_name}%${t.last_name}%`, `%${t.last_name}%${t.first_name}%`]
          );
          if (nameMatchRows.length > 0) {
            console.log(`Name fallback matched ${nameMatchRows.length} class(es) for adviser '${fullName}'`);
            // Also fix the stale adviser_id in classes table so future lookups work by ID
            await pool.query(
              `UPDATE classes SET adviser_id = ? WHERE adviser_name LIKE ? OR adviser_name LIKE ?`,
              [String(adviserId), `%${t.first_name}%${t.last_name}%`, `%${t.last_name}%${t.first_name}%`]
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
    const { userId } = req.params;
    console.log(`getSubjectTeacherClasses - userId: ${userId}`);

    try {
      const [rows] = await pool.query(
        `SELECT DISTINCT c.*,
                GROUP_CONCAT(DISTINCT st.subject) as subjects_teaching
         FROM classes c
         JOIN subject_teachers st ON c.id = st.class_id
         WHERE st.teacher_id = ?
         GROUP BY c.id`,
        [userId]
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
    const { classId } = req.params;
    const { adviser_id, adviser_name, grade, section } = req.body;
    const gradeLevel = grade;
    const classSection = section;

    console.log(`assignAdviserToClass - classId: ${classId}, adviser_id: ${adviser_id}, adviser_name: ${adviser_name}, grade: ${gradeLevel}, section: ${classSection}`);

    if (!adviser_id || !gradeLevel || !classSection) {
      return res.status(400).json({ success: false, message: 'adviser_id, grade, and section are required' });
    }

    // Ensure class_assignments table exists with correct schema
    await pool.query(`
      CREATE TABLE IF NOT EXISTS class_assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        grade_level VARCHAR(50) NOT NULL,
        section VARCHAR(100) NOT NULL,
        adviser_id VARCHAR(255) NOT NULL,
        adviser_name VARCHAR(255) DEFAULT '',
        UNIQUE KEY unique_class (grade_level, section)
      )
    `);

    // Upsert into class_assignments
    await pool.query(
      `INSERT INTO class_assignments (grade_level, section, adviser_id, adviser_name)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE adviser_id = VALUES(adviser_id), adviser_name = VALUES(adviser_name)`,
      [gradeLevel, classSection, String(adviser_id), adviser_name || '']
    );

    // ALSO update the classes table (critical for frontend display)
    try {
      await pool.query(
        `UPDATE classes SET adviser_id = ?, adviser_name = ? WHERE grade = ? AND section = ?`,
        [String(adviser_id), adviser_name || '', gradeLevel, classSection]
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
          `UPDATE teachers SET grade_level = ?, section = ? WHERE id = ?`,
          [gradeLevel, classSection, numericId]
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
    const { classId } = req.params;
    const { adviser_id, grade, section } = req.body;

    console.log(`unassignAdviserFromClass - classId: ${classId}, adviser_id: ${adviser_id}, grade: ${grade}, section: ${section}`);

    if (adviser_id) {
      // Remove from class_assignments
      try {
        await pool.query(`DELETE FROM class_assignments WHERE adviser_id = ?`, [String(adviser_id)]);
      } catch(e) { /* table may not exist */ }
      // Also clear from teachers table if numeric ID
      const numericId = parseInt(adviser_id);
      if (!isNaN(numericId) && String(numericId) === String(adviser_id)) {
        try {
          await pool.query(`UPDATE teachers SET grade_level = NULL, section = NULL WHERE id = ?`, [numericId]);
        } catch(e) { /* ignore */ }
      }
    } else {
      try {
        await pool.query(
          `DELETE FROM class_assignments WHERE LOWER(REPLACE(CONCAT(grade_level, '-', section), ' ', '-')) = ?`,
          [classId]
        );
      } catch(e) { /* table may not exist */ }
    }

    // ALSO clear from classes table (critical for frontend display)
    try {
      if (grade && section) {
        await pool.query(
          `UPDATE classes SET adviser_id = NULL, adviser_name = NULL WHERE grade = ? AND section = ?`,
          [grade, section]
        );
      } else if (classId) {
        // Parse classId to get grade and section
        await pool.query(
          `UPDATE classes SET adviser_id = NULL, adviser_name = NULL WHERE id = ?`,
          [classId]
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
    const { classId } = req.params;
    const { teacher_id, teacher_name, subject, day, start_time, end_time } = req.body;
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
        day VARCHAR(20) DEFAULT 'Monday',
        start_time VARCHAR(10) DEFAULT '08:00',
        end_time VARCHAR(10) DEFAULT '09:00',
        assignedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_assignment (class_id, teacher_id, subject)
      )
    `);

    // Check for class-level schedule conflict on the same day/time
    const [classConflicts] = await pool.query(
      `SELECT c.grade, c.section, st.teacher_name, st.subject, st.day, st.start_time, st.end_time
       FROM subject_teachers st
       JOIN classes c ON st.class_id = c.id
       WHERE st.class_id = ? AND st.day = ?
       AND NOT (st.end_time <= ? OR st.start_time >= ?)`,
      [classId, assignmentDay, assignmentStart, assignmentEnd]
    );

    if (classConflicts.length > 0) {
      const conflict = classConflicts[0];
      return res.status(400).json({
        success: false,
        message: `Time conflict: ${conflict.teacher_name || 'Another teacher'} already teaches ${conflict.subject} in ${conflict.grade} - ${conflict.section} on ${conflict.day} from ${conflict.start_time} to ${conflict.end_time}`
      });
    }

    // Check for teacher-level schedule conflict on the same day/time across any class
    const [teacherConflicts] = await pool.query(
      `SELECT c.grade, c.section, st.subject, st.day, st.start_time, st.end_time
       FROM subject_teachers st
       JOIN classes c ON st.class_id = c.id
       WHERE st.teacher_id = ? AND st.day = ?
       AND NOT (st.end_time <= ? OR st.start_time >= ?)`,
      [teacher_id, assignmentDay, assignmentStart, assignmentEnd]
    );

    if (teacherConflicts.length > 0) {
      const conflict = teacherConflicts[0];
      return res.status(400).json({
        success: false,
        message: `Time conflict: Teacher is already assigned to ${conflict.grade} - ${conflict.section} (${conflict.subject}) on ${conflict.day} from ${conflict.start_time} to ${conflict.end_time}`
      });
    }

    // Check if already assigned
    const [existing] = await pool.query(
      `SELECT id FROM subject_teachers WHERE class_id = ? AND teacher_id = ? AND subject = ?`,
      [classId, teacher_id, subject]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'This teacher is already assigned to this class for this subject'
      });
    }

    // Insert new assignment
    await pool.query(
      `INSERT INTO subject_teachers (class_id, teacher_id, teacher_name, subject, day, start_time, end_time)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [classId, teacher_id, teacher_name || '', subject, assignmentDay, assignmentStart, assignmentEnd]
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
    const { classId, teacherId } = req.params;

    console.log(`unassignSubjectTeacher - classId: ${classId}, teacherId: ${teacherId}`);

    await pool.query(
      `DELETE FROM subject_teachers WHERE class_id = ? AND teacher_id = ?`,
      [classId, teacherId]
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
