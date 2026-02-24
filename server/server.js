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
console.log('DB_USER:', process.env.DB_USER || 'NOT SET');
console.log('DB_NAME:', process.env.DB_NAME || 'NOT SET');
console.log('DB_PORT:', process.env.DB_PORT || 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET');
console.log('========================');
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const classRoutes = require('./routes/classRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');

const app = express();

// CORS - allow Vercel frontend
const allowedOrigins = [
  'http://localhost:5173',
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
app.use(express.json());

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

// API routes
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/attendance', attendanceRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

const PORT = process.env.PORT || 5000;

(async () => {
  // Sync QR codes on startup
  await syncQRCodesOnStartup();
  
  app.listen(PORT, '0.0.0.0', (err) => {
    if (err) {
      console.error('Error starting server:', err);
      return;
    }
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
    console.log(`Access from network at http://192.168. 0.153:${PORT}`);
  }).on('error', (err) => {
    console.error('Server error:', err);
  });
})();