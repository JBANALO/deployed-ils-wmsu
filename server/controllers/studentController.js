// server/controllers/studentController.js
const { query, isDatabaseAvailable } = require('../config/database');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

// -----------------------------
// HELPER: generate QR Code
// -----------------------------
async function generateQRCode(studentData) {
  const qrData = JSON.stringify({
    lrn: studentData.lrn,
    name: `${studentData.firstName} ${studentData.middleName || ''} ${studentData.lastName}`.trim(),
    gradeLevel: studentData.gradeLevel,
    section: studentData.section,
    studentEmail: studentData.studentEmail
  });

  return await QRCode.toDataURL(qrData, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' }
  });
}

// -----------------------------
// CREATE STUDENT
// -----------------------------
exports.createStudent = async (req, res) => {
  try {
    const {
      lrn,
      firstName,
      middleName,
      lastName,
      age,
      sex,
      parentFirstName,
      parentLastName,
      parentEmail,
      parentContact,
      studentEmail,
      password,
      gradeLevel,
      section
    } = req.body;

    if (!lrn || !firstName || !lastName || !age || !sex || !gradeLevel || !section || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Missing required student fields'
      });
    }

    // -----------------------------
    // CHECK DUPLICATE LRN
    // -----------------------------
    const existingStudent = await query('SELECT id FROM students WHERE lrn = ?', [lrn]);
    if (existingStudent.length > 0) {
      return res.status(400).json({ status: 'fail', message: 'LRN already exists' });
    }

    // -----------------------------
    // PROFILE PICTURE
    // -----------------------------
    let profilePicPath = null;
    if (req.files && req.files.profilePic) {
      const profilePic = req.files.profilePic;
      const fileName = `profile_${lrn}_${Date.now()}.${profilePic.name.split('.').pop()}`;
      profilePicPath = path.join(__dirname, '../public/profiles', fileName);
      fs.mkdirSync(path.dirname(profilePicPath), { recursive: true });
      fs.renameSync(profilePic.path, profilePicPath);
    }
    const safeProfilePic = profilePicPath ? `/profiles/${path.basename(profilePicPath)}` : null;

    const qrCodeFileName = `qr_${lrn}_${Date.now()}.png`;
    const qrCodePath = path.join(__dirname, '../public/qrcodes', qrCodeFileName);
    fs.mkdirSync(path.dirname(qrCodePath), { recursive: true });

    const qrDataURL = await generateQRCode({
      lrn,
      firstName,
      middleName: middleName || '',
      lastName,
      gradeLevel,
      section,
      studentEmail
    });

    // Convert Data URL to binary and save as PNG file
    const base64Data = qrDataURL.replace(/^data:image\/png;base64,/, "");
    fs.writeFileSync(qrCodePath, base64Data, 'base64');

    const safeQRCode = `/qrcodes/${qrCodeFileName}`;

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
      [ lrn, firstName, middleName || null, lastName, age, sex,
        gradeLevel, section, parentFirstName || null, parentLastName || null,
        parentEmail || null, parentContact || null, studentEmail || null, password,
        safeProfilePic, safeQRCode, 'pending', 'admin' ]
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
      updatedAt: new Date().toISOString()
    };

    res.status(201).json({ status: 'success', data: { student: createdStudent } });
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

// -----------------------------
// GET ALL STUDENTS
// -----------------------------
exports.getStudents = async (req, res) => {
  try {
    if (!isDatabaseAvailable()) {
      const Student = require('../models/Student');
      const allStudents = await Student.findAll();
      return res.status(200).json({ status: 'success', data: allStudents });
    }

    const allDbStudents = await query(
      `SELECT * FROM students ORDER BY created_at DESC`
    );

    const formattedStudents = allDbStudents.map(s => ({
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
      qrCode: s.qr_code,
      status: s.status,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }));

    res.status(200).json({ status: 'success', data: formattedStudents });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

exports.getStudent = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isDatabaseAvailable()) {
      const Student = require('../models/Student');
      const student = await Student.findById(id);
      if (!student) return res.status(404).json({ status: 'fail', message: 'Student not found' });
      return res.status(200).json({ status: 'success', data: { student } });
    }

    const students = await query('SELECT * FROM students WHERE id = ?', [id]);
    if (students.length === 0) return res.status(404).json({ status: 'fail', message: 'Student not found' });

    const s = students[0];
    const formattedStudent = {
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
      qrCode: s.qr_code,
      status: s.status,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    };

    res.status(200).json({ status: 'success', data: { student: formattedStudent } });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

// -----------------------------
// PENDING STUDENTS
// -----------------------------
exports.getPendingStudents = async (req, res) => {
  try {
    if (!isDatabaseAvailable()) return res.json({ status: 'success', data: { students: [] } });

    const pendingStudents = await query('SELECT * FROM students WHERE status = "pending" ORDER BY created_at DESC');
    const formattedStudents = pendingStudents.map(s => ({
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
      qrCode: s.qr_code,
      status: s.status,
      createdAt: s.created_at,
      role: 'student'
    }));

    res.json({ status: 'success', data: { students: formattedStudents }, message: `Found ${formattedStudents.length} pending student(s)` });
  } catch (error) {
    console.error('Error fetching pending students:', error);
    res.status(500).json({ message: 'Error fetching pending students', error: error.message });
  }
};

// -----------------------------
// DECLINED STUDENTS
// -----------------------------
exports.getDeclinedStudents = async (req, res) => {
  try {
    if (!isDatabaseAvailable()) return res.status(400).json({ message: 'Database not available' });

    const declinedStudents = await query('SELECT * FROM students WHERE status = "declined" ORDER BY updated_at DESC');
    const formattedStudents = declinedStudents.map(s => ({
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
      qrCode: s.qr_code,
      status: s.status,
      declineReason: s.decline_reason || 'No reason provided',
      createdAt: s.created_at,
      updatedAt: s.updated_at,
      role: 'student'
    }));

    res.json({
      status: 'success',
      data: { students: formattedStudents },
      message: `Found ${formattedStudents.length} declined student(s)`
    });
  } catch (error) {
    console.error('Error fetching declined students:', error);
    res.status(500).json({ message: 'Error fetching declined students', error: error.message });
  }
};

// -----------------------------
// APPROVE / DECLINE / RESTORE
// -----------------------------
exports.approveStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('UPDATE students SET status = "approved", updated_at = NOW() WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Student not found' });
    res.json({ message: 'Student approved successfully' });
  } catch (error) {
    console.error('Error approving student:', error);
    res.status(500).json({ message: 'Error approving student', error: error.message });
  }
};

exports.declineStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const result = await query('UPDATE students SET status = "declined", decline_reason = ?, updated_at = NOW() WHERE id = ?', [reason || null, id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Student not found' });
    res.json({ message: 'Student declined successfully' });
  } catch (error) {
    console.error('Error declining student:', error);
    res.status(500).json({ message: 'Error declining student', error: error.message });
  }
};

exports.restoreStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('UPDATE students SET status = "pending", decline_reason = NULL, updated_at = NOW() WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Student not found' });
    res.json({ message: 'Student restored successfully' });
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