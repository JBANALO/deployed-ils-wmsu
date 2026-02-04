const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { sendAttendanceEmail } = require('../utils/emailService');

// Path to attendance data file
const attendanceDataPath = path.join(__dirname, '../../data/attendance.json');

// Initialize attendance file if it doesn't exist
if (!fs.existsSync(attendanceDataPath)) {
  fs.writeFileSync(attendanceDataPath, JSON.stringify([]));
}

// Get attendance data
const getAttendanceData = () => {
  try {
    const data = fs.readFileSync(attendanceDataPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading attendance data:', error);
    return [];
  }
};

// Save attendance data
const saveAttendanceData = (data) => {
  try {
    fs.writeFileSync(attendanceDataPath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving attendance data:', error);
    return false;
  }
};

// POST /api/attendance - Record attendance via QR scan
router.post('/', async (req, res) => {
  try {
    console.log('Attendance POST request body:', req.body);
    
    // Handle both QR scan format and mobile app format
    const { 
      studentId, 
      qrData, 
      location, 
      deviceInfo,
      // Mobile app format
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

    // Get student data to validate
    const studentsPath = path.join(__dirname, '../../data/students.json');
    const students = JSON.parse(fs.readFileSync(studentsPath, 'utf8'));
    
    // Check for student by ID, studentId, or LRN
    const student = students.find(s => 
      s.id === studentId || 
      s.studentId === studentId || 
      s.lrn === studentId
    );
    
    if (!student) {
      console.log('Student not found with ID:', studentId);
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get current attendance data
    const attendanceData = getAttendanceData();
    
    // Check if already recorded today
    const today = date || new Date().toISOString().split('T')[0];
    const existingRecord = attendanceData.find(record => 
      record.studentId === studentId && 
      record.date === today
    );

    // For mobile app, allow updating existing records
    if (existingRecord && !teacherId) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already recorded for today',
        data: existingRecord
      });
    }

    // Create new attendance record
    const attendanceRecord = {
      id: Date.now().toString(),
      studentId: studentId,
      studentName: student.fullName || student.name,
      gradeLevel: student.gradeLevel,
      section: student.section,
      date: today,
      timestamp: timestamp || new Date().toISOString(),
      time: time || new Date().toLocaleTimeString(),
      status: status || 'Present',
      period: period || 'morning',
      location: location || 'Mobile App',
      teacherId: teacherId || null,
      teacherName: teacherName || null,
      deviceInfo: deviceInfo || {},
      qrData: qrData
    };

    // If updating existing record, remove old one
    if (existingRecord && teacherId) {
      const index = attendanceData.findIndex(record => 
        record.studentId === studentId && record.date === today
      );
      if (index !== -1) {
        attendanceData.splice(index, 1);
      }
    }

    // Add to attendance data
    attendanceData.push(attendanceRecord);
    
    console.log('Saving attendance record:', attendanceRecord);
    
    // Save to file
    if (saveAttendanceData(attendanceData)) {
      res.json({
        success: true,
        message: 'Attendance recorded successfully',
        data: attendanceRecord
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to save attendance record'
      });
    }

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
    const { date, studentId, gradeLevel, section } = req.query;
    let attendanceData = getAttendanceData();

    // Apply filters
    if (date) {
      attendanceData = attendanceData.filter(record => record.date === date);
    }
    if (studentId) {
      attendanceData = attendanceData.filter(record => record.studentId === studentId);
    }
    if (gradeLevel) {
      attendanceData = attendanceData.filter(record => record.gradeLevel === gradeLevel);
    }
    if (section) {
      attendanceData = attendanceData.filter(record => record.section === section);
    }

    res.json({
      success: true,
      data: attendanceData
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
    const today = new Date().toISOString().split('T')[0];
    const attendanceData = getAttendanceData();
    const todayRecords = attendanceData.filter(record => record.date === today);

    res.json({
      success: true,
      data: todayRecords,
      count: todayRecords.length
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
    const { id } = req.params;
    const attendanceData = getAttendanceData();
    const studentRecords = attendanceData.filter(record => record.studentId === id);

    res.json({
      success: true,
      data: studentRecords,
      count: studentRecords.length
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