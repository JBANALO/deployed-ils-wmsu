// server/controllers/studentController.js
const { query, isDatabaseAvailable } = require('../config/database');

  // Generate QR Code for the student and save as file
  const fs = require('fs');
  const path = require('path');
  const QRCode = require('qrcode');

// Helper function to generate QR Code
async function generateQRCode(studentData) {
  const qrData = JSON.stringify({
    lrn: studentData.lrn,
    name: `${studentData.firstName} ${studentData.middleName} ${studentData.lastName}`,
    gradeLevel: studentData.gradeLevel,
    section: studentData.section,
    email: studentData.wmsuEmail
  });
  
  return await require('qrcode').toDataURL(qrData, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' }
  });
}

// -----------------------------
// CREATE
// -----------------------------
exports.createStudent = async (req, res) => {
  try {
    const { gradeLevel } = req.body;

    console.log('Creating student with gradeLevel:', gradeLevel);
    console.log('Request body:', req.body);

    // -----------------------------
    // DATABASE CHECK
    // -----------------------------
    if (!isDatabaseAvailable()) {
      console.log('Database not available, falling back to file storage...');

      const Student = require('../models/Student');

      const studentData = {
        ...req.body,
        qrCode: await generateQRCode(req.body),
        status: 'active'
      };

      const student = await Student.create(studentData);

      return res.status(201).json({
        status: 'success',
        data: { student }
      });
    }

    // -----------------------------
    // EXTRACT FIELDS
    // -----------------------------
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
      wmsuEmail,
      student_email,
      password,
      section
    } = req.body;

    const safeWmsuEmail = wmsuEmail || student_email || null;
    const safePassword = password || null;

    // -----------------------------
    // ✅ REQUIRED FIELD VALIDATION
    // -----------------------------
    if (
      !lrn ||
      !firstName ||
      !lastName ||
      !age ||
      !sex ||
      !gradeLevel ||
      !section ||
      !safePassword
    ) {
      return res.status(400).json({
        status: 'fail',
        message: 'Missing required student fields'
      });
    }

    // -----------------------------
    // SAFE OPTIONAL FIELDS
    // -----------------------------
    const safeMiddleName = middleName || null;
    const safeParentFirstName = parentFirstName || null;
    const safeParentLastName = parentLastName || null;
    const safeParentEmail = parentEmail || null;
    const safeParentContact = parentContact || null;

    // -----------------------------
    // PROFILE PICTURE UPLOAD
    // -----------------------------
    let profilePicPath = null;

    if (req.files && req.files.profilePic) {
      const profilePic = req.files.profilePic;
      const profilePicFileName =
        `profile_${lrn}_${Date.now()}.${profilePic.name.split('.').pop()}`;

      profilePicPath = path.join(
        __dirname,
        '../public/profiles',
        profilePicFileName
      );

      const profilesDir = path.dirname(profilePicPath);
      if (!fs.existsSync(profilesDir)) {
        fs.mkdirSync(profilesDir, { recursive: true });
      }

      fs.renameSync(profilePic.path, profilePicPath);
    }

    const safeProfilePic = profilePicPath
      ? `/profiles/${path.basename(profilePicPath)}`
      : null;

    // -----------------------------
    // QR CODE GENERATION
    // -----------------------------
    const qrCodeFileName = `qr_${lrn}_${Date.now()}.png`;
    const qrCodePath = path.join(
      __dirname,
      '../public/qrcodes',
      qrCodeFileName
    );

    const qrcodesDir = path.dirname(qrCodePath);
    if (!fs.existsSync(qrcodesDir)) {
      fs.mkdirSync(qrcodesDir, { recursive: true });
    }

    const qrData = {
      lrn,
      firstName,
      middleName: middleName || '',
      lastName,
      fullName: `${firstName} ${middleName || ''} ${lastName}`.trim(),
      gradeLevel,
      section,
      studentEmail: safeWmsuEmail
    };

    await QRCode.toFile(qrCodePath, JSON.stringify(qrData), {
      width: 200,
      margin: 1
    });

    const safeQRCode = `/qrcodes/${qrCodeFileName}`;

    // -----------------------------
    // DUPLICATE LRN CHECK
    // -----------------------------
    const existingStudent = await query(
      'SELECT id FROM students WHERE lrn = ?',
      [lrn]
    );

    if (existingStudent.length > 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'LRN already exists. Please use a different LRN.'
      });
    }

    // -----------------------------
    // INSERT INTO DATABASE
    // -----------------------------
    const result = await query(
      `INSERT INTO students (
        id,
        lrn,
        first_name,
        middle_name,
        last_name,
        age,
        sex,
        grade_level,
        section,
        parent_first_name,
        parent_last_name,
        parent_email,
        parent_contact,
        student_email,
        password,
        profile_pic,
        qr_code,
        status,
        created_by,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        null,
        lrn,
        firstName,
        safeMiddleName,
        lastName,
        age,
        sex,
        gradeLevel,
        section,
        safeParentFirstName,
        safeParentLastName,
        safeParentEmail,
        safeParentContact,
        safeWmsuEmail,
        safePassword,
        safeProfilePic,
        safeQRCode,
        'pending',
        'admin'
      ]
    );

    // -----------------------------
    // SUCCESS RESPONSE
    // -----------------------------
    const createdStudent = {
      id: result.insertId,
      lrn,
      firstName,
      middleName,
      lastName,
      age,
      sex,
      gradeLevel,
      section,
      parentFirstName,
      parentLastName,
      parentEmail,
      parentContact,
      wmsuEmail: safeWmsuEmail,
      profilePic: safeProfilePic,
      qrCode: safeQRCode,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return res.status(201).json({
      status: 'success',
      data: { student: createdStudent }
    });

  } catch (error) {
    console.error('Error creating student:', error);
    return res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
};

// -----------------------------
// READ
// -----------------------------
exports.getStudents = async (req, res) => {
  try {
    // Check if database is available
    if (!isDatabaseAvailable()) {
      console.log('Database not available, fetching from file storage...');
      
      // Fall back to file storage
      const Student = require('../models/Student');
      const allStudents = await Student.findAll();
      
      res.status(200).json({ status: 'success', data: allStudents });
      return;
    }
    
    // Database is available, fetch from students table
    console.log('Fetching students from database...');
    
    // Get all students from database (both pending and approved)
    const allDbStudents = await query(
      'SELECT id, lrn, first_name, middle_name, last_name, age, sex, grade_level, section, ' +
      'student_email, profile_pic, qr_code, status, attendance, average, ' +
      'created_by, created_at, updated_at FROM students ORDER BY created_at DESC'
    );
      
      // Format students to match expected structure
      const formattedStudents = allDbStudents.map(student => ({
        id: student.id,
        lrn: student.lrn,
        firstName: student.first_name,
        middleName: student.middle_name,
        lastName: student.last_name,
        fullName: `${student.first_name} ${student.middle_name} ${student.last_name}`.trim(),
        age: student.age,
        sex: student.sex,
        gradeLevel: student.grade_level,
        section: student.section,
        parentFirstName: '', // These columns don't exist in your current database
        parentLastName: '',
        parentEmail: '',
        parentContact: '',
        wmsuEmail: student.student_email,
        profilePic: student.profile_pic,
        qrCode: student.qr_code,
        status: student.status || 'Active',
        attendance: student.attendance || '0%',
        average: student.average || 0,
        created_by: student.created_by || 'admin',
        createdAt: student.created_at,
        updatedAt: student.updated_at
      }));
      
      res.status(200).json({ status: 'success', data: formattedStudents });
    } catch (error) {
      console.error('Error fetching students from database:', error.message);
      res.status(400).json({ status: 'fail', message: error.message });
    }
  };

exports.getStudent = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if database is available
    if (!isDatabaseAvailable()) {
      // Fall back to file storage
      const Student = require('../models/Student');
      const student = await Student.findById(id);
      
      if (!student) return res.status(404).json({ status: 'fail', message: 'Student not found' });
      res.status(200).json({ status: 'success', data: { student } });
      return;
    }
    
    // Database is available, fetch from students table
    try {
      const students = await query(
        'SELECT id, lrn, first_name, middle_name, last_name, age, sex, grade_level, section, ' +
        'student_email, profile_pic, qr_code, status, created_at, updated_at FROM students WHERE id = ?',
        [id]
      );
      
      if (students.length === 0) {
        return res.status(404).json({ status: 'fail', message: 'Student not found' });
      }
      
      const student = students[0];
      const formattedStudent = {
        id: student.id,
        lrn: student.lrn,
        firstName: student.first_name,
        middleName: student.middle_name,
        lastName: student.last_name,
        fullName: `${student.first_name} ${student.middle_name} ${student.last_name}`.trim(),
        age: student.age,
        sex: student.sex,
        gradeLevel: student.grade_level,
        section: student.section,
        parentFirstName: '', // These columns don't exist in your current database
        parentLastName: '',
        parentEmail: '',
        parentContact: '',
        wmsuEmail: student.student_email,
        profilePic: student.profile_pic,
        qrCode: student.qr_code,
        status: student.status || 'Active',
        createdAt: student.created_at,
        updatedAt: student.updated_at
      };
      
      res.status(200).json({ status: 'success', data: { student: formattedStudent } });
    } catch (error) {
      console.error('Error fetching student:', error.message);
      res.status(400).json({ status: 'fail', message: error.message });
    }
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

// Get pending students for AdminApprovals
exports.getPendingStudents = async (req, res) => {
  try {
    console.log('Fetching pending students from database...');
    
    // Check if database is available
    if (!isDatabaseAvailable()) {
      console.log('Database not available, no pending students to show');
      return res.json({ 
        status: 'success', 
        data: { students: [] }, 
        message: 'Database not available' 
      });
    }
    
    try {
      // Get pending students from students table
      const pendingStudents = await query(
        'SELECT id, lrn, first_name, middle_name, last_name, age, sex, grade_level, section, ' +
        'student_email, profile_pic, qr_code, status, created_at FROM students WHERE status = "pending" ORDER BY created_at DESC'
      );
      
      console.log('Found pending students:', pendingStudents.length);
      
      // Format students to match expected structure
      const formattedStudents = pendingStudents.map(student => ({
        id: student.id,
        lrn: student.lrn,
        firstName: student.first_name,
        middleName: student.middle_name,
        lastName: student.last_name,
        fullName: `${student.first_name} ${student.middle_name} ${student.last_name}`.trim(),
        age: student.age,
        sex: student.sex,
        gradeLevel: student.grade_level,
        section: student.section,
        parentFirstName: '', // These columns don't exist in your current database
        parentLastName: '',
        parentEmail: '',
        parentContact: '',
        wmsuEmail: student.student_email,
        profilePic: student.profile_pic,
        qrCode: student.qr_code,
        status: student.status || 'pending',
        createdAt: student.created_at,
        role: 'student' // Add role field for AdminApprovals filtering
      }));
      
      res.json({ 
        status: 'success',
        data: { students: formattedStudents }, 
        message: `Found ${formattedStudents.length} pending student(s)`
      });
    } catch (error) {
      console.error('Error fetching pending students:', error);
      res.status(500).json({ message: 'Error fetching pending students', error: error.message });
    }
  } catch (error) {
    console.error('Error in getPendingStudents:', error);
    res.status(500).json({ message: 'Error fetching pending students', error: error.message });
  }
};

// Approve student (change status from pending to approved)
exports.approveStudent = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Approving student with ID:', id);
    
    // Check if database is available
    if (!isDatabaseAvailable()) {
      return res.status(400).json({ message: 'Database not available' });
    }
    
    try {
      const result = await query(
        'UPDATE students SET status = "approved", updated_at = NOW() WHERE id = ?',
        [id]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Student not found' });
      }
      
      console.log('Student approved successfully');
      res.json({ message: 'Student approved successfully' });
    } catch (error) {
      console.error('Error approving student:', error);
      res.status(500).json({ message: 'Error approving student', error: error.message });
    }
  } catch (error) {
    console.error('Error in approveStudent:', error);
    res.status(500).json({ message: 'Error approving student', error: error.message });
  }
};

// Decline student (mark as declined instead of deleting)
exports.declineStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    console.log('Declining student with ID:', id, 'Reason:', reason);
    
    // Check if database is available
    if (!isDatabaseAvailable()) {
      return res.status(400).json({ message: 'Database not available' });
    }
    
    try {
      const result = await query('UPDATE students SET status = "declined", decline_reason = ?, updated_at = NOW() WHERE id = ?', [reason || null, id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Student not found' });
      }
      
      console.log('Student declined successfully with reason:', reason);
      res.json({ message: 'Student declined successfully' });
    } catch (error) {
      console.error('Error declining student:', error);
      res.status(500).json({ message: 'Error declining student', error: error.message });
    }
  } catch (error) {
    console.error('Error in declineStudent:', error);
    res.status(500).json({ message: 'Error declining student', error: error.message });
  }
};

// Get declined students
exports.getDeclinedStudents = async (req, res) => {
  try {
    // Check if database is available
    if (!isDatabaseAvailable()) {
      return res.status(400).json({ message: 'Database not available' });
    }
    
    try {
      // Get declined students from database
      const declinedStudents = await query(
        'SELECT id, lrn, first_name, middle_name, last_name, age, sex, grade_level, section, ' +
        'student_email, profile_pic, qr_code, status, decline_reason, created_at, updated_at FROM students WHERE status = "declined" ORDER BY updated_at DESC'
      );
      
      console.log('Found declined students:', declinedStudents.length);
      
      // Format students to match expected structure
      const formattedStudents = declinedStudents.map(student => ({
        id: student.id,
        lrn: student.lrn,
        firstName: student.first_name,
        middleName: student.middle_name,
        lastName: student.last_name,
        fullName: `${student.first_name} ${student.middle_name} ${student.last_name}`.trim(),
        age: student.age,
        sex: student.sex,
        gradeLevel: student.grade_level,
        section: student.section,
        parentFirstName: '', // These columns don't exist in your current database
        parentLastName: '',
        parentEmail: '',
        parentContact: '',
        wmsuEmail: student.student_email,
        profilePic: student.profile_pic,
        qrCode: student.qr_code,
        status: student.status || 'declined',
        declineReason: student.decline_reason || 'No reason provided',
        createdAt: student.created_at,
        updatedAt: student.updated_at,
        role: 'student' // Add role field for AdminApprovals filtering
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
  } catch (error) {
    res.status(400).json({ message: 'Error fetching declined students', error: error.message });
  }
};

// -----------------------------
// Restore student (mark as pending again)
exports.restoreStudent = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Restoring student with ID:', id);
    
    // Check if database is available
    if (!isDatabaseAvailable()) {
      return res.status(400).json({ message: 'Database not available' });
    }
    
    try {
      const result = await query('UPDATE students SET status = "pending", decline_reason = NULL, updated_at = NOW() WHERE id = ?', [id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Student not found' });
      }
      
      console.log('Student restored successfully');
      res.json({ message: 'Student restored successfully' });
    } catch (error) {
      console.error('Error restoring student:', error);
      res.status(500).json({ message: 'Error restoring student', error: error.message });
    }
  } catch (error) {
    console.error('Error in restoreStudent:', error);
    res.status(500).json({ message: 'Error restoring student', error: error.message });
  }
};

// ALIASES TO MATCH ROUTES
// -----------------------------
exports.getAllStudents = exports.getStudents;
exports.getStudentById = exports.getStudent;
