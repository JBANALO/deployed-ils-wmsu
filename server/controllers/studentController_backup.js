// server/controllers/studentController.js
const { query, isDatabaseAvailable } = require('../config/database');

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
    
    // Check if database is available
    if (!isDatabaseAvailable()) {
      console.log('Database not available, falling back to file storage...');
      
      // Fall back to file storage
      const Student = require('../models/Student');
      const studentData = {
        ...req.body,
        qrCode: await generateQRCode(req.body),
        status: 'active' // File storage students are active by default
      };
      
      const student = await Student.create(studentData);
      console.log('Student created successfully in file storage');
      
      res.status(201).json({ status: 'success', data: { student } });
      return;
    }
    
    // Database is available, proceed with database insertion
    const {
      lrn, firstName, middleName, lastName, age, sex,
      parentFirstName, parentLastName, parentEmail, parentContact,
      wmsuEmail, password, profilePic
    } = req.body;
    
    // Generate QR Code for the student
    const qrCodeDataUrl = await generateQRCode(req.body);
    
    console.log('QR Code generated successfully');
    
    // Insert into students table with 'pending' status for approval workflow
    try {
      console.log('Attempting to insert student into students table...');
      const result = await query(
        `INSERT INTO students (
          lrn, firstName, middleName, lastName, age, sex, gradeLevel, section,
          parentFirstName, parentLastName, parentEmail, parentContact,
          wmsu_email, password, profile_pic, qr_code, status, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'admin', NOW(), NOW())`,
        [
          lrn, firstName, middleName, lastName, age, sex, gradeLevel, req.body.section,
          parentFirstName, parentLastName, parentEmail, parentContact,
          wmsuEmail, password, profilePic || null, qrCodeDataUrl
        ]
      );
      
      console.log('Student inserted successfully with ID:', result.insertId);
      
      const createdStudent = {
        id: result.insertId,
        lrn, firstName, middleName, lastName, age, sex, gradeLevel,
        section: req.body.section, parentFirstName, parentLastName,
        parentEmail, parentContact, wmsuEmail, profilePic: qrCodeDataUrl,
        status: 'pending'
      };
      
      res.status(201).json({ status: 'success', data: { student: createdStudent } });
    } catch (error) {
      console.error('Error inserting student:', error.message);
      res.status(400).json({ status: 'fail', message: error.message });
    }
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(400).json({ status: 'fail', message: error.message });
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
    
    try {
      // Get all students from database (both pending and approved)
      const allDbStudents = await query(
        'SELECT id, lrn, first_name, middle_name, last_name, age, sex, grade_level, section, ' +
        'parentFirstName, parentLastName, parentEmail, parentContact, ' +
        'wmsu_email, profile_pic, qr_code, status, attendance, average, ' +
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
        parentFirstName: student.parentFirstName || '',
        parentLastName: student.parentLastName || '',
        parentEmail: student.parentEmail || '',
        parentContact: student.parentContact || '',
        wmsuEmail: student.wmsu_email,
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
  } catch (error) {
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
        'SELECT id, lrn, firstName, middleName, lastName, age, sex, gradeLevel, section, ' +
        'parentFirstName, parentLastName, parentEmail, parentContact, ' +
        'wmsu_email, profile_pic, qr_code, status, created_at, updated_at FROM students WHERE id = ?',
        [id]
      );
      
      if (students.length === 0) {
        return res.status(404).json({ status: 'fail', message: 'Student not found' });
      }
      
      const student = students[0];
      const formattedStudent = {
        id: student.id,
        lrn: student.lrn,
        firstName: student.firstName,
        middleName: student.middleName,
        lastName: student.lastName,
        fullName: `${student.firstName} ${student.middleName} ${student.lastName}`.trim(),
        age: student.age,
        sex: student.sex,
        gradeLevel: student.gradeLevel,
        section: student.section,
        parentFirstName: student.parentFirstName || '',
        parentLastName: student.parentLastName || '',
        parentEmail: student.parentEmail || '',
        parentContact: student.parentContact || '',
        wmsuEmail: student.wmsu_email,
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
        'SELECT id, lrn, firstName, middleName, lastName, age, sex, gradeLevel, section, ' +
        'parentFirstName, parentLastName, parentEmail, parentContact, ' +
        'wmsu_email, profile_pic, qr_code, status, created_at FROM students WHERE status = "pending" ORDER BY created_at DESC'
      );
      
      console.log('Found pending students:', pendingStudents.length);
      
      // Format students to match expected structure
      const formattedStudents = pendingStudents.map(student => ({
        id: student.id,
        lrn: student.lrn,
        firstName: student.firstName,
        middleName: student.middleName,
        lastName: student.lastName,
        fullName: `${student.firstName} ${student.middleName} ${student.lastName}`.trim(),
        age: student.age,
        sex: student.sex,
        gradeLevel: student.gradeLevel,
        section: student.section,
        parentFirstName: student.parentFirstName || '',
        parentLastName: student.parentLastName || '',
        parentEmail: student.parentEmail || '',
        parentContact: student.parentContact || '',
        wmsuEmail: student.wmsu_email,
        profilePic: student.profile_pic,
        qrCode: student.qr_code,
        status: student.status || 'pending',
        createdAt: student.created_at
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

// Decline student (remove from database)
exports.declineStudent = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Declining student with ID:', id);
    
    // Check if database is available
    if (!isDatabaseAvailable()) {
      return res.status(400).json({ message: 'Database not available' });
    }
    
    try {
      const result = await query('DELETE FROM students WHERE id = ?', [id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Student not found' });
      }
      
      console.log('Student declined and removed successfully');
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

// -----------------------------
// ALIASES TO MATCH ROUTES
// -----------------------------
exports.getAllStudents = exports.getStudents;
exports.getStudentById = exports.getStudent;