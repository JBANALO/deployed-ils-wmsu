// server/controllers/classControllerWithRoleFilter.js
// MySQL-based class controller with role-based filtering
// Returns ONLY the classes a teacher is assigned to (as adviser or subject teacher)

const { pool } = require('../config/database');
const { readClasses } = require('../utils/fileStorage');

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
          `SELECT c.*, 
                  u.firstName as adviser_firstName, 
                  u.lastName as adviser_lastName,
                  COUNT(DISTINCT s.id) as student_count
           FROM classes c
           LEFT JOIN users u ON c.adviser_id = u.id
           LEFT JOIN students s ON c.id = s.class_id
           WHERE c.adviser_id = ?
           GROUP BY c.id`,
          [userId]
        );

        visibleClasses = adviserClasses.map(cls => ({
          ...cls,
          role_in_class: 'adviser',
          adviser_name: `${cls.adviser_firstName || ''} ${cls.adviser_lastName || ''}`.trim()
        }));

        console.log(`Found ${visibleClasses.length} classes as adviser`);
      }

      // If subject teacher: get classes where they teach
      if (user.role === 'subject_teacher' || user.role === 'teacher') {
        const [teacherClasses] = await pool.query(
          `SELECT DISTINCT c.*, 
                  u.firstName as adviser_firstName, 
                  u.lastName as adviser_lastName,
                  GROUP_CONCAT(DISTINCT st.subject) as subjects_teaching,
                  COUNT(DISTINCT s.id) as student_count
           FROM classes c
           LEFT JOIN users u ON c.adviser_id = u.id
           LEFT JOIN subject_teachers st ON c.id = st.class_id AND st.teacher_id = ?
           LEFT JOIN students s ON c.id = s.class_id
           WHERE st.teacher_id = ? OR c.adviser_id = ?
           GROUP BY c.id`,
          [userId, userId, userId]
        );

        // Include subject teacher classes
        const subjectTeacherClasses = teacherClasses
          .filter(cls => cls.subjects_teaching) // Only if teaching subjects
          .map(cls => ({
            ...cls,
            role_in_class: 'subject_teacher',
            adviser_name: `${cls.adviser_firstName || ''} ${cls.adviser_lastName || ''}`.trim()
          }));

        // Combine and deduplicate
        visibleClasses = [...visibleClasses, ...subjectTeacherClasses];

        console.log(`Found ${subjectTeacherClasses.length} classes as subject teacher`);
      }

      console.log(`Total visible classes for user ${userId}: ${visibleClasses.length}`);
      
      return res.json({ 
        success: true, 
        data: visibleClasses,
        user_role: user.role,
        message: `${visibleClasses.length} classes visible to this user`
      });

    } catch (dbError) {
      console.log('Database query failed, falling back to file-based system:', dbError.message);
      
      // Fallback to file-based system
      const classes = readClasses();
      
      // Filter classes based on user role in that class
      const visibleClasses = classes.filter(cls => {
        // User is the adviser of this class
        if (cls.adviser_id === userId) return true;
        
        // User is a subject teacher in this class
        if (cls.subject_teachers && Array.isArray(cls.subject_teachers)) {
          return cls.subject_teachers.some(st => st.teacher_id === userId);
        }
        
        return false;
      });

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
      // Try database first - query classes table
      const [rows] = await pool.query(
        `SELECT c.*, 
                u.firstName as adviser_firstName, 
                u.lastName as adviser_lastName,
                COUNT(DISTINCT s.id) as student_count
         FROM classes c
         LEFT JOIN users u ON c.adviser_id = u.id
         LEFT JOIN students s ON c.id = s.class_id
         GROUP BY c.id
         ORDER BY c.grade, c.section`
      );

      console.log(`Database: Found ${rows.length} classes`);
      
      return res.json({ 
        success: true, 
        data: rows.map(cls => ({
          ...cls,
          adviser_name: `${cls.adviser_firstName || ''} ${cls.adviser_lastName || ''}`.trim()
        }))
      });

    } catch (dbError) {
      console.log('classes table not available, generating from students:', dbError.message);
      
      // Fallback: generate classes from students table
      try {
        const [studentRows] = await pool.query(
          `SELECT grade_level, section, COUNT(*) as student_count FROM students GROUP BY grade_level, section ORDER BY grade_level, section`
        );

        // Also fetch advisers from users table (users table uses snake_case columns)
        const [adviserRows] = await pool.query(
          `SELECT id, first_name, last_name, grade_level, section FROM users WHERE role IN ('adviser', 'Adviser', 'teacher', 'Teacher') AND grade_level IS NOT NULL AND section IS NOT NULL`
        );
        
        const gradeOrder = { 'Kindergarten': 0, 'Grade 1': 1, 'Grade 2': 2, 'Grade 3': 3, 'Grade 4': 4, 'Grade 5': 5, 'Grade 6': 6 };
        const classes = studentRows.map(row => {
          const gradeSlug = (row.grade_level || '').toLowerCase().replace(/\s+/g, '-');
          const sectionSlug = (row.section || '').toLowerCase().replace(/\s+/g, '-');
          // Find matching adviser for this grade+section
          const adviser = adviserRows.find(u =>
            u.grade_level === row.grade_level && u.section === row.section
          );
          return {
            id: `${gradeSlug}-${sectionSlug}`,
            grade: row.grade_level,
            section: row.section,
            student_count: row.student_count,
            adviser_id: adviser ? adviser.id : null,
            adviser_name: adviser ? `${adviser.first_name || ''} ${adviser.last_name || ''}`.trim() : ''
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
        try {
          const classes = readClasses();
          return res.json({ success: true, data: classes, message: 'File-based fallback mode' });
        } catch (fileError) {
          return res.json({ success: true, data: [], message: 'No classes data available' });
        }
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
      const [rows] = await pool.query(
        `SELECT c.*, 
                u.firstName as adviser_firstName, 
                u.lastName as adviser_lastName,
                COUNT(DISTINCT s.id) as student_count
         FROM classes c
         LEFT JOIN users u ON c.adviser_id = u.id
         LEFT JOIN students s ON c.id = s.class_id
         WHERE c.adviser_id = ?
         GROUP BY c.id`,
        [adviserId]
      );

      console.log(`Database: Found ${rows.length} classes for adviser ${adviserId}`);
      
      return res.json({ 
        success: true, 
        data: rows.map(cls => ({
          ...cls,
          adviser_name: `${cls.adviser_firstName || ''} ${cls.adviser_lastName || ''}`.trim()
        }))
      });

    } catch (dbError) {
      console.log('Database unavailable, fallback to file-based');
      
      const classes = readClasses();
      const adviserClasses = classes.filter(c => c.adviser_id === adviserId);
      
      return res.json({ 
        success: true, 
        data: adviserClasses,
        message: 'File-based fallback mode'
      });
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
                u.firstName as adviser_firstName, 
                u.lastName as adviser_lastName,
                GROUP_CONCAT(DISTINCT st.subject) as subjects_teaching,
                COUNT(DISTINCT s.id) as student_count
         FROM classes c
         LEFT JOIN users u ON c.adviser_id = u.id
         LEFT JOIN subject_teachers st ON c.id = st.class_id AND st.teacher_id = ?
         LEFT JOIN students s ON c.id = s.class_id
         WHERE st.teacher_id = ?
         GROUP BY c.id`,
        [userId, userId]
      );

      console.log(`Database: Found ${rows.length} classes for subject teacher ${userId}`);
      
      return res.json({ 
        success: true, 
        data: rows.map(cls => ({
          ...cls,
          adviser_name: `${cls.adviser_firstName || ''} ${cls.adviser_lastName || ''}`.trim()
        }))
      });

    } catch (dbError) {
      console.log('Database unavailable, fallback to file-based');
      
      const classes = readClasses();
      const teacherClasses = classes.filter(c => 
        c.subject_teachers && c.subject_teachers.some(st => st.teacher_id === userId)
      );
      
      return res.json({ 
        success: true, 
        data: teacherClasses,
        message: 'File-based fallback mode'
      });
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

    console.log(`assignAdviserToClass - classId: ${classId}, adviser_id: ${adviser_id}, grade: ${grade}, section: ${section}`);

    if (!adviser_id) {
      return res.status(400).json({ success: false, message: 'adviser_id is required' });
    }

    // Determine grade and section: prefer sent values, otherwise parse from classId slug
    let gradeLevel = grade;
    let classSection = section;

    if (!gradeLevel || !classSection) {
      // Try to get from students table using the slug
      try {
        const [rows] = await pool.query(
          `SELECT grade_level, section FROM students WHERE LOWER(REPLACE(CONCAT(grade_level, '-', section), ' ', '-')) = ? LIMIT 1`,
          [classId]
        );
        if (rows.length > 0) {
          gradeLevel = rows[0].grade_level;
          classSection = rows[0].section;
        }
      } catch (e) {
        console.log('Could not resolve grade/section from slug:', e.message);
      }
    }

    // Store assignment in users table (update adviser's grade_level + section)
    const [result] = await pool.query(
      `UPDATE users SET grade_level = ?, section = ? WHERE id = ?`,
      [gradeLevel, classSection, adviser_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Adviser user not found' });
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
    const { adviser_id } = req.body;

    console.log(`unassignAdviserFromClass - classId: ${classId}, adviser_id: ${adviser_id}`);

    if (adviser_id) {
      // Clear the specific adviser's grade/section
      await pool.query(
        `UPDATE users SET grade_level = NULL, section = NULL WHERE id = ?`,
        [adviser_id]
      );
    } else {
      // Find the adviser assigned to this class by grade+section and clear them
      // Parse class slug to find matching adviser
      const [advisers] = await pool.query(
        `SELECT u.id FROM users u
         JOIN students s ON u.gradeLevel = s.grade_level AND u.section = s.section
         WHERE LOWER(REPLACE(CONCAT(s.grade_level, '-', s.section), ' ', '-')) = ?
         AND u.role IN ('adviser','Adviser','teacher','Teacher')
         LIMIT 1`,
        [classId]
      );
      if (advisers.length > 0) {
        await pool.query(
          `UPDATE users SET gradeLevel = NULL, section = NULL WHERE id = ?`,
          [advisers[0].id]
        );
      }
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

module.exports = {
  getTeacherVisibleClasses,
  getAllClasses,
  getAdviserClasses,
  getSubjectTeacherClasses,
  assignAdviserToClass,
  unassignAdviserFromClass
};
