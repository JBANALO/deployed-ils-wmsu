const express = require('express');
const router = express.Router();
const { sendAttendanceEmail } = require('../utils/emailService');
const { query } = require('../config/database');

// School-year helpers
let attendanceSyEnsured = false;
let studentsSyChecked = false;
let attendanceSubjectColumnsEnsured = false;

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const normalizeDayText = (value = '') => String(value).trim().toLowerCase();

const parseTimeToMinutes = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const parts = raw.split(':');
  if (parts.length < 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return (h * 60) + m;
};

const normalizeScheduleClock = (value, preferEnd = false) => {
  const raw = String(value || '').trim();
  if (!raw) return null;

  let clockText = raw;
  if (raw.includes('-')) {
    const parts = raw.split('-').map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      clockText = preferEnd ? parts[1] : parts[0];
    }
  }

  const ampm = clockText.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (ampm) {
    let hh = Number(ampm[1]);
    const mm = Number(ampm[2]);
    const ap = String(ampm[3]).toUpperCase();
    if (ap === 'PM' && hh < 12) hh += 12;
    if (ap === 'AM' && hh === 12) hh = 0;
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  const hhmmss = clockText.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hhmmss) {
    const hh = Number(hhmmss[1]);
    const mm = Number(hhmmss[2]);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  return null;
};

const doesScheduleMatchWeekday = (dayValue, weekdayName) => {
  const dayText = normalizeDayText(dayValue);
  const target = normalizeDayText(weekdayName);
  const targetShort = target.slice(0, 3);

  if (!dayText) return false;
  if (dayText.includes('monday - friday') || dayText.includes('mon-fri') || dayText.includes('weekdays')) {
    return target !== 'saturday' && target !== 'sunday';
  }
  if (dayText.includes('daily') || dayText.includes('every day') || dayText.includes('everyday')) {
    return true;
  }

  return dayText.includes(target) || dayText.includes(targetShort);
};

const getDateString = (value) => {
  const formatDateOnly = (input) => {
    if (!input) return null;
    if (input instanceof Date) {
      const y = input.getFullYear();
      const m = String(input.getMonth() + 1).padStart(2, '0');
      const d = String(input.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const raw = String(input).trim();
    if (!raw) return null;
    if (raw.includes('T')) return raw.split('T')[0];
    if (raw.includes(' ')) return raw.split(' ')[0];
    return raw;
  };

  return formatDateOnly(value) || formatDateOnly(new Date());
};

const getActiveSchoolYear = async () => {
  const rows = await query('SELECT id, name as label FROM school_years WHERE is_active = 1 AND is_archived = 0 LIMIT 1');
  return rows[0] || null;
};

const getSchoolYearById = async (id) => {
  if (!id) return null;
  const rows = await query('SELECT id, name as label FROM school_years WHERE id = ? AND is_archived = 0 LIMIT 1', [id]);
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

const ensureAttendanceSubjectColumns = async () => {
  if (attendanceSubjectColumnsEnsured) return;

  const cols = await query('SHOW COLUMNS FROM attendance');
  const hasClassId = cols.some(c => c.Field === 'classId');
  const hasSubject = cols.some(c => c.Field === 'subject');
  const hasScheduleDay = cols.some(c => c.Field === 'scheduleDay');
  const hasScheduleStartTime = cols.some(c => c.Field === 'scheduleStartTime');
  const hasScheduleEndTime = cols.some(c => c.Field === 'scheduleEndTime');
  const hasAutoMarked = cols.some(c => c.Field === 'autoMarked');

  if (!hasClassId) {
    await query('ALTER TABLE attendance ADD COLUMN classId VARCHAR(255) NULL');
  }
  if (!hasSubject) {
    await query('ALTER TABLE attendance ADD COLUMN subject VARCHAR(150) NULL');
  }
  if (!hasScheduleDay) {
    await query('ALTER TABLE attendance ADD COLUMN scheduleDay VARCHAR(50) NULL');
  }
  if (!hasScheduleStartTime) {
    await query('ALTER TABLE attendance ADD COLUMN scheduleStartTime VARCHAR(8) NULL');
  }
  if (!hasScheduleEndTime) {
    await query('ALTER TABLE attendance ADD COLUMN scheduleEndTime VARCHAR(8) NULL');
  }
  if (!hasAutoMarked) {
    await query('ALTER TABLE attendance ADD COLUMN autoMarked TINYINT(1) NOT NULL DEFAULT 0');
  }

  try {
    await query('CREATE INDEX idx_attendance_subject_scope ON attendance (date, school_year_id, classId, subject)');
  } catch (indexErr) {
    // Ignore duplicate index errors
  }

  attendanceSubjectColumnsEnsured = true;
};

const findStudentsForClassSchedule = async (grade, section, schoolYearId) => {
  return query(
    `SELECT id, lrn, first_name, last_name, full_name, grade_level, section
     FROM students
     WHERE LOWER(REPLACE(TRIM(grade_level), 'grade ', '')) = LOWER(REPLACE(TRIM(?), 'grade ', ''))
       AND LOWER(TRIM(section)) = LOWER(TRIM(?))
       AND (school_year_id = ? OR school_year_id IS NULL)`,
    [grade, section, schoolYearId]
  );
};

const runAutoAbsentGeneration = async ({ schoolYearId, date, dryRun }) => {
  await ensureAttendanceSchoolYearColumn();
  await ensureStudentsSchoolYearColumnExists();
  await ensureAttendanceSubjectColumns();

  const targetSy = schoolYearId ? await getSchoolYearById(Number(schoolYearId)) : await getActiveSchoolYear();
  if (!targetSy) {
    throw new Error('No active school year found');
  }

  const targetDate = getDateString(date);
  const targetDateObj = new Date(`${targetDate}T12:00:00`);
  if (Number.isNaN(targetDateObj.getTime())) {
    throw new Error('Invalid date format. Use YYYY-MM-DD');
  }

  const weekdayName = WEEKDAY_NAMES[targetDateObj.getDay()];
  const now = new Date();
  const nowMinutes = (now.getHours() * 60) + now.getMinutes();
  const isToday = targetDate === getDateString(new Date().toISOString());

  const classRows = await query('SELECT id, grade, section FROM classes WHERE school_year_id = ?', [targetSy.id]);
  const classById = new Map(classRows.map(c => [String(c.id), c]));

  let schedules = [];
  try {
    schedules = await query(
      `SELECT class_id, teacher_id, teacher_name, subject, day, start_time, end_time
       FROM subject_teachers
       WHERE school_year_id = ?`,
      [targetSy.id]
    );
  } catch (scheduleErr) {
    throw new Error(`Could not load subject schedules. ${scheduleErr.message}`);
  }

  const uniqueSchedules = [];
  const seenScheduleKeys = new Set();
  for (const s of schedules) {
    const key = [s.class_id, s.subject, s.day, s.start_time, s.end_time, s.teacher_id].map(v => String(v || '').trim().toLowerCase()).join('|');
    if (seenScheduleKeys.has(key)) continue;
    seenScheduleKeys.add(key);
    uniqueSchedules.push(s);
  }

  const summary = {
    schoolYearId: targetSy.id,
    date: targetDate,
    matchedSchedules: 0,
    studentsEvaluated: 0,
    autoAbsentInserted: 0,
    skippedExisting: 0,
    dryRun: Boolean(dryRun)
  };

  for (const schedule of uniqueSchedules) {
    const scheduleDay = schedule.day || '';
    const endMinutes = parseTimeToMinutes(schedule.end_time || '');

    if (!doesScheduleMatchWeekday(scheduleDay, weekdayName)) {
      continue;
    }
    if (endMinutes === null) {
      continue;
    }
    if (isToday && nowMinutes < endMinutes) {
      continue;
    }

    const classMeta = classById.get(String(schedule.class_id));
    if (!classMeta) {
      continue;
    }

    summary.matchedSchedules += 1;

    const classStudents = await findStudentsForClassSchedule(classMeta.grade, classMeta.section, targetSy.id);
    summary.studentsEvaluated += classStudents.length;

    for (const student of classStudents) {
      const candidateStudentId = String(student.id || '');
      const candidateLrn = String(student.lrn || '');

      const existing = await query(
        `SELECT id FROM attendance
         WHERE date = ?
           AND school_year_id = ?
           AND classId = ?
           AND subject = ?
           AND (studentId = ? OR studentId = ?)
         LIMIT 1`,
        [targetDate, targetSy.id, schedule.class_id, schedule.subject, candidateStudentId, candidateLrn || candidateStudentId]
      );

      if (existing.length > 0) {
        summary.skippedExisting += 1;
        continue;
      }

      if (dryRun) {
        summary.autoAbsentInserted += 1;
        continue;
      }

      const fullName = (student.full_name && String(student.full_name).trim())
        ? String(student.full_name).trim()
        : `${student.first_name || ''} ${student.last_name || ''}`.trim();

      const insertId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const scheduleEnd = String(schedule.end_time || '00:00').slice(0, 5);
      const timestampValue = `${targetDate} ${scheduleEnd}:00`;

      await query(
        `INSERT INTO attendance (
          id, studentId, studentName, gradeLevel, section,
          date, timestamp, time, status, period,
          location, teacherId, teacherName, deviceInfo, qrData, school_year_id,
          classId, subject, scheduleDay, scheduleStartTime, scheduleEndTime, autoMarked
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          insertId,
          candidateStudentId,
          fullName || 'Unknown Student',
          student.grade_level || classMeta.grade || 'N/A',
          student.section || classMeta.section || 'N/A',
          targetDate,
          timestampValue,
          scheduleEnd,
          'Absent',
          'subject',
          'Auto-Absent Scheduler',
          schedule.teacher_id || null,
          schedule.teacher_name || null,
          JSON.stringify({ source: 'auto-absent', generatedAt: new Date().toISOString() }),
          JSON.stringify({ reason: 'No QR scan during subject schedule' }),
          targetSy.id,
          schedule.class_id || null,
          schedule.subject || null,
          schedule.day || null,
          schedule.start_time || null,
          schedule.end_time || null,
          1
        ]
      );

      summary.autoAbsentInserted += 1;
    }
  }

  return summary;
};

// Helper to normalize status values to valid ENUM values
const normalizeStatus = (status) => {
  const normalized = String(status || 'Present').toLowerCase().trim();
  if (normalized === 'present') return 'Present';
  if (normalized === 'absent') return 'Absent';
  if (normalized === 'late') return 'Late';
  return 'Present'; // Default fallback
};

// POST /api/attendance - Record attendance via QR scan
router.post('/', async (req, res) => {
  try {
    await ensureAttendanceSchoolYearColumn();
    await ensureStudentsSchoolYearColumnExists();
    await ensureAttendanceSubjectColumns();
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
      period,
      subject,
      classId,
      scheduleDay,
      scheduleStartTime,
      scheduleEndTime,
      autoMarked
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

    if (student) {
      studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim();
      studentGradeLevel = student.grade_level || 'N/A';
      studentSection = student.section || 'N/A';
      parentEmail = student.parent_email || null;
      studentLRN = student.lrn || studentId;
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
      // Always save to active school year unless explicitly requested.
      targetSy = await resolveTargetSchoolYear(req.body.schoolYearId);
      const activeSy = await getActiveSchoolYear();
      if (!activeSy || targetSy.id !== activeSy.id) {
        return res.status(403).json({ success: false, message: 'Attendance can only be recorded in the active school year (view-only for past years).' });
      }
    } catch (syErr) {
      return res.status(400).json({ success: false, message: syErr.message || 'No active school year found' });
    }

    const today = getDateString(date || new Date());
    const currentPeriod = period || 'morning';
    const currentSubject = subject ? String(subject).trim() : null;
    let currentClassId = classId ? String(classId).trim() : null;
    const currentStatus = normalizeStatus(status); // Normalize to valid ENUM value
    const safeSubject = currentSubject ? String(currentSubject).slice(0, 150) : null;
    const safeScheduleDay = scheduleDay ? String(scheduleDay).slice(0, 50) : null;
    const safeScheduleStartTime = normalizeScheduleClock(scheduleStartTime, false);
    const safeScheduleEndTime = normalizeScheduleClock(scheduleEndTime, true);

    // Resolve missing classId from student's grade/section in active school year.
    if (!currentClassId && studentGradeLevel && studentSection) {
      try {
        const classRows = await query(
          `SELECT id FROM classes
           WHERE LOWER(REPLACE(TRIM(grade), 'grade ', '')) = LOWER(REPLACE(TRIM(?), 'grade ', ''))
             AND LOWER(TRIM(section)) = LOWER(TRIM(?))
             AND school_year_id = ?
           LIMIT 1`,
          [studentGradeLevel, studentSection, targetSy.id]
        );
        if (classRows[0]?.id) {
          currentClassId = String(classRows[0].id);
        }
      } catch (classResolveErr) {
        console.warn('Could not resolve classId fallback:', classResolveErr.message);
      }
    }
    // MySQL datetime requires 'YYYY-MM-DD HH:MM:SS' — convert ISO string if needed
    const toMySQLDatetime = (isoStr) => {
      const d = new Date(isoStr || Date.now());
      return d.toISOString().replace('T', ' ').substring(0, 19);
    };
    const currentTimestamp = toMySQLDatetime(timestamp);
    const currentTime = time || new Date().toLocaleTimeString('en-US', { hour12: false });

    const lookupPrimaryStudentId = student?.id || studentId;
    const lookupSecondaryStudentId = student?.lrn || studentId;

    // Check if already recorded for this student + date + scope
    const existingRecords = currentSubject
      ? await query(
          `SELECT * FROM attendance
           WHERE date = ?
             AND school_year_id = ?
             AND classId = ?
             AND subject = ?
             AND (studentId = ? OR studentId = ?)
           LIMIT 1`,
            [today, targetSy.id, currentClassId || null, safeSubject, lookupPrimaryStudentId, lookupSecondaryStudentId]
        )
      : await query(
          `SELECT * FROM attendance
           WHERE date = ?
             AND period = ?
             AND school_year_id = ?
             AND (studentId = ? OR studentId = ?)
           LIMIT 1`,
          [today, currentPeriod, targetSy.id, lookupPrimaryStudentId, lookupSecondaryStudentId]
        );

    // If record exists, update it (override)
    if (existingRecords.length > 0) {
      await query(
        `UPDATE attendance
         SET status = ?, time = ?, timestamp = ?, teacherId = ?, teacherName = ?,
             classId = ?, subject = ?, scheduleDay = ?, scheduleStartTime = ?, scheduleEndTime = ?, autoMarked = ?
         WHERE id = ?`,
        [
          currentStatus,
          currentTime,
          currentTimestamp,
          teacherId || null,
          teacherName || null,
          currentClassId,
          safeSubject,
          safeScheduleDay,
          safeScheduleStartTime,
          safeScheduleEndTime,
          autoMarked ? 1 : 0,
          existingRecords[0].id
        ]
      );
      const updated = await query('SELECT * FROM attendance WHERE id = ?', [existingRecords[0].id]);
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
          date: getDateString(rec.date),
          timestamp: rec.timestamp,
          time: rec.time,
          status: rec.status,
          period: rec.period,
          classId: rec.classId,
          subject: rec.subject,
          scheduleDay: rec.scheduleDay,
          scheduleStartTime: rec.scheduleStartTime,
          scheduleEndTime: rec.scheduleEndTime,
          autoMarked: rec.autoMarked,
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
        location, teacherId, teacherName, deviceInfo, qrData, school_year_id,
        classId, subject, scheduleDay, scheduleStartTime, scheduleEndTime, autoMarked
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        attendanceId,
        student?.id || studentId,
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
        targetSy.id,
        currentClassId,
        safeSubject,
        safeScheduleDay,
        safeScheduleStartTime,
        safeScheduleEndTime,
        autoMarked ? 1 : 0
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
          subject: safeSubject,
          scheduleStartTime: safeScheduleStartTime,
          scheduleEndTime: safeScheduleEndTime,
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
        date: getDateString(attendanceRecord.date),
        timestamp: attendanceRecord.timestamp,
        time: attendanceRecord.time,
        status: attendanceRecord.status,
        period: attendanceRecord.period,
        classId: attendanceRecord.classId,
        subject: attendanceRecord.subject,
        scheduleDay: attendanceRecord.scheduleDay,
        scheduleStartTime: attendanceRecord.scheduleStartTime,
        scheduleEndTime: attendanceRecord.scheduleEndTime,
        autoMarked: attendanceRecord.autoMarked,
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
    let canFilterBySchoolYear = true;
    try {
      await ensureAttendanceSchoolYearColumn();
      await ensureAttendanceSubjectColumns();
    } catch (ensureErr) {
      canFilterBySchoolYear = false;
      console.warn('[attendance GET] school_year_id column unavailable, continuing without school-year DB filter:', ensureErr.message);
    }
    const { date, studentId, gradeLevel, section, schoolYearId } = req.query;
    let targetSy;
    if (schoolYearId && canFilterBySchoolYear) {
      try {
        targetSy = await resolveTargetSchoolYear(schoolYearId);
      } catch (syErr) {
        return res.status(400).json({ success: false, message: syErr.message || 'No active school year found' });
      }
    }
    
    let sqlQuery = 'SELECT * FROM attendance WHERE 1=1';
    const params = [];

    if (canFilterBySchoolYear && targetSy?.id) {
      sqlQuery += ' AND school_year_id = ?';
      params.push(targetSy.id);
    }
    
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
    
    let records;
    try {
      records = await query(sqlQuery, params);
    } catch (queryError) {
      console.warn('[attendance GET] query error:', queryError.message);

      // If schoolYearId filtering was attempted and failed, retry without it
      if (canFilterBySchoolYear && targetSy?.id && params.length > 0) {
        console.warn('[attendance GET] Retrying without school_year_id filter due to error');
        let fallbackQuery = 'SELECT * FROM attendance WHERE 1=1';
        const fallbackParams = [];

        if (date) {
          fallbackQuery += ' AND date = ?';
          fallbackParams.push(date);
        }
        if (studentId) {
          fallbackQuery += ' AND studentId = ?';
          fallbackParams.push(studentId);
        }
        if (gradeLevel) {
          fallbackQuery += ' AND gradeLevel = ?';
          fallbackParams.push(gradeLevel);
        }
        if (section) {
          fallbackQuery += ' AND section = ?';
          fallbackParams.push(section);
        }

        fallbackQuery += ' ORDER BY timestamp DESC';
        try {
          records = await query(fallbackQuery, fallbackParams);
        } catch (fallbackError) {
          console.error('[attendance GET] Fallback query also failed:', fallbackError.message);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch attendance records',
            error: fallbackError.message
          });
        }
      }
      // If no schoolYearId was involved or already failed fallback, rethrow
      else {
        console.error('[attendance GET] Query failed without schoolYearId recovery option:', queryError.message);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch attendance records',
          error: queryError.message
        });
      }
    }
    
    // Columns are already camelCase in the attendance table
    const transformedRecords = records.map(record => ({
      id: record.id,
      studentId: record.studentId,
      studentName: record.studentName,
      gradeLevel: record.gradeLevel,
      section: record.section,
      date: getDateString(record.date),
      timestamp: record.timestamp,
      time: record.time,
      status: record.status,
      period: record.period,
      classId: record.classId,
      subject: record.subject,
      scheduleDay: record.scheduleDay,
      scheduleStartTime: record.scheduleStartTime,
      scheduleEndTime: record.scheduleEndTime,
      autoMarked: record.autoMarked,
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
    await ensureAttendanceSubjectColumns();
    let targetSy;
    try {
      targetSy = await resolveTargetSchoolYear(req.query.schoolYearId);
    } catch (syErr) {
      return res.status(400).json({ success: false, message: syErr.message || 'No active school year found' });
    }

    const today = getDateString(new Date());
    const records = await query('SELECT * FROM attendance WHERE date = ? AND school_year_id = ? ORDER BY timestamp DESC', [today, targetSy.id]);
    
    // Columns are already camelCase in the attendance table
    const transformedRecords = records.map(record => ({
      id: record.id,
      studentId: record.studentId,
      studentName: record.studentName,
      gradeLevel: record.gradeLevel,
      section: record.section,
      date: getDateString(record.date),
      timestamp: record.timestamp,
      time: record.time,
      status: record.status,
      period: record.period,
      classId: record.classId,
      subject: record.subject,
      scheduleDay: record.scheduleDay,
      scheduleStartTime: record.scheduleStartTime,
      scheduleEndTime: record.scheduleEndTime,
      autoMarked: record.autoMarked,
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
    await ensureAttendanceSubjectColumns();
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
      date: getDateString(record.date),
      timestamp: record.timestamp,
      time: record.time,
      status: record.status,
      period: record.period,
      classId: record.classId,
      subject: record.subject,
      scheduleDay: record.scheduleDay,
      scheduleStartTime: record.scheduleStartTime,
      scheduleEndTime: record.scheduleEndTime,
      autoMarked: record.autoMarked,
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

// POST /api/attendance/auto-absent/run - Auto mark subject attendance as absent once schedule has ended
router.post('/auto-absent/run', async (req, res) => {
  try {
    const result = await runAutoAbsentGeneration({
      schoolYearId: req.body?.schoolYearId,
      date: req.body?.date,
      dryRun: Boolean(req.body?.dryRun)
    });

    res.json({
      success: true,
      message: result.dryRun ? 'Auto-absent dry run completed' : 'Auto-absent generation completed',
      data: result
    });
  } catch (error) {
    console.error('Error running auto-absent generation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run auto-absent generation',
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
      subject,
      scheduleStartTime,
      scheduleEndTime,
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
      period: period || 'subject',
      subject: subject || null,
      scheduleStartTime: scheduleStartTime || null,
      scheduleEndTime: scheduleEndTime || null,
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