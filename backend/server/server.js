// server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

const authRoutes = require('./routes/auth');
const { router: usersRoutes } = require('./routes/users');
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
    const QRCode = require('qrcode');
    
    // Get all students from database
    try {
      const connection = await pool.getConnection();
      
      // Get students without QR codes
      const [studentsWithoutQR] = await connection.query(
        `SELECT id, lrn, first_name, last_name, full_name, grade_level, section 
         FROM students 
         WHERE qr_code IS NULL OR qr_code = ''`
      );

      let qrGenerated = 0;

      // Generate QR codes for students that don't have them
      for (const student of studentsWithoutQR) {
        try {
          const qrData = JSON.stringify({
            lrn: student.lrn,
            name: student.full_name || `${student.first_name} ${student.last_name}`,
            gradeLevel: student.grade_level,
            section: student.section
          });
          const qrCode = await QRCode.toDataURL(qrData, { width: 300, margin: 2 });
          
          const result = await connection.query(
            'UPDATE students SET qr_code = ? WHERE id = ?',
            [qrCode, student.id]
          );
          
          if (result[0].affectedRows > 0) {
            qrGenerated++;
          }
        } catch (e) {
          console.error(`Error generating QR for ${student.full_name}:`, e.message);
        }
      }

      connection.release();
      
      if (qrGenerated > 0) {
        console.log(`✅ Generated ${qrGenerated} QR codes for students in database`);
      } else {
        console.log(`✅ All students already have QR codes`);
      }
    } catch (dbErr) {
      console.log('⚠️  Database sync skipped (not available)');
    }

    // Also try to sync from JSON file if it exists
    const studentsPath = path.join(__dirname, '../../data/students.json');
    if (fs.existsSync(studentsPath)) {
      try {
        const data = fs.readFileSync(studentsPath, 'utf8');
        const students = JSON.parse(data);
        
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
      } catch (jsonError) {
        console.log('⚠️  students.json sync skipped:', jsonError.message);
      }
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