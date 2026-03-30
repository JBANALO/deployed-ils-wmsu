// server/controllers/studentController.js
const { query, isDatabaseAvailable } = require('../config/database');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const bcrypt = require('bcryptjs');

// -----------------------------
// HELPER: Format student object
// -----------------------------
function formatStudent(s) {
  let qrCodeUrl = s.qr_code;
  
  // Convert file paths to full URLs for mobile app compatibility
  // (if any old file paths still exist in database)
  if (qrCodeUrl && typeof qrCodeUrl === 'string') {
    if (qrCodeUrl.startsWith('/qrcodes/')) {
      // File path - convert to full URL
      qrCodeUrl = `https://deployed-ils-wmsu-production.up.railway.app${qrCodeUrl}`;
    }
    // Base64 data URLs or full HTTP(S) URLs are kept as-is
  }
  
  return {
    id: s.id,
    lrn: s.lrn,
    firstName: s.first_name,
    middleName: s.middle_name,
    lastName: s.last_name,
    fullName: `${s.first_name} ${s.middle_name || ''} ${s.last_name}`.trim(),
    age: s.age,
    sex: s.sex,
    gradeLevel: s.grade_level,
    section: s.section,
    parentFirstName: s.parent_first_name,
    parentLastName: s.parent_last_name,
    parentEmail: s.parent_email,
    parentContact: s.parent_contact,
    studentEmail: s.student_email,
    profilePic: s.profile_pic,
    qrCode: qrCodeUrl,
    status: s.status,
    average: s.live_average != null ? Number(s.live_average) : (s.average ? Number(s.average) : null),
    live_average: s.live_average != null ? Number(s.live_average) : null,
    q1_avg: s.q1_avg != null ? Number(s.q1_avg) : null,
    q2_avg: s.q2_avg != null ? Number(s.q2_avg) : null,
    q3_avg: s.q3_avg != null ? Number(s.q3_avg) : null,
    q4_avg: s.q4_avg != null ? Number(s.q4_avg) : null,
    declineReason: s.decline_reason || undefined,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
    role: 'student'
  };
}

// -----------------------------
// HELPER: Generate QR code file
// -----------------------------
async function generateQRCodeFile(studentData, qrCodePath) {
  // Use JSON format so the mobile scanner can parse it consistently
  const qrData = JSON.stringify({
    studentId: studentData.lrn,
    lrn: studentData.lrn,
    name: `${studentData.firstName} ${studentData.lastName}`.trim(),
    gradeLevel: studentData.gradeLevel,
    section: studentData.section
  });

  await QRCode.toFile(qrCodePath, qrData, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' }
  });
}

// -----------------------------
// CREATE STUDENT
// -----------------------------
exports.createStudent = async (req, res) => {
  let profilePicPath = null;
  let qrCodePath = null;

  try {
    console.log('=== STUDENT CREATION DEBUG ===');
    console.log('req.body keys:', Object.keys(req.body));
    console.log('profilePic in req.body:', req.body.profilePic);
    
    const {
      lrn, firstName, middleName, lastName, sex,
      parentFirstName, parentLastName, parentEmail, parentContact,
      parentContact: contact,
      password, gradeLevel, section, profilePic, qrCode, status: reqStatus
    } = req.body;

    // Accept both 'age' and default to 0 for bulk imports
    const age = req.body.age || 0;
    // Accept both 'studentEmail' and 'email' (bulk import sends 'email')
    const studentEmail = req.body.studentEmail || req.body.email || null;

    console.log('createStudent (server) received:', {
      lrn: lrn || 'MISSING',
      firstName: firstName || 'MISSING',
      lastName: lastName || 'MISSING',
      age,
      sex: sex || 'MISSING',
      gradeLevel: gradeLevel || 'MISSING',
      section: section || 'MISSING',
      studentEmail: studentEmail || 'MISSING',
      hasPassword: !!password
    });

    // Validate required fields (age is optional for bulk import)
    if (!lrn || !firstName || !lastName || !gradeLevel || !section) {
      const missing = [];
      if (!lrn) missing.push('lrn');
      if (!firstName) missing.push('firstName');
      if (!lastName) missing.push('lastName');
      if (!gradeLevel) missing.push('gradeLevel');
      if (!section) missing.push('section');
      return res.status(400).json({ status: 'fail', message: `Missing required fields: ${missing.join(', ')}` });
    }

    // Check for duplicate LRN
    const existingStudent = await query('SELECT id FROM students WHERE lrn = ?', [lrn]);
    if (existingStudent.length > 0) {
      // Return existing student data instead of error for bulk import tolerance
      const existing = await query('SELECT * FROM students WHERE lrn = ?', [lrn]);
      return res.status(200).json({ message: 'Student already exists', student: formatStudent(existing[0]) });
    }

    // -----------------------------
    // PROFILE PICTURE
    // -----------------------------
    const uploadFolder = path.join(__dirname, '../public/student_profiles');
    fs.mkdirSync(uploadFolder, { recursive: true });

    if (profilePic?.startsWith('data:image/')) {
      const matches = profilePic.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
      if (matches) {
        const imageType = matches[1];
        const base64Data = matches[2];
        const fileName = `profile_${lrn}_${Date.now()}.${imageType}`;
        profilePicPath = path.join(uploadFolder, fileName);
        fs.writeFileSync(profilePicPath, base64Data, 'base64');
        console.log('Profile picture saved:', profilePicPath);
      }
    }
    const safeProfilePic = profilePicPath ? `/student_profiles/${path.basename(profilePicPath)}` : null;

    // -----------------------------
    // QR CODE - Always generate server-side as small data URL
    // (frontend base64 is too large for MySQL packet)
    // JSON format so mobile scanner can parse it consistently
    // -----------------------------
    let safeQRCode;
    try {
      const qrData = JSON.stringify({
        studentId: lrn,
        lrn: lrn,
        name: `${firstName} ${lastName}`.trim(),
        gradeLevel: gradeLevel,
        section: section
      });
      safeQRCode = await QRCode.toDataURL(qrData, { width: 200, margin: 1 });
    } catch (qrErr) {
      console.error('QR generation failed:', qrErr.message);
      safeQRCode = null;
    }

    // -----------------------------
    // HASH PASSWORD - use default if not provided (bulk import)
    // -----------------------------
    const finalPassword = password || 'Password123';
    const hashedPassword = await bcrypt.hash(finalPassword, 12);

    // -----------------------------
    // INSERT INTO DATABASE
    // -----------------------------
    const result = await query(
      `INSERT INTO students (
        lrn, first_name, middle_name, last_name, age, sex,
        grade_level, section, parent_first_name, parent_last_name,
        parent_email, parent_contact, student_email, password,
        profile_pic, qr_code, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [lrn, firstName, middleName || null, lastName, age, sex || 'N/A',
        gradeLevel, section, parentFirstName || null, parentLastName || null,
        parentEmail || null, parentContact || null, studentEmail || null, hashedPassword,
        safeProfilePic, safeQRCode, reqStatus || 'Active', 'admin']
    );

    const createdStudent = {
      id: result.insertId,
      lrn,
      firstName,
      middleName: middleName || null,
      lastName,
      age,
      sex,
      gradeLevel,
      section,
      parentFirstName: parentFirstName || null,
      parentLastName: parentLastName || null,
      parentEmail: parentEmail || null,
      parentContact: parentContact || null,
      studentEmail: studentEmail || null,
      profilePic: safeProfilePic,
      qrCode: safeQRCode,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      role: 'student'
    };

    res.status(201).json({ status: 'success', data: { student: createdStudent } });
  } catch (error) {
    console.error('Error creating student:', error);

    // Cleanup files
    if (profilePicPath && fs.existsSync(profilePicPath)) fs.unlinkSync(profilePicPath);
    if (qrCodePath && fs.existsSync(qrCodePath)) fs.unlinkSync(qrCodePath);

    res.status(500).json({ status: 'fail', message: error.message });
  }
};

// -----------------------------
// GET STUDENTS / SINGLE STUDENT
// -----------------------------
exports.getStudents = async (req, res) => {
  try {
    const { teacherId, gradeLevel, section } = req.query;

    // If teacherId provided, filter to only that teacher's assigned classes
    if (teacherId) {
      let assignedClasses = []; // Array of {gradeLevel, section} objects

      // 1. Check classes table for adviser assignments
      try {
        const classesRows = await query(
          'SELECT grade, section FROM classes WHERE adviser_id = ?',
          [teacherId]
        );
        classesRows.forEach(row => {
          assignedClasses.push({ gradeLevel: row.grade, section: row.section });
        });
        if (classesRows.length > 0) {
          console.log(`[getStudents] Found ${classesRows.length} classes as adviser for teacher ${teacherId}`);
        }
      } catch (classesErr) {
        console.log('[getStudents] classes table lookup failed:', classesErr.message);
      }

      // 2. Check class_assignments table (legacy UUID-based teachers from web)
      try {
        const classAssignments = await query(
          'SELECT grade_level, section FROM class_assignments WHERE adviser_id = ?',
          [teacherId]
        );
        classAssignments.forEach(row => {
          // Avoid duplicates
          const exists = assignedClasses.some(c => c.gradeLevel === row.grade_level && c.section === row.section);
          if (!exists) {
            assignedClasses.push({ gradeLevel: row.grade_level, section: row.section });
          }
        });
        if (classAssignments.length > 0) {
          console.log(`[getStudents] Found ${classAssignments.length} class_assignments for teacher ${teacherId}`);
        }
      } catch (assignErr) {
        console.log('[getStudents] class_assignments lookup failed:', assignErr.message);
      }

      // 3. Check subject_teachers table for subject teacher assignments
      try {
        const subjectTeacherRows = await query(
          'SELECT DISTINCT c.grade, c.section FROM subject_teachers st JOIN classes c ON st.class_id = c.id WHERE st.teacher_id = ?',
          [teacherId]
        );
        subjectTeacherRows.forEach(row => {
          const exists = assignedClasses.some(c => c.gradeLevel === row.grade && c.section === row.section);
          if (!exists) {
            assignedClasses.push({ gradeLevel: row.grade, section: row.section });
          }
        });
        if (subjectTeacherRows.length > 0) {
          console.log(`[getStudents] Found ${subjectTeacherRows.length} classes as subject teacher for teacher ${teacherId}`);
        }
      } catch (stErr) {
        console.log('[getStudents] subject_teachers lookup failed:', stErr.message);
      }

      // 4. Fall back to teachers table (numeric IDs)
      if (assignedClasses.length === 0) {
        try {
          const teacherRows = await query(
            'SELECT grade_level, section FROM teachers WHERE id = ? AND grade_level IS NOT NULL AND section IS NOT NULL LIMIT 1',
            [teacherId]
          );
          if (teacherRows.length > 0) {
            assignedClasses.push({ gradeLevel: teacherRows[0].grade_level, section: teacherRows[0].section });
            console.log(`[getStudents] Found teachers table for teacher ${teacherId}: ${teacherRows[0].grade_level} - ${teacherRows[0].section}`);
          }
        } catch (teacherErr) {
          console.log('[getStudents] teachers table lookup failed:', teacherErr.message);
        }
      }

      // 5. If we found assigned classes, return students from all of them
      if (assignedClasses.length > 0) {
        // Build query for multiple classes
        const conditions = assignedClasses.map(() => '(grade_level = ? AND section = ?)').join(' OR ');
        const params = assignedClasses.flatMap(c => [c.gradeLevel, c.section]);
        
        const filteredStudents = await query(
          `SELECT s.*,
            (SELECT ROUND(AVG(g.grade), 2) FROM grades g WHERE g.student_id = s.id AND g.grade > 0) AS live_average,
            (SELECT ROUND(AVG(g.grade), 2) FROM grades g WHERE g.student_id = s.id AND g.quarter = 'q1' AND g.grade > 0) AS q1_avg,
            (SELECT ROUND(AVG(g.grade), 2) FROM grades g WHERE g.student_id = s.id AND g.quarter = 'q2' AND g.grade > 0) AS q2_avg,
            (SELECT ROUND(AVG(g.grade), 2) FROM grades g WHERE g.student_id = s.id AND g.quarter = 'q3' AND g.grade > 0) AS q3_avg,
            (SELECT ROUND(AVG(g.grade), 2) FROM grades g WHERE g.student_id = s.id AND g.quarter = 'q4' AND g.grade > 0) AS q4_avg
           FROM students s WHERE (${conditions}) ORDER BY s.grade_level, s.section, s.last_name ASC`,
          params
        );
        console.log(`[getStudents] Returning ${filteredStudents.length} students from ${assignedClasses.length} assigned class(es)`);
        return res.status(200).json({ status: 'success', data: filteredStudents.map(formatStudent) });
      }

      // 6. If teacher has no assigned class, return empty array
      console.log(`[getStudents] Teacher ${teacherId} has no assigned class — returning empty`);
      return res.status(200).json({ status: 'success', data: [] });
    }

    // No teacherId — return all students (admin/web use)
    const allDbStudents = await query(`SELECT s.*,
      (SELECT ROUND(AVG(g.grade), 2) FROM grades g WHERE g.student_id = s.id AND g.grade > 0) AS live_average,
      (SELECT ROUND(AVG(g.grade), 2) FROM grades g WHERE g.student_id = s.id AND g.quarter = 'q1' AND g.grade > 0) AS q1_avg,
      (SELECT ROUND(AVG(g.grade), 2) FROM grades g WHERE g.student_id = s.id AND g.quarter = 'q2' AND g.grade > 0) AS q2_avg,
      (SELECT ROUND(AVG(g.grade), 2) FROM grades g WHERE g.student_id = s.id AND g.quarter = 'q3' AND g.grade > 0) AS q3_avg,
      (SELECT ROUND(AVG(g.grade), 2) FROM grades g WHERE g.student_id = s.id AND g.quarter = 'q4' AND g.grade > 0) AS q4_avg
     FROM students s ORDER BY s.created_at DESC`);
    const formattedStudents = allDbStudents.map(formatStudent);
    res.status(200).json({ status: 'success', data: formattedStudents });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

exports.getStudent = async (req, res) => {
  try {
    // Handle both query parameter (studentId) and URL parameter (id)
    const studentId = req.query.studentId || req.params.id;
    
    console.log('🔍 getStudent called with:', {
      query: req.query,
      params: req.params,
      studentId: studentId
    });
    
    if (!studentId) {
      console.log('❌ No studentId provided');
      return res.status(400).json({ status: 'fail', message: 'Student ID is required' });
    }
    
    console.log('🔍 Querying database for student ID:', studentId);
    const students = await query('SELECT * FROM students WHERE id = ?', [studentId]);
    console.log('🔍 Database result:', {
      found: students.length,
      student: students[0] || 'none'
    });
    
    if (students.length === 0) {
      console.log('❌ Student not found in database');
      return res.status(404).json({ status: 'fail', message: 'Student not found' });
    }
    
    const student = students[0];
    const formattedStudent = formatStudent(student);
    const studentLRN = student.lrn; // LRN is used as studentId in attendance table
    
    const normalizeSubjectName = (value = '') => String(value)
      .replace(/\s*\(Grade\s+\d+\)\s*$/i, '')
      .replace(/\s*\(Kindergarten\)\s*$/i, '')
      .trim()
      .toLowerCase();

    const toGradeKey = (gradeLabel = '') => String(gradeLabel).replace(/^Grade\s+/i, '').trim();

    // ======== FETCH GRADES ========
    const gradesRaw = await query(
      'SELECT subject, quarter, grade, created_at FROM grades WHERE student_id = ? ORDER BY subject, quarter',
      [studentId]
    );
    
    // Group grades by subject with quarters
    // Helpers to build grade maps with optional date filtering (per promotion snapshot)
    const buildNormalizedMap = (rows) => {
      const map = {};
      const byNormalized = {};
      for (const g of rows) {
        if (!map[g.subject]) {
          map[g.subject] = { subject: g.subject, q1: null, q2: null, q3: null, q4: null };
        }
        const qKey = (g.quarter || '').toLowerCase();
        const val = g.grade !== null && g.grade !== undefined ? parseFloat(g.grade) : null;
        if (qKey === 'q1') map[g.subject].q1 = val;
        if (qKey === 'q2') map[g.subject].q2 = val;
        if (qKey === 'q3') map[g.subject].q3 = val;
        if (qKey === 'q4') map[g.subject].q4 = val;
      }

      Object.values(map).forEach((g) => {
        const key = normalizeSubjectName(g.subject);
        if (!key) return;
        if (!byNormalized[key]) byNormalized[key] = g;
      });

      return { map, byNormalized };
    };

    // Fetch admin-configured subjects for current grade and ensure they are always shown (even without grades)
    const gradeKey = toGradeKey(student.grade_level);
    const currentGradeSubjectsRows = await query(
      'SELECT name FROM subjects WHERE is_archived = 0 AND FIND_IN_SET(?, grade_levels) ORDER BY name',
      [gradeKey]
    );
    const currentGradeSubjects = currentGradeSubjectsRows.map(r => r.name).filter(Boolean);

    // Identify last promotion into current grade to separate old vs new grades
    let lastPromotionToCurrent = null;
    try {
      const [lastPromoRow] = await query(
        `SELECT created_at FROM promotion_history
         WHERE student_id = ? AND to_grade = ? AND status IN ('promoted','graduated')
         ORDER BY created_at DESC LIMIT 1`,
        [studentId, student.grade_level]
      );
      lastPromotionToCurrent = lastPromoRow?.created_at ? new Date(lastPromoRow.created_at) : null;
    } catch (promoDateErr) {
      console.log('promotion_history (current) lookup skipped:', promoDateErr.message);
    }

    const filteredCurrentGradesRaw = lastPromotionToCurrent
      ? gradesRaw.filter(g => g.created_at && new Date(g.created_at) >= lastPromotionToCurrent)
      : gradesRaw;

    const { byNormalized: currentGradesByNormalized } = buildNormalizedMap(filteredCurrentGradesRaw);

    const currentGradesMap = {};
    currentGradeSubjects.forEach((subjectName) => {
      const normalizedKey = normalizeSubjectName(subjectName);
      const matched = currentGradesByNormalized[normalizedKey] || { q1: null, q2: null, q3: null, q4: null };
      currentGradesMap[subjectName] = {
        subject: subjectName,
        q1: matched.q1 ?? null,
        q2: matched.q2 ?? null,
        q3: matched.q3 ?? null,
        q4: matched.q4 ?? null
      };
    });
    
    // Calculate averages and remarks
    const grades = Object.values(currentGradesMap).map(g => {
      const quarterGrades = [g.q1, g.q2, g.q3, g.q4].filter(x => x !== null && x > 0);
      const average = quarterGrades.length > 0 
        ? (quarterGrades.reduce((a, b) => a + b, 0) / quarterGrades.length).toFixed(2)
        : null;
      const remarks = average ? (parseFloat(average) >= 75 ? 'Passed' : 'Failed') : 'Pending';
      return { ...g, average, remarks };
    });

    // Build previous-grade history (best effort): use promotion_history table if available
    // and map subjects by grade-level configuration so previous records remain visible after promotion.
    let gradeHistory = [];
    try {
      const historyRows = await query(
        `SELECT from_grade, from_section, to_grade, to_section, average, status, created_at
         FROM promotion_history
         WHERE student_id = ?
         ORDER BY created_at DESC`,
        [studentId]
      );

      const previousGrades = [...new Set(
        historyRows
          .map(h => h.from_grade)
          .filter(g => g && g !== student.grade_level)
      )];

      for (const prevGrade of previousGrades) {
        const prevKey = toGradeKey(prevGrade);
        const prevSubjectsRows = await query(
          'SELECT name FROM subjects WHERE is_archived = 0 AND FIND_IN_SET(?, grade_levels) ORDER BY name',
          [prevKey]
        );
        const prevSubjects = prevSubjectsRows.map(r => r.name).filter(Boolean);

        // Use grades recorded up to the promotion date for this previous grade snapshot
        const promoCutoff = historyRows.find(h => h.from_grade === prevGrade)?.created_at || null;
        const gradesBeforePromotion = promoCutoff
          ? gradesRaw.filter(g => g.created_at && new Date(g.created_at) <= new Date(promoCutoff))
          : gradesRaw;
        const { byNormalized: historyGradesByNormalized } = buildNormalizedMap(gradesBeforePromotion);

        const prevGrades = prevSubjects.map(subjectName => {
          const matched = historyGradesByNormalized[normalizeSubjectName(subjectName)] || { q1: null, q2: null, q3: null, q4: null };
          const quarterGrades = [matched.q1, matched.q2, matched.q3, matched.q4].filter(x => x !== null && x > 0);
          const avg = quarterGrades.length > 0
            ? (quarterGrades.reduce((a, b) => a + b, 0) / quarterGrades.length).toFixed(2)
            : null;
          return {
            subject: subjectName,
            q1: matched.q1 ?? null,
            q2: matched.q2 ?? null,
            q3: matched.q3 ?? null,
            q4: matched.q4 ?? null,
            average: avg,
            remarks: avg ? (parseFloat(avg) >= 75 ? 'Passed' : 'Failed') : 'Pending'
          };
        });

        if (prevGrades.length > 0) {
          gradeHistory.push({
            gradeLevel: prevGrade,
            section: historyRows.find(h => h.from_grade === prevGrade)?.from_section || null,
            promotedAt: historyRows.find(h => h.from_grade === prevGrade)?.created_at || null,
            grades: prevGrades
          });
        }
      }
    } catch (historyErr) {
      // promotion_history may not exist yet in some environments; ignore safely
      console.log('promotion_history lookup skipped:', historyErr.message);
    }
    
    // ======== FETCH ATTENDANCE ========
    // Mobile app uses LRN as studentId, so we search by both LRN and student ID
    const attendanceRaw = await query(
      `SELECT date, status, time, period 
       FROM attendance 
       WHERE studentId = ? OR studentId = ?
       ORDER BY date DESC 
       LIMIT 100`,
      [studentLRN, studentId]
    );
    
    // Group attendance by month for report card format
    const months = ['Aug', 'Sept', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const attendanceSummary = {};
    months.forEach(m => {
      attendanceSummary[m] = { present: 0, absent: 0, late: 0 };
    });
    
    for (const att of attendanceRaw) {
      const date = new Date(att.date);
      const monthIndex = date.getMonth();
      // Map month to school year (Aug=0 in school year counting)
      const monthName = months[monthIndex >= 7 ? monthIndex - 7 : monthIndex + 5] || null;
      if (monthName && attendanceSummary[monthName]) {
        const status = (att.status || '').toLowerCase();
        if (status === 'present') attendanceSummary[monthName].present++;
        else if (status === 'absent') attendanceSummary[monthName].absent++;
        else if (status === 'late') attendanceSummary[monthName].late++;
      }
    }
    
    // ======== FETCH SCHEDULE (from subject_teachers) ========
    const gradeLevel = student.grade_level;
    const section = student.section;
    const classId = `${gradeLevel.toLowerCase().replace(/\s+/g, '-')}-${section.toLowerCase()}`;
    
    const scheduleRaw = await query(
      `SELECT subject, teacher_name, day, start_time, end_time 
       FROM subject_teachers 
       WHERE class_id = ? 
       ORDER BY 
         FIELD(day, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
         start_time`,
      [classId]
    );

    // Previous schedule snapshots (captured at promotion time)
    let previousScheduleHistory = [];
    try {
      const scheduleHistoryRows = await query(
        `SELECT from_grade, from_section, to_grade, to_section, status, created_at, details_json
         FROM promotion_history
         WHERE student_id = ? AND status IN ('promoted', 'graduated')
         ORDER BY created_at DESC`,
        [studentId]
      );

      previousScheduleHistory = scheduleHistoryRows
        .map((row) => {
          let details = {};
          try {
            details = typeof row.details_json === 'string'
              ? JSON.parse(row.details_json || '{}')
              : (row.details_json || {});
          } catch (_) {
            details = {};
          }

          const snapshot = Array.isArray(details.previousSchedule) ? details.previousSchedule : [];
          if (snapshot.length === 0) return null;

          return {
            fromGrade: row.from_grade || null,
            fromSection: row.from_section || null,
            toGrade: row.to_grade || null,
            toSection: row.to_section || null,
            status: row.status || null,
            promotedAt: row.created_at || null,
            schedule: snapshot
          };
        })
        .filter(Boolean);
    } catch (scheduleHistoryErr) {
      console.log('previous schedule history lookup skipped:', scheduleHistoryErr.message);
    }
    
    // Also get adviser info for the class with fallbacks for legacy/alternate class IDs.
    let adviserName = null;

    try {
      const classInfoById = await query(
        'SELECT adviser_name FROM classes WHERE id = ? LIMIT 1',
        [classId]
      );
      adviserName = classInfoById[0]?.adviser_name || null;
    } catch (classIdErr) {
      console.log('classes by id lookup failed:', classIdErr.message);
    }

    if (!adviserName) {
      try {
        const classInfoByGradeSection = await query(
          `SELECT adviser_name
           FROM classes
           WHERE (grade = ? OR grade = ? OR REPLACE(LOWER(grade), 'grade ', '') = LOWER(?))
             AND section = ?
           LIMIT 1`,
          [student.grade_level, toGradeKey(student.grade_level), toGradeKey(student.grade_level), student.section]
        );
        adviserName = classInfoByGradeSection[0]?.adviser_name || null;
      } catch (classGradeErr) {
        console.log('classes by grade/section lookup failed:', classGradeErr.message);
      }
    }

    if (!adviserName) {
      try {
        const adviserFromAssignment = await query(
          `SELECT t.full_name AS adviser_name
           FROM class_assignments ca
           JOIN classes c ON ca.class_id = c.id
           JOIN teachers t ON ca.teacher_id = t.id
           WHERE (c.grade = ? OR c.grade = ? OR REPLACE(LOWER(c.grade), 'grade ', '') = LOWER(?))
             AND c.section = ?
           LIMIT 1`,
          [student.grade_level, toGradeKey(student.grade_level), toGradeKey(student.grade_level), student.section]
        );
        adviserName = adviserFromAssignment[0]?.adviser_name || null;
      } catch (assignmentErr) {
        console.log('class_assignments adviser lookup failed:', assignmentErr.message);
      }
    }
    
    // Calculate overall average for profile
    const allAverages = grades.map(g => parseFloat(g.average)).filter(x => x > 0);
    const overallAverage = allAverages.length > 0 
      ? (allAverages.reduce((a, b) => a + b, 0) / allAverages.length).toFixed(2)
      : 'N/A';
    
    formattedStudent.average = overallAverage;
    formattedStudent.grades = grades;
    formattedStudent.gradeHistory = gradeHistory;
    formattedStudent.attendance = attendanceRaw;
    formattedStudent.attendanceSummary = attendanceSummary;
    formattedStudent.schedule = scheduleRaw;
    formattedStudent.previousScheduleHistory = previousScheduleHistory;
    formattedStudent.adviserName = adviserName;
    
    console.log('✅ Student portal data loaded:', {
      gradesCount: grades.length,
      attendanceCount: attendanceRaw.length,
      scheduleCount: scheduleRaw.length
    });
    
    res.status(200).json({ status: 'success', data: { student: formattedStudent } });
  } catch (error) {
    console.error('❌ Error fetching student:', error);
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

// -----------------------------
// PENDING / DECLINED
// -----------------------------
exports.getPendingStudents = async (req, res) => {
  try {
    const pending = await query('SELECT * FROM students WHERE status = "pending" ORDER BY created_at DESC');
    res.json({ status: 'success', data: { students: pending.map(formatStudent) } });
  } catch (error) {
    console.error('Error fetching pending students:', error);
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

exports.getDeclinedStudents = async (req, res) => {
  try {
    const declined = await query('SELECT * FROM students WHERE status = "declined" ORDER BY updated_at DESC');
    res.json({ status: 'success', data: { students: declined.map(formatStudent) } });
  } catch (error) {
    console.error('Error fetching declined students:', error);
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

// -----------------------------
// APPROVE STUDENT
// -----------------------------
exports.approveStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      'UPDATE students SET status = "approved", updated_at = NOW() WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) 
      return res.status(404).json({ message: 'Student not found' });

    // Return the updated student
    const [updatedStudent] = await query('SELECT * FROM students WHERE id = ?', [id]);

    res.json({
      status: 'success',
      message: 'Student approved successfully',
      data: { student: formatStudent(updatedStudent) }
    });
  } catch (error) {
    console.error('Error approving student:', error);
    res.status(500).json({ message: 'Error approving student', error: error.message });
  }
};

// -----------------------------
// DECLINE STUDENT
// -----------------------------
exports.declineStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await query(
      'UPDATE students SET status = "declined", decline_reason = ?, updated_at = NOW() WHERE id = ?',
      [reason || null, id]
    );

    if (result.affectedRows === 0) 
      return res.status(404).json({ message: 'Student not found' });

    const [updatedStudent] = await query('SELECT * FROM students WHERE id = ?', [id]);

    res.json({
      status: 'success',
      message: 'Student declined successfully',
      data: { student: formatStudent(updatedStudent) }
    });
  } catch (error) {
    console.error('Error declining student:', error);
    res.status(500).json({ message: 'Error declining student', error: error.message });
  }
};

// -----------------------------
// RESTORE STUDENT
// -----------------------------
exports.restoreStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'UPDATE students SET status = "pending", decline_reason = NULL, updated_at = NOW() WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) 
      return res.status(404).json({ message: 'Student not found' });

    const [updatedStudent] = await query('SELECT * FROM students WHERE id = ?', [id]);

    res.json({
      status: 'success',
      message: 'Student restored successfully',
      data: { student: formatStudent(updatedStudent) }
    });
  } catch (error) {
    console.error('Error restoring student:', error);
    res.status(500).json({ message: 'Error restoring student', error: error.message });
  }
};

// -----------------------------
// ALIASES
// -----------------------------
exports.getAllStudents = exports.getStudents;
exports.getStudentById = exports.getStudent;

// -----------------------------
// REGENERATE ALL QR CODES (JSON format)
// Call POST /api/students/regenerate-qr to fix existing students
// -----------------------------
exports.regenerateQRCodes = async (req, res) => {
  try {
    const allStudents = await query('SELECT id, lrn, first_name, last_name, grade_level, section FROM students');
    let updated = 0;
    let failed = 0;

    for (const s of allStudents) {
      try {
        const qrPayload = JSON.stringify({
          studentId: s.lrn,
          lrn: s.lrn,
          name: `${s.first_name} ${s.last_name}`.trim(),
          gradeLevel: s.grade_level,
          section: s.section
        });
        const newQR = await QRCode.toDataURL(qrPayload, { width: 200, margin: 1 });
        await query('UPDATE students SET qr_code = ? WHERE id = ?', [newQR, s.id]);
        updated++;
      } catch (err) {
        console.error(`QR regen failed for student ${s.id}:`, err.message);
        failed++;
      }
    }

    res.json({ status: 'success', message: `QR codes regenerated: ${updated} updated, ${failed} failed` });
  } catch (error) {
    console.error('Error regenerating QR codes:', error);
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

// -----------------------------
// UPDATE STUDENT
// -----------------------------
exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      lrn, firstName, middleName, lastName, age, sex,
      gradeLevel, section,
      parentFirstName, parentLastName, parentEmail, parentContact,
      studentEmail, status
    } = req.body;

    console.log('updateStudent called with id:', id);
    console.log('Update data:', req.body);

    // Check if student exists
    const existingStudents = await query('SELECT * FROM students WHERE id = ?', [id]);
    if (!existingStudents || existingStudents.length === 0) {
      return res.status(404).json({ status: 'fail', message: 'Student not found' });
    }

    // Build update query dynamically based on provided fields
    const updates = [];
    const params = [];

    if (lrn !== undefined) { updates.push('lrn = ?'); params.push(lrn); }
    if (firstName !== undefined) { updates.push('first_name = ?'); params.push(firstName); }
    if (middleName !== undefined) { updates.push('middle_name = ?'); params.push(middleName); }
    if (lastName !== undefined) { updates.push('last_name = ?'); params.push(lastName); }
    if (age !== undefined) { updates.push('age = ?'); params.push(age); }
    if (sex !== undefined) { updates.push('sex = ?'); params.push(sex); }
    if (gradeLevel !== undefined) { updates.push('grade_level = ?'); params.push(gradeLevel); }
    if (section !== undefined) { updates.push('section = ?'); params.push(section); }
    if (parentFirstName !== undefined) { updates.push('parent_first_name = ?'); params.push(parentFirstName); }
    if (parentLastName !== undefined) { updates.push('parent_last_name = ?'); params.push(parentLastName); }
    if (parentEmail !== undefined) { updates.push('parent_email = ?'); params.push(parentEmail); }
    if (parentContact !== undefined) { updates.push('parent_contact = ?'); params.push(parentContact); }
    if (studentEmail !== undefined) { updates.push('student_email = ?'); params.push(studentEmail); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }

    // Always update the updated_at timestamp
    updates.push('updated_at = NOW()');

    if (updates.length === 1) {
      // Only updated_at, no real changes
      return res.status(400).json({ status: 'fail', message: 'No fields to update' });
    }

    params.push(id);
    const sql = `UPDATE students SET ${updates.join(', ')} WHERE id = ?`;
    
    console.log('Executing SQL:', sql);
    console.log('With params:', params);

    const result = await query(sql, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 'fail', message: 'Student not found or no changes made' });
    }

    // Return updated student
    const updatedStudents = await query('SELECT * FROM students WHERE id = ?', [id]);
    res.json({
      status: 'success',
      message: 'Student updated successfully',
      data: { student: formatStudent(updatedStudents[0]) }
    });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

// -----------------------------
// DELETE STUDENT
// -----------------------------
exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('deleteStudent called with id:', id);

    // Check if student exists
    const existingStudents = await query('SELECT * FROM students WHERE id = ?', [id]);
    if (!existingStudents || existingStudents.length === 0) {
      return res.status(404).json({ status: 'fail', message: 'Student not found' });
    }

    // Delete the student
    const result = await query('DELETE FROM students WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 'fail', message: 'Student not found' });
    }

    res.json({
      status: 'success',
      message: 'Student deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ status: 'fail', message: error.message });
  }
};