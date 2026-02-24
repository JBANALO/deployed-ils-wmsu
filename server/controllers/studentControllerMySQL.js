
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

exports.createStudent = async (req, res) => {
  try {
    const { firstName, lastName, email, lrn, gradeLevel, section, username, sex, age } = req.body;
    
    const studentId = lrn || uuidv4();
    await query(
      'INSERT INTO students (id, lrn, first_name, last_name, full_name, username, wmsu_email, password, grade_level, section, status, sex, age, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      [
        studentId, 
        lrn || studentId, 
        firstName, 
        lastName, 
        `${firstName} ${lastName}`, 
        username,
        email, 
        req.body.password || 'Password123',
        gradeLevel || 'Grade 3', 
        section || 'Wisdom',
        req.body.status || 'Active',
        sex || 'Not Specified',
        age || 10
      ]
    );

    res.status(201).json({ message: 'Student created', studentId });
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getAllStudents = async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Get students from students table (primary source of student data)
    const students = await query('SELECT * FROM students ORDER BY full_name ASC');
    
    // Try to load students.json for QR code enrichment
    let jsonStudents = [];
    try {
      const studentsPath = path.join(__dirname, '../../data/students.json');
      if (fs.existsSync(studentsPath)) {
        const data = fs.readFileSync(studentsPath, 'utf8');
        jsonStudents = JSON.parse(data);
      }
    } catch (e) {
      console.log('Note: Could not load students.json for QR code enrichment');
    }
    
    // Map to student format for frontend compatibility
    const mappedStudents = students.map(student => {
      let parsedGrades = null;
      try {
        if (student.grades && typeof student.grades === 'string') {
          parsedGrades = JSON.parse(student.grades);
        } else if (student.grades && typeof student.grades === 'object') {
          parsedGrades = student.grades;
        }
      } catch (e) {
        console.error('Error parsing grades for student:', student.id, e);
        parsedGrades = null;
      }
      
      // Try to enrich with QR code from students.json if missing
      let qrCode = student.qr_code;
      if (!qrCode && jsonStudents.length > 0) {
        // Match by full name
        const fullName = student.full_name || (student.first_name + ' ' + student.last_name);
        const jsonStudent = jsonStudents.find(js => 
          js.fullName === fullName ||
          (js.firstName + ' ' + js.lastName === fullName)
        );
        if (jsonStudent && jsonStudent.qrCode) {
          qrCode = jsonStudent.qrCode;
        }
      }
      
      return {
        id: student.id,
        lrn: student.lrn,
        firstName: student.first_name,
        lastName: student.last_name,
        fullName: student.full_name || (student.first_name + ' ' + student.last_name),
        name: student.full_name || (student.first_name + ' ' + student.last_name),
        studentId: student.id,
        age: student.age || 10,
        sex: student.sex || 'Not Specified',
        email: student.wmsu_email,
        gradeLevel: student.grade_level || 'Grade 3',
        section: student.section || 'Wisdom',
        status: student.status || 'Active',
        password: student.password,
        profilePic: student.profile_pic,
        qrCode: qrCode,
        grades: parsedGrades,
        attendance: student.attendance,
        average: student.average || 0,
        createdAt: student.created_at,
        username: student.username,
        role: student.role || 'student'
      };
    });
    
    // Return in consistent format with success flag
    res.json({
      success: true,
      status: 'success',
      data: mappedStudents,
      count: mappedStudents.length
    });
  } catch (error) {
    console.error('Error getting students:', error);
    res.status(500).json({ 
      success: false,
      status: 'error',
      error: error.message 
    });
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    const students = await query('SELECT * FROM students WHERE id = ?', [id]);
    
    if (students.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const student = students[0];
    const mappedStudent = {
      id: student.id,
      lrn: student.lrn,
      firstName: student.first_name,
      lastName: student.last_name,
      fullName: student.full_name,
      age: student.age,
      sex: student.sex,
      email: student.wmsu_email,
      gradeLevel: student.grade_level,
      section: student.section,
      status: student.status,
      password: student.password,
      profilePic: student.profile_pic,
      qrCode: student.qr_code,
      grades: student.grades,
      attendance: student.attendance,
      average: student.average,
      createdAt: student.createdAt
    };

    res.json(mappedStudent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, gradeLevel, section } = req.body;

    await query(
      'UPDATE students SET firstName = ?, lastName = ?, fullName = ?, email = ?, gradeLevel = ?, section = ?, updatedAt = NOW() WHERE id = ?',
      [firstName, lastName, `${firstName} ${lastName}`, email, gradeLevel, section, id]
    );

    res.json({ message: 'Student updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM students WHERE id = ?', [id]);
    res.json({ message: 'Student deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getStudentsByGradeAndSection = async (req, res) => {
  try {
    const { grade, section } = req.params;
    const students = await query(
      'SELECT * FROM students WHERE gradeLevel = ? AND section = ? ORDER BY firstName ASC',
      [grade, section]
    );
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// Update student grades
exports.updateStudentGrades = async (req, res) => {
  try {
    const { id } = req.params;
    const { grades, average, quarter, lastGradeEditTime } = req.body;

    console.log(`Updating grades for student ${id}:`, { grades, average, quarter });

    // Get existing grades data
    const students = await query('SELECT grades FROM users WHERE id = ?', [id]);
    
    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const existingGrades = students[0].grades ? JSON.parse(students[0].grades) : {};
    
    // Properly merge grades per subject and quarter
    const updatedGrades = { ...existingGrades };
    
    Object.keys(grades).forEach(subject => {
      if (!updatedGrades[subject]) {
        updatedGrades[subject] = {};
      }
      
      // Merge quarter data
      if (typeof grades[subject] === 'object') {
        updatedGrades[subject] = {
          ...updatedGrades[subject],
          ...grades[subject]
        };
      }
    });

    // Update in database
    await query(
      'UPDATE users SET grades = ?, average = ?, lastGradeEditTime = ? WHERE id = ?',
      [JSON.stringify(updatedGrades), average, lastGradeEditTime, id]
    );

    res.json({
      success: true,
      message: 'Grades updated successfully',
      data: {
        studentId: id,
        grades: updatedGrades,
        average: average,
        quarter: quarter
      }
    });
  } catch (error) {
    console.error('Error updating student grades:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating grades',
      error: error.message
    });
  }
};