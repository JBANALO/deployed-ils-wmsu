const express = require('express');
const router = express.Router();
const { sendAttendanceEmail } = require('../utils/emailService');
const { query } = require('../config/database');

// School-year helpers
let attendanceSyEnsured = false;
let studentsSyChecked = false;

const getActiveSchoolYear = async () => {
  const rows = await query('SELECT id, label FROM school_years WHERE is_active = 1 AND is_archived = 0 LIMIT 1');
  return rows[0] || null;
};

const getSchoolYearById = async (id) => {
  if (!id) return null;
  const rows = await query('SELECT id, label FROM school_years WHERE id = ? AND is_archived = 0 LIMIT 1', [id]);
  return rows[0] || null;
};

const resolveTargetSchoolYear = async (requestedId) => {
  const sy = requestedId ? await getSchoolYearById(Number(requestedId)) : await getActiveSchoolYear();
  if (!sy) throw new Error('No active school year found');
  return sy;
};

const ensureAttendanceSchoolYearColumn = async () => {
  if (attendanceSyEnsured) return;
  const cols = await query('SHOW COLUMNS FROM attendance');
  const hasSy = cols.some(c => c.Field === 'school_year_id');
  if (!hasSy) {
    await query('ALTER TABLE attendance ADD COLUMN school_year_id INT NULL');
    await query('CREATE INDEX idx_attendance_school_year ON attendance (school_year_id)');
  }
  attendanceSyEnsured = true;
};

const ensureStudentsSchoolYearColumnExists = async () => {
  if (studentsSyChecked) return;
  const cols = await query('SHOW COLUMNS FROM students');
  const hasSy = cols.some(c => c.Field === 'school_year_id');
  if (!hasSy) {
    await query('ALTER TABLE students ADD COLUMN school_year_id INT NULL');
    await query('CREATE INDEX idx_students_school_year ON students (school_year_id)');
  }
  studentsSyChecked = true;
};

// POST /api/attendance - Record attendance via QR scan
router.post('/', async (req, res) => {
  try {
    await ensureAttendanceSchoolYearColumn();
    await ensureStudentsSchoolYearColumnExists();
    console.log('Attendance POST request body:', req.body);
    
    const { 
      studentId, 
      qrData, 
      location, 
      deviceInfo,
      teacherId,
      teacherName,
      timestamp,
      date,
      time,
      status,
      period
    } = req.body;
    
    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required'
      });
    }

    // Look up student in the students table by lrn or id
    const studentRows = await query(
      'SELECT * FROM students WHERE (lrn = ? OR id = ?)',
      [studentId, studentId]
    );
    
    let student = studentRows[0] || null;
    let studentName = 'Unknown';
    let studentGradeLevel = 'N/A';
    let studentSection = 'N/A';
    let parentEmail = null;
    let studentLRN = studentId;

    let targetSyId = null;

    if (student) {
      studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim();
      studentGradeLevel = student.grade_level || 'N/A';
      studentSection = student.section || 'N/A';
      parentEmail = student.parent_email || null;
      studentLRN = student.lrn || studentId;
      targetSyId = student.school_year_id || null;
      console.log(`Found student in students table: ${studentName}, Parent Email: ${parentEmail}`);
    } else {
      // Fallback: check users table
      const userRows = await query('SELECT * FROM users WHERE id = ? OR username = ?', [studentId, studentId]);
      const userStudent = userRows[0];
      if (userStudent) {
        studentName = `${userStudent.firstName || userStudent.first_name || ''} ${userStudent.lastName || userStudent.last_name || ''}`.trim();
        studentGradeLevel = userStudent.gradeLevel || userStudent.grade_level || 'N/A';
        studentSection = userStudent.section || 'N/A';
        console.log(`Found student in users table: ${studentName}`);
      } else {
        console.log('Student not found with ID:', studentId);
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }
    }

    let targetSy;
    try {
      targetSy = targetSyId ? await getSchoolYearById(targetSyId) : await resolveTargetSchoolYear(req.body.schoolYearId);
      const activeSy = await getActiveSchoolYear();
      if (!activeSy || targetSy.id !== activeSy.id) {
        return res.status(403).json({ success: false, message: 'Attendance can only be recorded in the active school year (view-only for past years).' });
      }
    } catch (syErr) {
      return res.status(400).json({ success: false, message: syErr.message || 'No active school year found' });
    }

    const today = date || new Date().toISOString().split('T')[0];
    const currentPeriod = period || 'morning';
    const currentStatus = status || 'present';
    // MySQL datetime requires 'YYYY-MM-DD HH:MM:SS' — convert ISO string if needed
    const toMySQLDatetime = (isoStr) => {
      const d = new Date(isoStr || Date.now());
      return d.toISOString().replace('T', ' ').substring(0, 19);
    };
    const currentTimestamp = toMySQLDatetime(timestamp);
    const currentTime = time || new Date().toLocaleTimeString('en-US', { hour12: false });

    // Check if already recorded for this student + date + period
    const existingRecords = await query(
      'SELECT * FROM attendance WHERE studentId = ? AND date = ? AND period = ? AND school_year_id = ?',
      [studentId, today, currentPeriod, targetSy.id]
    );

    // If record exists, update it (override)
    if (existingRecords.length > 0) {
      await query(
        'UPDATE attendance SET status = ?, time = ?, timestamp = ?, teacherId = ?, teacherName = ? WHERE studentId = ? AND date = ? AND period = ? AND school_year_id = ?',
        [currentStatus, currentTime, currentTimestamp, teacherId || null, teacherName || null, studentId, today, currentPeriod, targetSy.id]
      );
      const updated = await query('SELECT * FROM attendance WHERE studentId = ? AND date = ? AND period = ? AND school_year_id = ?', [studentId, today, currentPeriod, targetSy.id]);
      const rec = updated[0];
      console.log('Updated attendance record:', rec);

      // Auto-send email on update too
      let emailSent = false;
      if (parentEmail) {
        try {
          const emailResult = await sendAttendanceEmail({
            parentEmail,
            studentName,
            studentLRN,
            gradeLevel: studentGradeLevel,
            section: studentSection,
            status: currentStatus,
            period: currentPeriod,
            time: currentTime,
            teacherName: teacherName || 'School Administration'
          });
          emailSent = emailResult.success;
        } catch (e) {
          console.log('📧 Email error on update:', e.message);
        }
      }

      return res.json({
        success: true,
        message: 'Attendance updated successfully',
        emailSent,
        data: {
          id: rec.id,
          studentId: rec.studentId,
          studentName: rec.studentName,
          gradeLevel: rec.gradeLevel,
          section: rec.section,
          date: rec.date instanceof Date ? rec.date.toISOString().split('T')[0] : rec.date,
          timestamp: rec.timestamp,
          time: rec.time,
          status: rec.status,
          period: rec.period,
          location: rec.location,
          teacherId: rec.teacherId,
          teacherName: rec.teacherName
        }
      });
    }

    // Insert new record
    const attendanceId = Date.now().toString();
    await query(
      `INSERT INTO attendance (
        id, studentId, studentName, gradeLevel, section,
        date, timestamp, time, status, period,
        location, teacherId, teacherName, deviceInfo, qrData, school_year_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        attendanceId,
        studentId,
        studentName,
        studentGradeLevel,
        studentSection,
        today,
        currentTimestamp,
        currentTime,
        currentStatus,
        currentPeriod,
        location || 'Mobile App',
        teacherId || null,
        teacherName || null,
        JSON.stringify(deviceInfo || {}),
        JSON.stringify(qrData || {}),
        targetSy.id
      ]
    );

    const insertedRecords = await query('SELECT * FROM attendance WHERE id = ?', [attendanceId]);
    const attendanceRecord = insertedRecords[0];
    
    console.log('Saved attendance record:', attendanceRecord);

    // Automatically send email to parent if email exists
    let emailSent = false;
    let emailError = null;
    if (parentEmail) {
      try {
        console.log(`📧 Auto-sending attendance email to parent: ${parentEmail}`);
        const emailResult = await sendAttendanceEmail({
          parentEmail,
          studentName,
          studentLRN,
          gradeLevel: studentGradeLevel,
          section: studentSection,
          status: currentStatus,
          period: currentPeriod,
          time: currentTime,
          teacherName: teacherName || 'School Administration'
        });
        emailSent = emailResult.success;
        if (!emailResult.success) {
          emailError = emailResult.error;
          console.log(`📧 Email failed: ${emailError}`);
        } else {
          console.log(`📧 Email sent successfully to ${parentEmail}`);
        }
      } catch (emailErr) {
        console.error('📧 Email error:', emailErr.message);
        emailError = emailErr.message;
      }
    } else {
      console.log('📧 No parent email found, skipping email notification');
    }

    res.json({
      success: true,
      message: 'Attendance recorded successfully',
      emailSent,
      emailError,
      data: {
        id: attendanceRecord.id,
        studentId: attendanceRecord.studentId,
        studentName: attendanceRecord.studentName,
        gradeLevel: attendanceRecord.gradeLevel,
        section: attendanceRecord.section,
        date: attendanceRecord.date instanceof Date ? attendanceRecord.date.toISOString().split('T')[0] : attendanceRecord.date,
        timestamp: attendanceRecord.timestamp,
        time: attendanceRecord.time,
        status: attendanceRecord.status,
        period: attendanceRecord.period,
        location: attendanceRecord.location,
        teacherId: attendanceRecord.teacherId,
        teacherName: attendanceRecord.teacherName
      }
    });

  } catch (error) {
    console.error('Error recording attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET /api/attendance - Get attendance records
router.get('/', async (req, res) => {
  try {
    await ensureAttendanceSchoolYearColumn();
    const { date, studentId, gradeLevel, section, schoolYearId } = req.query;
    let targetSy;
    try {
      targetSy = await resolveTargetSchoolYear(schoolYearId);
    } catch (syErr) {
      return res.status(400).json({ success: false, message: syErr.message || 'No active school year found' });
    }
    
    let sqlQuery = 'SELECT * FROM attendance WHERE school_year_id = ?';
    const params = [targetSy.id];
    
    if (date) {
      sqlQuery += ' AND date = ?';
      params.push(date);
    }
    
    if (studentId) {
      sqlQuery += ' AND studentId = ?';
      params.push(studentId);
    }
    
    if (gradeLevel) {
      sqlQuery += ' AND gradeLevel = ?';
      params.push(gradeLevel);
    }
    
    if (section) {
      sqlQuery += ' AND section = ?';
      params.push(section);
    }
    
    sqlQuery += ' ORDER BY timestamp DESC';
    
    const records = await query(sqlQuery, params);
    
    // Columns are already camelCase in the attendance table
    const transformedRecords = records.map(record => ({
      id: record.id,
      studentId: record.studentId,
      studentName: record.studentName,
      gradeLevel: record.gradeLevel,
      section: record.section,
      date: record.date instanceof Date ? record.date.toISOString().split('T')[0] : record.date,
      timestamp: record.timestamp,
      time: record.time,
      status: record.status,
      period: record.period,
      location: record.location,
      teacherId: record.teacherId,
      teacherName: record.teacherName,
      deviceInfo: record.deviceInfo,
      qrData: record.qrData,
      createdAt: record.createdAt
    }));

    res.json({
      success: true,
      data: transformedRecords,
      count: transformedRecords.length
    });

  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET /api/attendance/today - Get today's attendance
router.get('/today', async (req, res) => {
  try {
    await ensureAttendanceSchoolYearColumn();
    let targetSy;
    try {
      targetSy = await resolveTargetSchoolYear(req.query.schoolYearId);
    } catch (syErr) {
      return res.status(400).json({ success: false, message: syErr.message || 'No active school year found' });
    }

    const today = new Date().toISOString().split('T')[0];
    const records = await query('SELECT * FROM attendance WHERE date = ? AND school_year_id = ? ORDER BY timestamp DESC', [today, targetSy.id]);
    
    // Columns are already camelCase in the attendance table
    const transformedRecords = records.map(record => ({
      id: record.id,
      studentId: record.studentId,
      studentName: record.studentName,
      gradeLevel: record.gradeLevel,
      section: record.section,
      date: record.date instanceof Date ? record.date.toISOString().split('T')[0] : record.date,
      timestamp: record.timestamp,
      time: record.time,
      status: record.status,
      period: record.period,
      location: record.location,
      teacherId: record.teacherId,
      teacherName: record.teacherName,
      deviceInfo: record.deviceInfo,
      qrData: record.qrData,
      createdAt: record.createdAt
    }));

    res.json({
      success: true,
      data: transformedRecords,
      count: transformedRecords.length
    });

  } catch (error) {
    console.error('Error fetching today\'s attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET /api/attendance/student/:id - Get attendance for specific student
router.get('/student/:id', async (req, res) => {
  try {
    await ensureAttendanceSchoolYearColumn();
    const { id } = req.params;
    let targetSy;
    try {
      targetSy = await resolveTargetSchoolYear(req.query.schoolYearId);
    } catch (syErr) {
      return res.status(400).json({ success: false, message: syErr.message || 'No active school year found' });
    }

    const records = await query('SELECT * FROM attendance WHERE studentId = ? AND school_year_id = ? ORDER BY date DESC', [id, targetSy.id]);
    
    // Columns are already camelCase in the attendance table
    const transformedRecords = records.map(record => ({
      id: record.id,
      studentId: record.studentId,
      studentName: record.studentName,
      gradeLevel: record.gradeLevel,
      section: record.section,
      date: record.date instanceof Date ? record.date.toISOString().split('T')[0] : record.date,
      timestamp: record.timestamp,
      time: record.time,
      status: record.status,
      period: record.period,
      location: record.location,
      teacherId: record.teacherId,
      teacherName: record.teacherName,
      deviceInfo: record.deviceInfo,
      qrData: record.qrData,
      createdAt: record.createdAt
    }));

    res.json({
      success: true,
      data: transformedRecords,
      count: transformedRecords.length
    });

  } catch (error) {
    console.error('Error fetching student attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST /api/attendance/send-email - Send attendance notification email to parent
router.post('/send-email', async (req, res) => {
  try {
    const {
      parentEmail,
      studentName,
      studentLRN,
      gradeLevel,
      section,
      status,
      period,
      time,
      teacherName
    } = req.body;

    if (!parentEmail) {
      return res.status(400).json({
        success: false,
        message: 'Parent email is required'
      });
    }

    if (!studentName) {
      return res.status(400).json({
        success: false,
        message: 'Student name is required'
      });
    }

    console.log(`📧 Sending attendance email to ${parentEmail} for ${studentName}`);

    const result = await sendAttendanceEmail({
      parentEmail,
      studentName,
      studentLRN,
      gradeLevel,
      section,
      status: status || 'present',
      period: period || 'morning',
      time: time || new Date().toLocaleTimeString(),
      teacherName
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'Email sent successfully',
        messageId: result.messageId
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send email',
        error: result.error
      });
    }

  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;