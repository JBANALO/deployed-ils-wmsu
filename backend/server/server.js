// server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const studentRoutes = require('./routes/students');
const deleteRequestRoutes = require('./routes/deleteRequests');
const gradeRoutes = require('./routes/grades');
const classRoutes = require('./routes/classes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Auto-sync student data on startup (QR codes and profile pictures)
const syncStudentData = async () => {
  try {
    const studentsPath = path.join(__dirname, '../../data/students.json');
    if (!fs.existsSync(studentsPath)) {
      console.log('⚠️  students.json not found');
      return;
    }

    const data = fs.readFileSync(studentsPath, 'utf8');
    const students = JSON.parse(data);
    
    // First, ensure all students have QR codes and profile pics
    const QRCode = require('qrcode');
    let needsUpdate = false;
    let qrGenerated = 0;
    let picAdded = 0;

    for (const student of students) {
      // Generate QR codes if missing
      if (!student.qrCode && student.lrn) {
        try {
          const qrData = JSON.stringify({
            lrn: student.lrn,
            name: `${student.firstName} ${student.lastName}`,
            gradeLevel: student.gradeLevel,
            section: student.section
          });
          student.qrCode = await QRCode.toDataURL(qrData, { width: 300, margin: 2 });
          qrGenerated++;
          needsUpdate = true;
        } catch (e) {
          console.error(`Error generating QR for ${student.firstName}:`, e.message);
        }
      }

      // Add profile pics if missing
      if (!student.profilePic) {
        student.profilePic = `https://ui-avatars.com/api/?name=${student.firstName}+${student.lastName}&background=random`;
        picAdded++;
        needsUpdate = true;
      }
    }

    // Save updated students.json if needed
    if (needsUpdate) {
      fs.writeFileSync(studentsPath, JSON.stringify(students, null, 2));
      console.log(`✅ Updated students.json: +${qrGenerated} QR codes, +${picAdded} profile pics`);
    }

    // Then sync to database
    try {
      let qrCount = 0, picCount = 0;
      const connection = await pool.getConnection();
      
      for (const student of students) {
        try {
          if (student.qrCode) {
            const result = await connection.query(
              'UPDATE students SET qr_code = ? WHERE lrn = ?',
              [student.qrCode, student.lrn]
            );
            if (result[0].affectedRows > 0) qrCount++;
          }
          
          if (student.profilePic) {
            const result = await connection.query(
              'UPDATE students SET profile_pic = ? WHERE lrn = ?',
              [student.profilePic, student.lrn]
            );
            if (result[0].affectedRows > 0) picCount++;
          }
        } catch (e) {
          // Skip if update fails
        }
      }
      
      connection.release();
      console.log(`✅ DB synced: ${qrCount} QR codes, ${picCount} profile pictures`);
    } catch (dbErr) {
      console.log('⚠️  Database sync skipped (not available)');
    }
  } catch (err) {
    console.error('❌ Data sync error:', err.message);
  }
};

// Routes
app.get('/api', (req, res) => {
  res.json({ message: 'Student Management API Running!', version: '1.0.0' });
});

// Admin endpoint to manually trigger data sync
app.post('/api/admin/sync-data', async (req, res) => {
  try {
    console.log('🔄 Manual sync triggered');
    await syncStudentData();
    res.json({ status: 'success', message: 'Data sync completed' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/delete-requests', deleteRequestRoutes);
app.use('/api/students', gradeRoutes); // grades under students
app.use('/api/student', require('./routes/studentPortal'));

app.get('/', (req, res) => {
  res.json({ message: 'Student Management API Running!' });
});

// Sync data and start server
(async () => {
  await syncStudentData();
  app.listen(PORT, () => {
    console.log(`🌐 Server running on http://localhost:${PORT}`);
  });
})();