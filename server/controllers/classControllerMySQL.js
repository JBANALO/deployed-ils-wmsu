// server/controllers/classControllerMySQL.js
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

exports.createClass = async (req, res) => {
  try {
    const { grade, section, adviserId } = req.body;
    const classId = uuidv4();

    await query(
      'INSERT INTO classes (id, grade, section, adviser_id, createdAt) VALUES (?, ?, ?, ?, NOW())',
      [classId, grade, section, adviserId || null]
    );

    res.status(201).json({ message: 'Class created', classId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllClasses = async (req, res) => {
  try {
    const classes = await query('SELECT * FROM classes ORDER BY grade, section');
    
    // Fetch subject teachers and adviser info for each class
    const classesWithTeachers = await Promise.all(classes.map(async (cls) => {
      try {
        // Fetch subject teachers
        const subjectTeachers = await query(
          `SELECT st.*, u.firstName, u.lastName 
           FROM subject_teachers st 
           LEFT JOIN users u ON st.teacher_id = u.id COLLATE utf8mb4_unicode_ci
           WHERE st.class_id = ?`,
          [cls.id]
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
      classes: classesWithTeachers  // For backward compatibility
    });
  } catch (error) {
    console.error('Error in getAllClasses:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getSubjectTeacherClasses = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Fetching classes for subject teacher:', userId);

    const classes = await query(
      `SELECT DISTINCT c.* FROM classes c 
       INNER JOIN subject_teachers st ON c.id = st.class_id 
       WHERE st.teacher_id = ?`,
      [userId]
    );

    // Fetch subject teachers for each class
    const classesWithTeachers = await Promise.all(classes.map(async (cls) => {
      try {
        const subjectTeachers = await query(
          `SELECT st.* FROM subject_teachers st WHERE st.class_id = ?`,
          [cls.id]
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
      'SELECT * FROM classes WHERE adviser_id = ? ORDER BY grade, section',
      [adviserId]
    );
    classes = classesById;

    // Also query classes by gradeLevel/section if adviser is assigned that way
    if (adviserGradeLevel && adviserSection) {
      const classesByGradeSection = await query(
        'SELECT * FROM classes WHERE grade = ? AND section = ? ORDER BY grade, section',
        [adviserGradeLevel, adviserSection]
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
    const { id } = req.params;
    const classes = await query('SELECT * FROM classes WHERE id = ?', [id]);
    
    if (classes.length === 0) {
      return res.status(404).json({ message: 'Class not found' });
    }

    res.json(classes[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { grade, section, adviserId } = req.body;

    await query(
      'UPDATE classes SET grade = ?, section = ?, adviser_id = ? WHERE id = ?',
      [grade, section, adviserId || null, id]
    );

    res.json({ message: 'Class updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteClass = async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM classes WHERE id = ?', [id]);
    res.json({ message: 'Class deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSubjectTeachers = async (req, res) => {
  try {
    const { id } = req.params;
    const teachers = await query(
      'SELECT st.*, u.firstName, u.lastName FROM subject_teachers st JOIN users u ON st.teacher_id = u.id WHERE st.class_id = ?',
      [id]
    );
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.addSubjectTeacher = async (req, res) => {
  try {
    const { classId } = req.params;
    const { teacherId, subject } = req.body;

    try {
      await query(
        'INSERT INTO subject_teachers (class_id, teacher_id, subject, assignedAt) VALUES (?, ?, ?, NOW())',
        [classId, teacherId, subject]
      );
    } catch (err) {
      // If columns don't match, try alternate format
      if (err.message && err.message.includes("Unknown column")) {
        console.log('Table structure different, using basic insert');
        await query(
          'INSERT INTO subject_teachers (class_id, teacher_id, subject) VALUES (?, ?, ?)',
          [classId, teacherId, subject]
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
    const { classId } = req.params;
    const { adviser_id, adviser_name } = req.body;

    console.log('assignAdviserToClass - classId:', classId, 'adviser_id:', adviser_id, 'adviser_name:', adviser_name);

    // Update only adviser_id for now (skip adviser_name due to database issues)
    await query(
      'UPDATE classes SET adviser_id = ? WHERE id = ?',
      [adviser_id, classId]
    );

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
    const { classId } = req.params;

    console.log('unassignAdviser - classId:', classId);

    await query(
      'UPDATE classes SET adviser_id = NULL WHERE id = ?',
      [classId]
    );

    res.json({ success: true, message: 'Adviser unassigned successfully' });
  } catch (error) {
    console.error('Error in unassignAdviser:', error);
    res.status(500).json({ success: false, message: 'Error unassigning adviser: ' + error.message });
  }
};

exports.assignSubjectTeacherToClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const { teacher_id, teacher_name, subject, day, start_time, end_time } = req.body;

    console.log('assignSubjectTeacherToClass - classId:', classId, 'teacher_id:', teacher_id, 'subject:', subject, 'day:', day);

    // Try to insert with all fields first
    try {
      const result = await query(
        'INSERT INTO subject_teachers (class_id, teacher_id, teacher_name, subject, day, start_time, end_time, assignedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
        [classId, teacher_id, teacher_name, subject, day, start_time || '08:00', end_time || '09:00']
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
          'INSERT INTO subject_teachers (class_id, teacher_id, teacher_name, subject, assignedAt) VALUES (?, ?, ?, ?, NOW())',
          [classId, teacher_id, teacher_name, subject]
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
    const { classId, teacherId } = req.params;

    console.log('unassignSubjectTeacher - classId:', classId, 'teacherId:', teacherId);

    await query(
      'DELETE FROM subject_teachers WHERE class_id = ? AND teacher_id = ?',
      [classId, teacherId]
    );

    res.json({ success: true, message: 'Subject teacher unassigned successfully' });
  } catch (error) {
    console.error('Error in unassignSubjectTeacher:', error);
    res.status(500).json({ success: false, message: 'Error unassigning subject teacher: ' + error.message });
  }
};
