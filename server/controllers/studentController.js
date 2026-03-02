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
  const qrData = `LRN: ${studentData.lrn}
Full Name: ${studentData.lastName}, ${studentData.firstName} ${studentData.middleName || ''}
Class: ${studentData.gradeLevel} - ${studentData.section}
Email: ${studentData.studentEmail}
Department: ILS - Elementary Department
School: Western Mindanao State University`;

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
    // -----------------------------
    let safeQRCode;
    try {
      const qrData = `${lrn}|${firstName} ${lastName}|${gradeLevel}|${section}`;
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
    const allDbStudents = await query('SELECT * FROM students ORDER BY created_at DESC');
    const formattedStudents = allDbStudents.map(formatStudent);
    res.status(200).json({ status: 'success', data: formattedStudents });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

exports.getStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const students = await query('SELECT * FROM students WHERE id = ?', [id]);
    if (students.length === 0) return res.status(404).json({ status: 'fail', message: 'Student not found' });
    res.status(200).json({ status: 'success', data: { student: formatStudent(students[0]) } });
  } catch (error) {
    console.error('Error fetching student:', error);
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