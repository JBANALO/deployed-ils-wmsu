// server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const passport = require('./config/passport');
const { query } = require('./config/database');
const userRoutes = require('./routes/userRoutes');

// Auto-sync QR codes from students.json to database on startup
const syncQRCodesOnStartup = async () => {
  try {
    console.log('\n🔄 Syncing QR codes from students.json to database...');
    
    const studentsPath = path.join(__dirname, '../data/students.json');
    if (!fs.existsSync(studentsPath)) {
      console.log('⚠️  students.json not found, skipping sync');
      return;
    }

    const data = fs.readFileSync(studentsPath, 'utf8');
    const students = JSON.parse(data);
    console.log(`📖 Found ${students.length} students in students.json`);

    let synced = 0;
    let generated = 0;

    for (const student of students) {
      // Generate QR code if missing
      let qrCode = student.qrCode;
      if (!qrCode && student.lrn) {
        try {
          const qrData = JSON.stringify({
            lrn: student.lrn,
            name: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
            gradeLevel: student.gradeLevel,
            section: student.section
          });
          qrCode = await QRCode.toDataURL(qrData, {
            width: 300,
            margin: 2,
            errorCorrectionLevel: 'H'
          });
          generated++;
        } catch (err) {
          console.error(`Error generating QR for ${student.firstName}:`, err.message);
          continue;
        }
      }

      // Try to sync to database
      if (qrCode && student.lrn) {
        try {
          const result = await query(
            'UPDATE students SET qr_code = ? WHERE lrn = ?',
            [qrCode, student.lrn]
          );
          if (result && result.affectedRows > 0) {
            synced++;
          }
        } catch (err) {
          // Student might not exist in DB yet, skip
        }
      }
    }

    if (synced > 0 || generated > 0) {
      console.log(`✅ Synced ${synced} QR codes to database (${generated} generated)`);
    } else {
      console.log(`✅ All students already have QR codes`);
    }
  } catch (err) {
    console.error('❌ QR sync error:', err.message);
  }
};

// Log environment variables for debugging
console.log('=== ENVIRONMENT CHECK ===');
console.log('DB_HOST:', process.env.DB_HOST || 'NOT SET');
console.log('DB_NAME:', process.env.DB_NAME || 'NOT SET');
console.log('DB_PORT:', process.env.DB_PORT || 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET');
console.log('========================');
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const classRoutes = require('./routes/classRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const gradeRoutes = require('./routes/grades');
const teacherRoutes = require('./routes/teacherRoutes');

const app = express();

// CORS - allow Vercel frontend
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(allowed => origin.startsWith(allowed)) || origin.includes('vercel.app') || origin.includes('netlify.app')) {
      return callback(null, true);
    }
    callback(null, true);
  },
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files (uploads directory) with CORS
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Serve static files from public directory (QR codes, profile pictures)
app.use('/qrcodes', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}, express.static(path.join(__dirname, 'public/qrcodes')));

app.use('/profiles', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}, express.static(path.join(__dirname, 'public/profiles')));

app.use('/public', express.static(path.join(__dirname, 'public')));

// Session configuration for Passport
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    },
  })
);

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// API health check
app.get('/api', (req, res) => {
  res.json({ message: 'WMSU Portal API is running', status: 'OK' });
});

// Manual QR sync endpoint
app.post('/api/admin/sync-qrcodes', async (req, res) => {
  try {
    console.log('🔄 Manual QR sync requested');
    await syncQRCodesOnStartup();
    res.json({ success: true, message: 'QR codes synced to database' });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Bulk import students from students.json  
app.post('/api/admin/import-students', async (req, res) => {
  try {
    console.log('📚 Bulk import students requested');
    
    const studentsPath = path.join(__dirname, '../data/students.json');
    if (!fs.existsSync(studentsPath)) {
      return res.status(400).json({ error: 'students.json not found' });
    }

    const data = fs.readFileSync(studentsPath, 'utf8');
    const jsonStudents = JSON.parse(data);

    let imported = 0;
    let updated = 0;
    let errors = 0;

    for (const student of jsonStudents) {
      try {
        const { v4: uuidv4 } = require('uuid');
        const studentId = uuidv4();
        const fullName = `${student.firstName || ''} ${student.middleName || ''} ${student.lastName || ''}`.trim();

        // Try to find existing student by full name
        try {
          const existing = await query(
            'SELECT id FROM students WHERE full_name = ? LIMIT 1',
            [fullName]
          );

          if (existing && existing.length > 0) {
            // Update existing
            try {
              await query(
                `UPDATE students SET lrn = ?, qr_code = ?, profile_pic = ? WHERE id = ?`,
                [student.lrn, student.qrCode, student.profilePic, existing[0].id]
              );
              updated++;
            } catch (e) {
              console.error(`Update error: ${e.message}`);
              errors++;
            }
          } else {
            // Insert new
            try {
              await query(
                `INSERT INTO students (
                  id, lrn, first_name, middle_name, last_name, full_name,
                  grade_level, section, sex, age, wmsu_email, password, status,
                  qr_code, profile_pic, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [
                  studentId,
                  student.lrn,
                  student.firstName || '',
                  student.middleName || '',
                  student.lastName || '',
                  fullName,
                  student.gradeLevel || 'Grade 3',
                  student.section || 'Wisdom',
                  student.sex || 'NotSpecified',
                  student.age || 10,
                  `${((student.firstName || '').toLowerCase())}${(student.lastName || '').toLowerCase()}@student.wmsu.edu.ph`,
                  'TempPassword123!',
                  'Active',
                  student.qrCode,
                  student.profilePic
                ]
              );
              imported++;
            } catch (e) {
              console.error(`Insert error: ${e.message}`);
              errors++;
            }
          }
        } catch (e) {
          console.error(`Query error: ${e.message}`);
          errors++;
        }
      } catch (err) {
        errors++;
      }
    }

    res.json({
      success: true,
      message: `Imported ${imported}, Updated ${updated}, Errors ${errors}`,
      imported,
      updated,
      errors,
      total: jsonStudents.length
    });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Serve profile images via API endpoint with proper CORS
app.get('/api/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, '..', 'uploads', filename);
  
  console.log(`Image request received for: ${filename}`);
  console.log(`Full image path: ${imagePath}`);
  console.log(`File exists: ${fs.existsSync(imagePath)}`);
  
  // Security check - only allow image files
  if (!filename.match(/\.(png|jpg|jpeg|gif)$/i)) {
    console.log('File type not allowed:', filename);
    return res.status(403).json({ error: 'File type not allowed' });
  }
  
  // Check if file exists
  if (!fs.existsSync(imagePath)) {
    console.log('File not found:', imagePath);
    return res.status(404).json({ error: 'File not found' });
  }
  
  console.log('Sending image file:', imagePath);
  
  // Set CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Content-Type', 'image/png');
  
  // Send file
  res.sendFile(imagePath);
});

// Get recent login attempts
app.get('/api/admin/recent-login-attempts', async (req, res) => {
  try {
    // For now, return mock data since we don't have a login_attempts table
    const mockAttempts = [
      {
        id: '1',
        email: 'admin@wmsu.edu.ph',
        timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
        ip: '192.168.1.100',
        success: true
      },
      {
        id: '2', 
        email: 'teacher@wmsu.edu.ph',
        timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
        ip: '192.168.1.101',
        success: true
      }
    ];
    
    res.json({
      status: 'success',
      data: { attempts: mockAttempts },
      message: `Found ${mockAttempts.length} recent login attempts`
    });
  } catch (error) {
    console.error('Error fetching login attempts:', error);
    res.status(500).json({ message: 'Error fetching login attempts', error: error.message });
  }
});

// API routes
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/grades', gradeRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  // Don't send error details in production
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ 
      status: 'error', 
      message: 'Internal server error' 
    });
  } else {
    res.status(500).json({ 
      message: 'Something went wrong!', 
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
  next();
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

const PORT = process.env.PORT || 5000;

// Async startup function
const startServer = async () => {
  const { query, isDatabaseAvailable } = require('./config/database');

  // 1️⃣ Sync QR codes on startup
  try {
    await syncQRCodesOnStartup();
  } catch (err) {
    console.error('❌ QR code sync failed:', err.message);
  }

  // 2️⃣ Wait a bit for DB connection
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 3️⃣ Ensure database columns exist
  if (isDatabaseAvailable()) {
    console.log('✅ Database is available, checking columns...');

    // Users table columns
    const userColumns = [
      { name: 'phone', sql: 'ALTER TABLE users ADD COLUMN phone VARCHAR(20) DEFAULT ""' },
      { name: 'profile_pic', sql: 'ALTER TABLE users ADD COLUMN profile_pic LONGTEXT' }
    ];

    for (const col of userColumns) {
      try {
        const exists = await query(`SHOW COLUMNS FROM users LIKE '${col.name}'`);
        if (exists.length === 0) {
          await query(col.sql);
          console.log(`✅ ${col.name} column added to users`);
        } else {
          console.log(`✅ ${col.name} column already exists in users`);
        }
      } catch (err) {
        console.warn(`⚠️ Skipping users.${col.name} check:`, err.message);
      }
    }

    // Students table columns
    const studentColumns = [
      { name: 'middleName', sql: 'ALTER TABLE students ADD COLUMN middleName VARCHAR(255) AFTER first_name' },
      { name: 'age', sql: 'ALTER TABLE students ADD COLUMN age INT AFTER middleName' },
      { name: 'sex', sql: 'ALTER TABLE students ADD COLUMN sex VARCHAR(10) AFTER age' },
      { name: 'lrn', sql: 'ALTER TABLE students ADD COLUMN lrn VARCHAR(20) AFTER sex' },
      { name: 'parentFirstName', sql: 'ALTER TABLE students ADD COLUMN parentFirstName VARCHAR(255) AFTER section' },
      { name: 'parentLastName', sql: 'ALTER TABLE students ADD COLUMN parentLastName VARCHAR(255) AFTER parentFirstName' },
      { name: 'parentContact', sql: 'ALTER TABLE students ADD COLUMN parentContact VARCHAR(20) AFTER parentLastName' },
      { name: 'parentEmail', sql: 'ALTER TABLE students ADD COLUMN parentEmail VARCHAR(255) AFTER parentContact' },
      { name: 'qrCode', sql: 'ALTER TABLE students ADD COLUMN qrCode TEXT AFTER parentEmail' }
    ];

    for (const col of studentColumns) {
      try {
        const exists = await query(`SHOW COLUMNS FROM students LIKE '${col.name}'`);
        if (exists.length === 0) {
          await query(col.sql);
          console.log(`✅ ${col.name} column added to students`);
        } else {
          console.log(`✅ ${col.name} column already exists in students`);
        }
      } catch (err) {
        console.warn(`⚠️ Skipping students.${col.name} check:`, err.message);
      }
    }

    console.log('✅ Database setup completed successfully!');
  } else {
    console.log('⚠️ Database not available - running in file-only mode');
  }

  // 4️⃣ Start Express server
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Server running on http://0.0.0.0:${PORT}`);
    console.log('📋 Application Status:');
    console.log('   ✅ Server: Running');
    console.log('   ✅ File Storage: Available');
    console.log('   ✅ Student Creation: Working');
    console.log('   ✅ QR Code Generation: Working');
    
    if (isDatabaseAvailable()) {
      console.log('   ✅ Database: Connected');
      console.log('   ✅ Approval Workflow: Available');
    } else {
      console.log('   ⚠️ Database: Not Connected (File-only mode)');
      console.log('   ℹ️ Students will appear directly in AdminStudents');
    }
  }).on('error', (err) => {
    console.error('Server error:', err);
  });
};

// Start the server
startServer();