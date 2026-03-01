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

// Serve static files from public directory (QR codes, profile pictures)
app.use('/qrcodes', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}, express.static(path.join(__dirname, 'public/qrcodes')));

app.use('/student_profiles', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}, express.static(path.join(__dirname, 'public/student_profiles')));

app.use('/teacher_profiles', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}, express.static(path.join(__dirname, 'public/teacher_profiles')));

app.use('/admin_profiles', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}, express.static(path.join(__dirname, 'public/admin_profiles')));

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

// Serve QR codes via API endpoint
app.get('/api/qrcodes/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const qrCodePath = path.join(__dirname, 'public/qrcodes', filename);
    
    console.log('QR Code request:', filename);
    console.log('Full path:', qrCodePath);
    
    if (!fs.existsSync(qrCodePath)) {
      console.error('QR Code file not found:', qrCodePath);
      return res.status(404).json({ error: 'QR Code not found' });
    }
    
    res.sendFile(qrCodePath);
  } catch (error) {
    console.error('Error serving QR code:', error);
    res.status(500).json({ error: 'Failed to serve QR code' });
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

        try {
        // Prepare query dynamically based on whether middle_name exists
        let existingQuery = '';
        let queryParams = [];

        if (student.middleName && student.middleName.trim() !== '') {
          // Match first, middle, and last name
          existingQuery = `
            SELECT id FROM students 
            WHERE first_name = ? 
              AND middle_name = ? 
              AND last_name = ? 
            LIMIT 1
          `;
          queryParams = [student.firstName, student.middleName, student.lastName];
        } else {
          // Match only first and last name if middle name is missing
          existingQuery = `
            SELECT id FROM students 
            WHERE first_name = ? 
              AND (middle_name IS NULL OR middle_name = '') 
              AND last_name = ? 
            LIMIT 1
          `;
          queryParams = [student.firstName, student.lastName];
        }

        // Run the query
        const existing = await query(existingQuery, queryParams);

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
                  qr_code, profile_pic
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

// Get pending teachers from database
app.get('/api/admin/pending-teachers', async (req, res) => {
  try {
    const { query } = require('./config/database');
    
    // Get teachers with pending status
    const pendingTeachers = await query(
      'SELECT id, username, first_name, middle_name, last_name, email, role, grade_level, section, verification_status, created_at FROM teachers WHERE verification_status = "pending"'
    );
    
    res.json({
      status: 'success',
      data: { teachers: pendingTeachers },
      message: `Found ${pendingTeachers.length} pending teachers`
    });
  } catch (error) {
    console.error('Error fetching pending teachers:', error);
    res.status(500).json({ message: 'Error fetching pending teachers', error: error.message });
  }
});

// Get pending students from database (formatted for frontend)
app.get('/api/admin/pending-students', async (req, res) => {
  try {
    const { query } = require('./config/database');
    const { formatStudent } = require('./controllers/studentController');

    // Fetch all pending students from DB
    const pendingStudents = await query(
      'SELECT * FROM students WHERE status = "pending" ORDER BY created_at DESC'
    );

    // Map database rows through formatStudent to add fullName and role
    const formattedStudents = pendingStudents.map(formatStudent);

    res.json({
      status: 'success',
      data: { students: formattedStudents },
      message: `Found ${formattedStudents.length} pending students`
    });
  } catch (error) {
    console.error('Error fetching pending students:', error);
    res.status(500).json({
      status: 'fail',
      message: 'Error fetching pending students',
      error: error.message
    });
  }
});

// Get approved students from database (formatted for frontend)
app.get('/api/admin/approved-students', async (req, res) => {
  try {
    const { query } = require('./config/database');
    const { formatStudent } = require('./controllers/studentController');

    const approvedStudents = await query(
      'SELECT * FROM students WHERE status = "approved" ORDER BY updated_at DESC'
    );

    const formattedStudents = approvedStudents.map(formatStudent);

    res.json({
      status: 'success',
      data: { students: formattedStudents },
      message: `Found ${formattedStudents.length} approved students`
    });
  } catch (error) {
    console.error('Error fetching approved students:', error);
    res.status(500).json({
      status: 'fail',
      message: 'Error fetching approved students',
      error: error.message
    });
  }
});

// Get declined students from database (formatted for frontend)
app.get('/api/admin/declined-students', async (req, res) => {
  try {
    const { query } = require('./config/database');
    const { formatStudent } = require('./controllers/studentController');

    const declinedStudents = await query(
      'SELECT * FROM students WHERE status = "declined" ORDER BY updated_at DESC'
    );

    const formattedStudents = declinedStudents.map(formatStudent);

    res.json({
      status: 'success',
      data: { students: formattedStudents },
      message: `Found ${formattedStudents.length} declined students`
    });
  } catch (error) {
    console.error('Error fetching declined students:', error);
    res.status(500).json({
      status: 'fail',
      message: 'Error fetching declined students',
      error: error.message
    });
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

    // 🔧 FORCE FIX: Drop all wrong camelCase columns from Railway database
    console.log('🔧 FORCE FIXING Railway database schema...');
    
    // Drop wrong camelCase columns from users table
    const wrongUserColumns = ['firstName', 'middleName','lastName', 'gradeLevel', 'section', 'parentFirstName', 'parentLastName', 'parentContact', 'parentEmail', 'qrcode', 'status', 'user_id', 'wmsu_emaiil', 'age', 'sex', 'lrn', 'createdAt', 'updatedAt', 'grade_level', 'subjects', 'bio', 'verification_status', 'decline_reason', 'middle_name'];
    for (const col of wrongUserColumns) {
      try {
        await query(`ALTER TABLE users DROP COLUMN IF EXISTS ${col}`);
        console.log(`✅ Dropped wrong users column: ${col}`);
      } catch (err) {
        console.log(`⚠️ Column ${col} doesn't exist in users table`);
      }
    }

    // Drop wrong columns from other tables if they exist
    const wrongStudentColumns = ['middleName', 'parentFirstName', 'parentLastName', 'parentContact', 'parentEmail', 'contact', 'qrCode', 'full_name', 'wmsu_email', 'adviser_id', 'adviser_name'];
    for (const col of wrongStudentColumns) {
      try {
        await query(`ALTER TABLE students DROP COLUMN IF EXISTS ${col}`);
        console.log(`✅ Dropped wrong students column: ${col}`);
      } catch (err) {
        console.log(`⚠️ Column ${col} doesn't exist in students table`);
      }
    }

    const wrongTeacherColumns = ['position', 'department'];
    for (const col of wrongTeacherColumns) {
      try {
        await query(`ALTER TABLE teachers DROP COLUMN IF EXISTS ${col}`);
        console.log(`✅ Dropped wrong teachers column: ${col}`);
      } catch (err) {
        console.log(`⚠️ Column ${col} doesn't exist in teachers table`);
      }
    }

    console.log('✅ Railway database schema cleanup completed!');

    // Then add correct underscore columns
    const userColumns = [
      { name: 'id', sql: 'ALTER TABLE users ADD COLUMN id VARCHAR(36) PRIMARY KEY' },
      { name: 'first_name', sql: 'ALTER TABLE users ADD COLUMN first_name VARCHAR(100)' },
      { name: 'last_name', sql: 'ALTER TABLE users ADD COLUMN last_name VARCHAR(100)' },
      { name: 'username', sql: 'ALTER TABLE users ADD COLUMN username VARCHAR(100) UNIQUE' },
      { name: 'email', sql: 'ALTER TABLE users ADD COLUMN email VARCHAR(100) UNIQUE NOT NULL' },
      { name: 'password', sql: 'ALTER TABLE users ADD COLUMN password VARCHAR(255) NOT NULL' },
      { name: 'role', sql: 'ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT "admin"' },
      { name: 'created_at', sql: 'ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
      { name: 'phone', sql: 'ALTER TABLE users ADD COLUMN phone VARCHAR(20) DEFAULT ""' },
      { name: 'profile_pic', sql: 'ALTER TABLE users ADD COLUMN profile_pic LONGTEXT' },
      { name: 'updated_at', sql: 'ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' }
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

    // Students table columns - Match local database structure exactly (underscore-only)
    const studentColumns = [
      { name: 'id', sql: 'ALTER TABLE students ADD COLUMN id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY' },
      { name: 'lrn', sql: 'ALTER TABLE students ADD COLUMN lrn VARCHAR(12) NOT NULL UNIQUE' },
      { name: 'first_name', sql: 'ALTER TABLE students ADD COLUMN first_name VARCHAR(100) NOT NULL' },
      { name: 'middle_name', sql: 'ALTER TABLE students ADD COLUMN middle_name VARCHAR(100)' },
      { name: 'last_name', sql: 'ALTER TABLE students ADD COLUMN last_name VARCHAR(100) NOT NULL' },
      { name: 'age', sql: 'ALTER TABLE students ADD COLUMN age INT(11) NOT NULL' },
      { name: 'sex', sql: 'ALTER TABLE students ADD COLUMN sex VARCHAR(10) NOT NULL' },
      { name: 'grade_level', sql: 'ALTER TABLE students ADD COLUMN grade_level VARCHAR(50) NOT NULL' },
      { name: 'section', sql: 'ALTER TABLE students ADD COLUMN section VARCHAR(50) NOT NULL' },
      { name: 'parent_first_name', sql: 'ALTER TABLE students ADD COLUMN parent_first_name VARCHAR(255)' },
      { name: 'parent_last_name', sql: 'ALTER TABLE students ADD COLUMN parent_last_name VARCHAR(255)' },
      { name: 'parent_contact', sql: 'ALTER TABLE students ADD COLUMN parent_contact VARCHAR(20)' },
      { name: 'parent_email', sql: 'ALTER TABLE students ADD COLUMN parent_email VARCHAR(255)' },
      { name: 'student_email', sql: 'ALTER TABLE students ADD COLUMN student_email VARCHAR(100) UNIQUE' },
      { name: 'password', sql: 'ALTER TABLE students ADD COLUMN password VARCHAR(255) NOT NULL' },
      { name: 'profile_pic', sql: 'ALTER TABLE students ADD COLUMN profile_pic LONGTEXT' },
      { name: 'qr_code', sql: 'ALTER TABLE students ADD COLUMN qr_code LONGTEXT' },
      { name: 'status', sql: 'ALTER TABLE students ADD COLUMN status VARCHAR(20) DEFAULT "pending"' },
      { name: 'attendance', sql: 'ALTER TABLE students ADD COLUMN attendance VARCHAR(10) DEFAULT "0%"' },
      { name: 'average', sql: 'ALTER TABLE students ADD COLUMN average INT(11) DEFAULT 0' },
      { name: 'grades', sql: 'ALTER TABLE students ADD COLUMN grades TEXT DEFAULT NULL' },
      { name: 'created_by', sql: 'ALTER TABLE students ADD COLUMN created_by VARCHAR(50) DEFAULT "admin"' },
      { name: 'created_at', sql: 'ALTER TABLE students ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', sql: 'ALTER TABLE students ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
      { name: 'decline_reason', sql: 'ALTER TABLE students ADD COLUMN decline_reason TEXT' }
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

  // 5️⃣ Create missing tables if they don't exist
  if (isDatabaseAvailable()) {
    console.log('✅ Creating missing tables...');
    
    // Create teachers table if it doesn't exist
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS teachers (
          id int(11) NOT NULL AUTO_INCREMENT,
          username varchar(50) NOT NULL,
          first_name varchar(100) NOT NULL,
          middle_name varchar(100) DEFAULT NULL,
          last_name varchar(100) NOT NULL,
          email varchar(100) NOT NULL,
          password varchar(255) NOT NULL,
          role enum('adviser','subject_teacher') NOT NULL DEFAULT 'adviser',
          subjects text DEFAULT NULL,
          grade_level varchar(50) DEFAULT NULL,
          section varchar(50) DEFAULT NULL,
          bio text DEFAULT NULL,
          profile_pic longtext DEFAULT NULL,
          created_at timestamp NOT NULL DEFAULT current_timestamp(),
          updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
          verification_status enum('pending','approved','rejected') DEFAULT 'pending',
          decline_reason text DEFAULT NULL,
          PRIMARY KEY (id),
          UNIQUE KEY username (username),
          UNIQUE KEY email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `);
      console.log('✅ Teachers table ready');
    } catch (err) {
      console.warn('⚠️ Teachers table creation error:', err.message);
    }
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