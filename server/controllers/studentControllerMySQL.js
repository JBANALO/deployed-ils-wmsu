
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
    // Get students from users table (where role='student')
    const students = await query('SELECT * FROM users WHERE role = "student" ORDER BY createdAt DESC');
    
    // Map to student format for frontend compatibility
    const mappedStudents = students.map(student => ({
      id: student.id,
      lrn: student.id, // Use ID as LRN if not available
      firstName: student.firstName,
      lastName: student.lastName,
      fullName: student.firstName + ' ' + student.lastName,
      age: 10, // Default age
      sex: 'Not Specified',
      email: student.email,
      gradeLevel: student.gradeLevel || 'Grade 3',
      section: student.section || 'Wisdom',
      status: 'Active',
      password: student.password,
      profilePic: null,
      qrCode: null,
      grades: null,
      attendance: null,
      average: null,
      createdAt: student.createdAt,
      username: student.username,
      role: student.role
    }));
    
    res.json(mappedStudents);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
