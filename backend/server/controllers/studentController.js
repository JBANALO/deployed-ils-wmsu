// server/controllers/studentController.js
const pool = require('../config/db');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// JSON file path for students data
const studentsFilePath = path.join(__dirname, '../../../data/students.json');

const readStudents = () => {
  try {
    console.log(`Reading students from: ${studentsFilePath}`);
    const data = fs.readFileSync(studentsFilePath, 'utf8');
    const students = JSON.parse(data);
    console.log(`Successfully read ${students.length} students`);
    return students;
  } catch (error) {
    console.error('Error reading students.json:', error.message);
    console.error('Expected path:', studentsFilePath);
    return [];
  }
};

const formatStudent = (student) => ({
  id: student.id,
  lrn: student.lrn,
  firstName: student.first_name,
  middleName: student.middle_name,
  lastName: student.last_name,
  age: student.age,
  sex: student.sex,
  gradeLevel: student.grade_level,
  section: student.section,
  contact: student.parent_contact,
  email: student.student_email,
  qrCode: student.qr_code,
  profilePic: student.profile_pic,
  status: student.status,
  attendance: student.attendance,
  average: student.average,
  createdAt: student.created_at,
  updatedAt: student.updated_at
});

const createStudent = async (req, res) => {
  try {
    // Log entire request body for debugging
    console.log('=== FULL REQUEST BODY ===');
    console.log(JSON.stringify(req.body, null, 2));
    console.log('========================');

    // Handle both 'email' and 'wmsuEmail' formats (bulk import sends 'email')
    const {
      lrn, firstName, middleName, lastName, age, sex,
      gradeLevel, section, contact, wmsuEmail, email, password, profilePic, qrCode, fullName, status
    } = req.body;

    console.log('createStudent extracted values:', {
      lrn: lrn || 'NOT FOUND',
      firstName: firstName || 'NOT FOUND',
      lastName: lastName || 'NOT FOUND',
      email: email || 'NOT FOUND',
      wmsuEmail: wmsuEmail || 'NOT FOUND',
      gradeLevel: gradeLevel || 'NOT FOUND',
      section: section || 'NOT FOUND',
      contact: contact || 'NOT FOUND',
      receivedKeys: Object.keys(req.body)
    });

    // Use email or wmsuEmail (bulk import sends 'email')
    const studentEmail = wmsuEmail || email;
    
    // Detailed validation with specific error messages
    const missingFields = [];
    if (!lrn) missingFields.push(`lrn[received:"${lrn}"]`);
    if (!firstName) missingFields.push(`firstName[received:"${firstName}"]`);
    if (!lastName) missingFields.push(`lastName[received:"${lastName}"]`);
    if (!studentEmail) missingFields.push(`email/wmsuEmail[email:"${email}",wmsuEmail:"${wmsuEmail}"]`);
    if (!gradeLevel) missingFields.push(`gradeLevel[received:"${gradeLevel}"]`);
    if (!section) missingFields.push(`section[received:"${section}"]`);

    if (missingFields.length > 0) {
      const errorMsg = `Missing required fields: ${missingFields.join(' | ')}`;
      console.error('❌ Validation error:', errorMsg);
      return res.status(400).json({ error: errorMsg });
    }

    const [lrnExists] = await pool.query('SELECT 1 FROM students WHERE lrn = ?', [lrn]);
    if (lrnExists.length) return res.status(409).json({ error: 'LRN already exists' });

    const [emailExists] = await pool.query('SELECT 1 FROM students WHERE student_email = ?', [studentEmail]);
    if (emailExists.length) return res.status(409).json({ error: 'Email already exists' });

    const studentFullName = fullName || `${firstName} ${middleName || ''} ${lastName}`.trim();
    
    // Use provided QR code if available (from bulk import), otherwise generate
    let finalQrCode = qrCode;
    if (!finalQrCode) {
      const qrData = JSON.stringify({ lrn, name: studentFullName, gradeLevel, section, email: studentEmail });
      finalQrCode = await QRCode.toDataURL(qrData, { width: 300, margin: 2 });
    }

    // Create unique IDs for student and user
    const studentId = uuidv4();
    const tempPassword = password || 'TempPassword123!';
    
    // Generate username from LRN or create one from email
    const username = lrn || `student_${studentId.substring(0, 8)}`;

    // 1. Insert into students table
    await pool.query(
      `INSERT INTO students (id, lrn, first_name, middle_name, last_name, age, sex, grade_level, section, parent_contact, student_email, password, profile_pic, qr_code, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [studentId, lrn, firstName, middleName || '', lastName, age || 0, sex || 'N/A', gradeLevel, section, contact || '', studentEmail, tempPassword, profilePic || null, finalQrCode, status || 'Active']
    );

    // 2. Hash password and insert into users table
    try {
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      await pool.query(
        `INSERT INTO users (id, first_name, last_name, full_name, email, username, password, role, approval_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [studentId, firstName, lastName, studentFullName, studentEmail, username, hashedPassword, 'student', 'approved']
      );
    } catch (userError) {
      // If user insert fails (e.g., duplicate email), log but don't fail the entire request
      console.error('Error inserting student into users table:', userError.message);
    }

    const [[newStudent]] = await pool.query('SELECT * FROM students WHERE id = ?', [studentId]);
    res.status(201).json({ message: 'Student created successfully', student: formatStudent(newStudent) });
  } catch (err) {
    console.error('Error in createStudent:', err);
    res.status(500).json({ error: 'Failed to create student', details: err.message });
  }
};

const getAllStudents = async (req, res) => {
  try {
    const { gradeLevel, section, status } = req.query;

    // Build query to fetch from database
    // Compute average live from grades table so it reflects actual saved grades
    // Falls back to students.average column if no grades rows exist
    let query = `
      SELECT s.id, s.lrn, s.first_name, s.middle_name, s.last_name, s.age, s.sex,
             s.grade_level, s.section, s.parent_contact, s.student_email, s.status,
             s.attendance, s.profile_pic, s.qr_code, s.created_at, s.updated_at,
             COALESCE(
               (
                 SELECT ROUND(AVG(subject_avg), 2)
                 FROM (
                   SELECT student_id,
                          (COALESCE(NULLIF(q1,0),0) + COALESCE(NULLIF(q2,0),0) +
                           COALESCE(NULLIF(q3,0),0) + COALESCE(NULLIF(q4,0),0)) /
                          GREATEST(
                            (q1>0) + (q2>0) + (q3>0) + (q4>0), 1
                          ) AS subject_avg
                   FROM grades
                   WHERE student_id = s.id
                     AND (q1 > 0 OR q2 > 0 OR q3 > 0 OR q4 > 0)
                 ) sub
               ),
               IF(s.average > 0, s.average, NULL)
             ) AS average
      FROM students s
      WHERE 1=1
    `;
    const params = [];

    // Add filters
    if (gradeLevel) {
      query += ` AND s.grade_level = ?`;
      params.push(gradeLevel);
    }
    if (section) {
      query += ` AND s.section = ?`;
      params.push(section);
    }
    if (status) {
      query += ` AND s.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY s.first_name, s.last_name ASC`;

    const [students] = await pool.query(query, params);

    // If students don't have proper names, try to enrich from students.json
    if (students.length > 0 && !students[0].full_name) {
      const studentsJson = readStudents();
      
      for (let i = 0; i < students.length; i++) {
        const dbStudent = students[i];
        const jsonStudent = studentsJson.find(s => s.lrn === dbStudent.lrn);
        
        if (jsonStudent) {
          // Fill in missing name data from JSON
          if (!dbStudent.first_name && jsonStudent.firstName) {
            dbStudent.first_name = jsonStudent.firstName;
          }
          if (!dbStudent.middle_name && jsonStudent.middleName) {
            dbStudent.middle_name = jsonStudent.middleName;
          }
          if (!dbStudent.last_name && jsonStudent.lastName) {
            dbStudent.last_name = jsonStudent.lastName;
          }
          if (!dbStudent.full_name && jsonStudent.fullName) {
            dbStudent.full_name = jsonStudent.fullName;
          }
          // Fill in QR code if missing
          if (!dbStudent.qr_code && jsonStudent.qrCode) {
            dbStudent.qr_code = jsonStudent.qrCode;
          }
        }
      }
    }

    // Format response with database fields mapped to camelCase
    const formattedStudents = students.map(s => ({
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
      contact: s.parent_contact,
      email: s.student_email,
      status: s.status,
      attendance: s.attendance,
      average: s.average,
      profilePic: s.profile_pic,
      qrCode: s.qr_code,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }));

    res.json(formattedStudents);
  } catch (err) {
    console.error('getAllStudents error:', err);
    res.status(500).json({ error: 'Failed to fetch students', details: err.message });
  }
};

const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Invalid student ID' });
    }

    const [students] = await pool.query(
      `SELECT id, lrn, first_name, middle_name, last_name, full_name, age, sex,
              grade_level, section, contact, wmsu_email, status, attendance, average,
              profile_pic, qr_code, adviser_id, adviser_name, created_at
       FROM students WHERE id = ?`,
      [id]
    );

    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const s = students[0];
    const student = {
      id: s.id,
      lrn: s.lrn,
      firstName: s.first_name,
      middleName: s.middle_name,
      lastName: s.last_name,
      fullName: s.full_name,
      age: s.age,
      sex: s.sex,
      gradeLevel: s.grade_level,
      section: s.section,
      contact: s.contact,
      wmsuEmail: s.wmsu_email,
      status: s.status,
      attendance: s.attendance,
      average: s.average,
      profilePic: s.profile_pic,
      qrCode: s.qr_code,
      adviserId: s.adviser_id,
      adviserName: s.adviser_name,
      createdAt: s.created_at
    };

    res.json(student);
  } catch (err) {
    console.error('getStudentById error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const students = readStudents();
    const studentIndex = students.findIndex(s => s.id === id);
    
    if (studentIndex === -1) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const student = students[studentIndex];
    const fields = {
      firstName: true,
      middleName: true,
      lastName: true,
      age: true,
      sex: true,
      gradeLevel: true,
      section: true,
      contact: true,
      wmsuEmail: true,
      status: true,
      attendance: true,
      average: true,
      profilePic: true,
      qrCode: true
    };

    // Update fields
    for (const [key] of Object.entries(fields)) {
      if (req.body[key] !== undefined) {
        student[key] = req.body[key] === '' && key.includes('Pic') ? null : req.body[key];
      }
    }

    // Rebuild fullName if name changed
    if (req.body.firstName || req.body.middleName || req.body.lastName) {
      const f = req.body.firstName ?? student.firstName;
      const m = req.body.middleName ?? student.middleName;
      const l = req.body.lastName ?? student.lastName;
      student.fullName = `${f} ${m || ''} ${l}`.trim();
    }

    student.updatedAt = new Date().toISOString();
    students[studentIndex] = student;
    
    // Write back to file
    fs.writeFileSync(studentsFilePath, JSON.stringify(students, null, 2));
    
    res.json({ message: 'Student updated successfully', student });
  } catch (err) {
    console.error('updateStudent error:', err);
    res.status(500).json({ error: 'Failed to update student', details: err.message });
  }
};

const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const students = readStudents();
    const studentIndex = students.findIndex(s => s.id === id);
    
    if (studentIndex === -1) {
      return res.status(404).json({ error: 'Student not found' });
    }

    students.splice(studentIndex, 1);
    fs.writeFileSync(studentsFilePath, JSON.stringify(students, null, 2));
    
    res.json({ message: 'Student deleted successfully' });
  } catch (err) {
    console.error('deleteStudent error:', err);
    res.status(500).json({ error: 'Failed to delete student', details: err.message });
  }
};

module.exports = { createStudent, getAllStudents, getStudentById, updateStudent, deleteStudent };