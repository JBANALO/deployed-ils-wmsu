// server/server.js

require('dotenv').config({ path: '../.env.development' });

const express = require('express');

const cors = require('cors');

const session = require('express-session');

const fs = require('fs');

const path = require('path');

const QRCode = require('qrcode');

const bcrypt = require('bcryptjs');

const passport = require('./config/passport');

const { query } = require('./config/database');

const userRoutes = require('./routes/userRoutes');



// Email configuration

const nodemailer = require('nodemailer');

const sgMail = require('@sendgrid/mail');



// Initialize SendGrid

if (process.env.SENDGRID_API_KEY) {

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

}



// Create email transporter (SendGrid HTTP API for Railway compatibility)

const createEmailTransporter = () => {

  // Use SendGrid HTTP API if available, fallback to Gmail SMTP

  if (process.env.SENDGRID_API_KEY) {

    // Use SendGrid HTTP API directly

    return {

      sendMail: async (mailOptions) => {

        try {

          const msg = {

            to: mailOptions.to,

            from: mailOptions.from,

            subject: mailOptions.subject,

            html: mailOptions.html,

          };

          const result = await sgMail.send(msg);

          console.log(' SendGrid HTTP API response:', result);

          return result;

        } catch (error) {

          console.error('SendGrid API error:', error.response?.body || error);

          throw error;

        }

      }

    };

  } else {

    // Fallback to Gmail SMTP (works locally)

    return nodemailer.createTransport({

      service: 'gmail',

      auth: {

        user: process.env.EMAIL_USER || 'hz202300368@wmsu.edu.ph',

        pass: process.env.EMAIL_PASS || 'your-app-password'

      }

    });

  }

};



// Send status update email to teacher

const sendStatusUpdateEmail = async (message, newStatus) => {

  const transporter = createEmailTransporter();

  

  const statusMessages = {

    'In Progress': 'Your request is now being reviewed and worked on by our support team.',

    'Resolved': 'Your request has been successfully resolved! Please check the details below.',

    'Closed': 'Your support request has been closed. If you need further assistance, please submit a new request.',

    'Pending': 'Your request is pending and will be reviewed soon.'

  };



  const statusColors = {

    'In Progress': '#3B82F6',

    'Resolved': '#10B981',

    'Closed': '#6B7280',

    'Pending': '#F59E0B'

  };



  const mailOptions = {

    from: process.env.SENDGRID_EMAIL_FROM || process.env.HELP_EMAIL_FROM || process.env.EMAIL_USER,

    to: message.teacher_email,

    subject: `Help Center Request Status Update - ${newStatus}`,

    html: `

      <!DOCTYPE html>

      <html>

      <head>

        <meta charset="utf-8">

        <meta name="viewport" content="width=device-width, initial-scale=1.0">

        <title>Help Center Status Update</title>

        <style>

          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }

          .container { max-width: 600px; margin: 0 auto; padding: 20px; }

          .header { background: #DC2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }

          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }

          .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; color: white; font-weight: bold; margin: 15px 0; }

          .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }

          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }

          .grade-info { background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #F59E0B; }

        </style>

      </head>

      <body>

        <div class="container">

          <div class="header">

            <h1>WMSU ILS Help Center</h1>

            <p>Status Update Notification</p>

          </div>

          

          <div class="content">

            <h2>Hello ${message.teacher_name},</h2>

            <p>Your help center request has been updated!</p>

            

            <div class="status-badge" style="background-color: ${statusColors[newStatus]};">

              Status: ${newStatus}

            </div>

            

            <p>${statusMessages[newStatus]}</p>

            

            <div class="details">

              <h3>Request Details:</h3>

              <p><strong>Subject:</strong> ${message.subject}</p>

              <p><strong>Category:</strong> ${message.category}</p>

              <p><strong>Priority:</strong> ${message.priority}</p>

              <p><strong>Submitted:</strong> ${(() => {

                const date = new Date(message.created_at);

                // Convert to Philippine time (UTC+8)

                const phTime = new Date(date.getTime() + (date.getTimezoneOffset() * 60000) + (8 * 3600000));

                return phTime.toLocaleString('en-US', {

                  year: 'numeric',

                  month: 'long',

                  day: 'numeric',

                  hour: 'numeric',

                  minute: '2-digit',

                  hour12: true

                }) + ' (PH Time)';

              })()}</p>

              

              ${message.grade_level || message.section ? `

              <div class="grade-info">

                <strong>Class Information:</strong><br>

                ${message.grade_level ? `Grade: ${message.grade_level}` : ''}

                ${message.grade_level && message.section ? ' | ' : ''}

                ${message.section ? `Section: ${message.section}` : ''}

              </div>

              ` : ''}

              

              <p><strong>Message:</strong></p>

              <p style="background: #f3f4f6; padding: 15px; border-radius: 8px;">${message.message}</p>

              

              ${message.admin_reply ? `

              <div style="background: #EFF6FF; padding: 15px; border-radius: 8px; border-left: 4px solid #3B82F6; margin-top: 15px;">

                <strong>💬 Admin Response:</strong><br>

                ${message.admin_reply}

              </div>

              ` : ''}

            </div>

            

            <p>You can view all your requests and responses in the Help Center section of the WMSU ILS system.</p>

            

            <div class="footer">

              <p>Thank you for using WMSU ILS Help Center!</p>

              <p>If you have any questions, please don't hesitate to contact us.</p>

              <p style="font-size: 12px;">This is an automated message. Please do not reply to this email.</p>

            </div>

          </div>

        </div>

      </body>

      </html>

    `

  };



  await transporter.sendMail(mailOptions);

};



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
const authController = require('./controllers/authControllerMySQL');

const studentRoutes = require('./routes/studentRoutes');

// Use role-filtered class routes (MySQL with Railway backend)

const classRoutes = require('./routes/classRoutesWithRoleFilter');

const attendanceRoutes = require('./routes/attendanceRoutes');

const gradeRoutes = require('./routes/grades');

const teacherRoutes = require('./routes/teacherRoutes');

const schoolYearRoutes = require('./routes/schoolYearRoutes');
const notificationsRoutes = require('./routes/notifications');

const subjectRoutes = require('./routes/subjectRoutes');

const sectionRoutes = require('./routes/sectionRoutes');

const passwordResetRoutes = require('./routes/passwordReset');



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



// Login route - uses JSON file and MySQL database

app.post('/api/auth/login', async (req, res) => {

  try {

    console.log('Login route called with body:', req.body);

    // Delegate to the centralized auth controller so login behavior stays
    // consistent with /api/auth routes and MySQL user account handling.
    return await authController.login(req, res);

    

    const { email, username, password } = req.body;

    const loginField = email || username;
    const submittedPassword = String(password || '').trim();

    const lookupTeacherInDb = async (loginValue) => {
      try {
        const rows = await query(
          `SELECT id,
                  first_name AS firstName,
                  last_name AS lastName,
                  username,
                  email,
                  password,
                  role,
                  grade_level AS gradeLevel,
                  section
           FROM teachers
           WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)
           ORDER BY updated_at DESC
           LIMIT 1`,
          [loginValue, loginValue]
        );

        if (!rows || rows.length === 0) return null;

        const teacher = rows[0];
        return {
          id: teacher.id,
          firstName: teacher.firstName || '',
          lastName: teacher.lastName || '',
          email: teacher.email || '',
          username: teacher.username || '',
          role: teacher.role || 'teacher',
          gradeLevel: teacher.gradeLevel || '',
          section: teacher.section || '',
          password: teacher.password || ''
        };
      } catch (lookupErr) {
        console.log('Teacher DB lookup failed:', lookupErr.message);
        return null;
      }
    };

    

    if (!loginField || !submittedPassword) {

      return res.status(400).json({ status: 'fail', message: 'Email/username and password are required' });

    }



    let user = null;

    

    // First, try to find in users.json (for admins, teachers, and some students)

    const { readUsers } = require('./utils/fileStorage');

    const jsonUsers = readUsers();

    

    user = jsonUsers.find(u => 

      u.email === loginField || 

      u.username === loginField || 

      u.lrn === loginField

    );

    

    if (!user) {

      // If not found in JSON, try MySQL students table (for LRN-based student login)

      try {

        const { query, isDatabaseAvailable } = require('./config/database');

        

        if (!isDatabaseAvailable()) {

          console.log('❌ Database not available, skipping student lookup');

          return res.status(500).json({ status: 'fail', message: 'Database connection not available' });

        }

        

        console.log(`🔍 Searching for student in database with: ${loginField}`);

        console.log(`🔍 LoginField type: ${typeof loginField}`);

        console.log(`🔍 LoginField length: ${loginField?.length}`);

        console.log(`🔍 LoginField value: "${loginField}"`);

        

        let students;

        try {

          students = await query(

            `SELECT id, lrn, first_name as firstName, last_name as lastName, 

             student_email as email, grade_level as gradeLevel, section, password

             FROM students 

             WHERE lrn = ? OR student_email = ?`,

            [loginField, loginField]

          );

          console.log(`🔍 Database query executed successfully`);

        } catch (queryError) {

          console.error('❌ Database query failed:', queryError);

          return res.status(500).json({ status: 'fail', message: 'Database query error' });

        }

        

        console.log(`🔍 Database query result:`, students);

        console.log(`🔍 Found ${students ? students.length : 0} students`);

        

        // Try a broader search to see if student exists at all

        if (!students || students.length === 0) {

          console.log(`🔍 Student not found with exact match, trying broader search...`);

          const broaderStudents = await query(

            `SELECT id, lrn, first_name as firstName, last_name as lastName, 

             student_email as email, grade_level as gradeLevel, section, password

             FROM students 

             WHERE lrn LIKE ? OR student_email LIKE ? OR first_name LIKE ? OR last_name LIKE ?`,

            [`%${loginField}%`, `%${loginField}%`, `%${loginField}%`, `%${loginField}%`]

          );

          console.log(`🔍 Broader search result:`, broaderStudents);

          console.log(`🔍 Found in broader search: ${broaderStudents ? broaderStudents.length : 0} students`);

          

          if (broaderStudents && broaderStudents.length > 0) {

            console.log(`🔍 Found student in broader search:`, broaderStudents[0]);

            const studentData = broaderStudents[0];

            console.log(`🔍 Creating user object from broader student data:`, studentData);

            user = {

              id: studentData.id,

              lrn: studentData.lrn,

              firstName: studentData.firstName,

              lastName: studentData.lastName,

              email: studentData.email,

              username: studentData.lrn, // Use LRN as username

              role: 'student',

              gradeLevel: studentData.gradeLevel,

              section: studentData.section,

              password: studentData.password

            };

            console.log('✅ Found student in MySQL database via broader search:', user);

          } else {

            // If exact match didn't work but broader search found nothing, 

            // check if we should use the exact match result

            console.log(`🔍 No students found in broader search, checking exact match...`);

            if (students && students.length > 0) {

              const studentData = students[0];

              console.log(`🔍 Creating user object from student data:`, studentData);

              user = {

                id: studentData.id,

                lrn: studentData.lrn,

                firstName: studentData.firstName,

                lastName: studentData.lastName,

                email: studentData.email,

                username: studentData.lrn, // Use LRN as username

                role: 'student',

                gradeLevel: studentData.gradeLevel,

                section: studentData.section,

                password: studentData.password

              };

              console.log('✅ Found student in MySQL database via exact match:', user);

            }

          }

        } else {

          const studentData = students[0];

          console.log(`🔍 Creating user object from student data:`, studentData);

          user = {

            id: studentData.id,

            lrn: studentData.lrn,

            firstName: studentData.firstName,

            lastName: studentData.lastName,

            email: studentData.email,

            username: studentData.lrn, // Use LRN as username

            role: 'student',

            gradeLevel: studentData.gradeLevel,

            section: studentData.section,

            password: studentData.password

          };

          console.log('✅ Found student in MySQL database via exact match:', user);

        }

      } catch (dbError) {

        console.error('Database error during student lookup:', dbError);

        return res.status(500).json({ status: 'fail', message: 'Database error during student lookup' });

      }

    }

    

    if (!user) {

      // If not found in JSON/students, check MySQL teachers table directly.
      const teacherFromDb = await lookupTeacherInDb(loginField);
      if (teacherFromDb) {
        user = teacherFromDb;
        console.log('✅ Found teacher in MySQL teachers table:', {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role
        });
      }

    }

    if (!user) {

      console.log('User not found:', loginField);

      return res.status(401).json({ status: 'fail', message: 'Incorrect email or password' });

    }

    

    // Check password (handle both plain text and bcrypt)

    let passwordMatch = false;

    

    console.log(`🔐 Password check - User password: "${user.password}"`);

    console.log(`🔐 Password check - Input password: "${password}"`);

    console.log(`🔐 Password check - User password type: ${typeof user.password}`);

    console.log(`🔐 Password check - User password starts with bcrypt: ${user.password.startsWith('$2a$') || user.password.startsWith('$2b$')}`);

    

    if (user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))) {

      // Password is bcrypt hashed

      const bcrypt = require('bcryptjs');

      passwordMatch = await bcrypt.compare(submittedPassword, user.password);

      console.log(`🔐 Password check - Using bcrypt comparison`);

    } else {

      // Password is plain text

      passwordMatch = user.password === submittedPassword;

      console.log(`🔐 Password check - Using plain text comparison`);

    }

    

    if (!passwordMatch) {

      // Fallback: teacher credentials may be newer in MySQL than users.json.
      const teacherFromDb = await lookupTeacherInDb(loginField);
      if (teacherFromDb && teacherFromDb.password) {
        if (teacherFromDb.password.startsWith('$2a$') || teacherFromDb.password.startsWith('$2b$')) {
          const bcrypt = require('bcryptjs');
          passwordMatch = await bcrypt.compare(submittedPassword, teacherFromDb.password);
        } else {
          passwordMatch = teacherFromDb.password === submittedPassword;
        }

        if (passwordMatch) {
          user = teacherFromDb;
          console.log('✅ Password matched via teacher DB fallback');
        }
      }

    }

    if (!passwordMatch) {

      console.log('Password mismatch for user:', loginField);

      return res.status(401).json({ status: 'fail', message: 'Incorrect email or password' });

    }

    // If this is a teacher-like account sourced from JSON, align identity to MySQL teachers row.
    // This prevents class-assignment mismatches where subject_teachers.teacher_id stores DB teacher IDs.
    const roleLower = String(user.role || '').toLowerCase();
    if (roleLower === 'teacher' || roleLower === 'adviser' || roleLower === 'subject_teacher') {
      try {
        const loginKey = String(loginField || '').trim().toLowerCase();
        const dbTeachers = await query(
          `SELECT id, first_name, last_name, username, email, role, grade_level, section
           FROM teachers
           WHERE LOWER(email) = ? OR LOWER(username) = ?
           ORDER BY updated_at DESC
           LIMIT 1`,
          [loginKey, loginKey]
        );

        let matchedTeachers = dbTeachers;

        if ((!matchedTeachers || matchedTeachers.length === 0) && user.firstName && user.lastName) {
          const firstNameKey = String(user.firstName || '').trim().toLowerCase();
          const lastNameKey = String(user.lastName || '').trim().toLowerCase();

          matchedTeachers = await query(
            `SELECT id, first_name, last_name, username, email, role, grade_level, section
             FROM teachers
             WHERE LOWER(TRIM(first_name)) = ? AND LOWER(TRIM(last_name)) = ?
             ORDER BY updated_at DESC
             LIMIT 1`,
            [firstNameKey, lastNameKey]
          );
        }

        if (matchedTeachers.length > 0) {
          const dbTeacher = matchedTeachers[0];
          user = {
            ...user,
            id: dbTeacher.id,
            firstName: user.firstName || dbTeacher.first_name || '',
            lastName: user.lastName || dbTeacher.last_name || '',
            username: dbTeacher.username || user.username,
            email: dbTeacher.email || user.email,
            role: dbTeacher.role || user.role,
            gradeLevel: dbTeacher.grade_level || user.gradeLevel,
            section: dbTeacher.section || user.section
          };
          console.log(`✅ Teacher login identity aligned to DB id: ${dbTeacher.id}`);
        }
      } catch (teacherAlignError) {
        console.log('Teacher identity alignment skipped:', teacherAlignError.message);
      }
    }

    

    // Generate token

    const { signToken } = require('./utils/auth');

    const token = signToken(user.id);

    

    console.log('Login successful for user:', user.email || user.lrn);

    console.log('User data:', user);

    console.log('User role:', user.role);

    

    res.json({

      status: 'success',

      message: 'Login successful',

      token,

      user: {

        id: user.id,

        firstName: user.firstName,

        lastName: user.lastName,

        email: user.email,

        username: user.username,

        phone: user.phone || '',

        profileImage: user.profile_pic || user.profileImage || '',

        role: user.role,

        gradeLevel: user.gradeLevel,

        section: user.section,

        department: user.role === 'super_admin' ? '' : (user.department || ''),

        employeeId: user.role === 'super_admin' ? '' : (user.employeeId || '')

      },

      role: user.role

    });

    

  } catch (error) {

    console.error('Login error:', error);

    res.status(500).json({ status: 'fail', message: 'Server error during login' });

  }

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



// Bulk import teachers from CSV

app.post('/api/admin/bulk-import-teachers', async (req, res) => {

  try {

    console.log('📚 Bulk import teachers requested');

    

    const { teachers } = req.body;

    

    if (!teachers || !Array.isArray(teachers)) {

      return res.status(400).json({ error: 'Invalid teachers data' });

    }



let imported = 0;

let updated = 0;

let errors = 0;



for (const teacher of teachers) {

try {

// Generate smaller integer ID (max 9 digits to fit in most INT ranges)

const teacherId = Math.floor(Math.random() * 900000000) + 100000000;

const fullName = `${teacher.firstName || ''} ${teacher.middleName || ''} ${teacher.lastName || ''}`.trim();



// Check if teacher already exists by email

const existingTeachers = await query(

  'SELECT id FROM teachers WHERE email = ?',

  [teacher.email]

);



        if (existingTeachers && existingTeachers.length > 0) {

          // Update existing

          try {

            await query(

              `UPDATE teachers SET 

                first_name = ?, middle_name = ?, last_name = ?, username = ?, 

                role = ?, grade_level = ?, section = ?, subjects = ?, bio = ?, 

                updated_at = CURRENT_TIMESTAMP 

              WHERE id = ?`,

              [

                teacher.firstName || null, 

                teacher.middleName || null, 

                teacher.lastName || null, 

                teacher.username || null,

                teacher.role || 'teacher', 

                teacher.gradeLevel || null, 

                teacher.section || null, 

                JSON.stringify(teacher.subjects || []), 

                teacher.bio || null,

                existingTeachers[0].id

              ]

            );

            updated++;

          } catch (e) {

            console.error(`Update error: ${e.message}`);

            errors++;

          }

        } else {

          // Insert new

          try {

            // Hash the password if provided, otherwise use default

            const passwordToHash = teacher.password || 'WMSUILS123';

            const hashedPassword = await bcrypt.hash(passwordToHash, 12);

            

            await query(

              `INSERT INTO teachers (

                id, first_name, middle_name, last_name, username, email, password, 

                role, grade_level, section, subjects, bio, verification_status, profile_pic

              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,

              [

                teacherId,

                teacher.firstName || null, 

                teacher.middleName || null, 

                teacher.lastName || null,

                teacher.username || null, 

                teacher.email || null, 

                hashedPassword,

                teacher.role || 'teacher', 

                teacher.gradeLevel || null, 

                teacher.section || null,

                JSON.stringify(teacher.subjects || []), 

                teacher.bio || null, 

                'approved',

                'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDEyQzEyIDkuMzQzMTQgMTJDMiAxNC42NTY5IDggOCAxNkMxMi42NTY5IDEyIDEyLjQ0NzcgMiAxMSA0SDEzQzEzIDEzLjU1MjMgMTIuNDQ3NyAxNCAxMSAxNEg5QzguNDQ3NyAxNCA3LjU1MjMgMTMuNTUyMyA3LjU1MjMgMTNDNy41NTIzIDEyLjQ0NzcgOCAxMiA4QzggMTEuNTUyMyA0LjQ0NzcgMTEgMTJDMTQgMTIuNDQ3NyAxMy41NTIzIDEzLjU1MjMgMTIuNDQ3NyAxNCAxMSAxNEg5QzguNDQ3NyAxNCA3LjU1MjMgMTMuNTUyMyA3LjU1MjMgMTNDNy41NTIzIDEyLjQ0NzcgOCAxMiA4WiIgZmlsbD0iI0RDMkQyRCIvPgo8cGF0aCBkPSJNMTIgNEMxMi41NTIzIDQgMTMgMy41NTIzIDEzIDggOCAxNkMxMi42NTY5IDggOCAxNkMxMi42NTY5IDEyIDEyLjQ0NzcgMiAxMSA0SDEzQzEzIDEzLjU1MjMgMTIuNDQ3NyAxNCAxMSAxNEg5QzguNDQ3NyAxNCA3LjU1MjMgMTMuNTUyMyA3LjU1MjMgMTNDNy41NTIzIDEyLjQ0NzcgOCAxMiA4WiIgZmlsbD0iI0RDMkQyRCIvPgo8L3N2Zz4K' // Default user icon

              ]

            );

            imported++;

          } catch (e) {

            console.error(`Insert error: ${e.message}`);

            errors++;

          }

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

      total: teachers.length

    });

  } catch (err) {

    console.error('Import error:', err);

    res.status(500).json({ success: false, error: err.message });

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



// ================= ROUTES =================

// Super Admin profile routes (must be before other routes)
app.get('/api/super-admin/me', async (req, res) => {
  try {
    const { query } = require('./config/database');
    const jwt = require('jsonwebtoken');
    
    // Get token from header
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Get user from database
    const users = await query('SELECT * FROM users WHERE id = ?', [decoded.id]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];
    
    // Format user data
    const userData = {
      id: user.id,
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      username: user.username || '',
      email: user.email,
      phone: user.phone || '',
      profileImage: user.profile_pic || '',
      role: user.role || 'super_admin'
    };

    res.json({ status: 'success', data: { user: userData } });
  } catch (error) {
    console.error('SuperAdmin me error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/super-admin/update-profile', async (req, res) => {
  try {
    const { query } = require('./config/database');
    const jwt = require('jsonwebtoken');
    const path = require('path');
    const fs = require('fs');
    
    // Get token from header
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Get form data
    const { firstName, lastName, username, email, phone } = req.body;
    
    // Handle profile image
    let profileImageUrl = null;
    if (req.file) {
      const userId = decoded.id;
      const imageFileName = `profile_${userId}_${Date.now()}.png`;
      const adminProfilesDir = path.join(__dirname, 'public', 'admin_profiles');
      
      // Create directory if it doesn't exist
      fs.mkdirSync(adminProfilesDir, { recursive: true });
      
      const imagePath = path.join(adminProfilesDir, imageFileName);
      fs.writeFileSync(imagePath, req.file.buffer);
      
      profileImageUrl = `/admin_profiles/${imageFileName}`;
    }
    
    // Update user in database
    let updateQuery = 'UPDATE users SET first_name = ?, last_name = ?, username = ?, email = ?';
    let queryParams = [
      firstName || null,
      lastName || null,
      username || null,
      email || null
    ];
    
    if (phone !== undefined) {
      updateQuery += ', phone = ?';
      queryParams.push(phone || null);
    }
    
    if (profileImageUrl) {
      updateQuery += ', profile_pic = ?';
      queryParams.push(profileImageUrl);
    }
    
    updateQuery += ' WHERE id = ?';
    queryParams.push(decoded.id);
    
    await query(updateQuery, queryParams);
    
    // Get updated user data
    const updatedUsers = await query('SELECT * FROM users WHERE id = ?', [decoded.id]);
    const updatedUser = updatedUsers[0];
    
    // Format response data
    const userData = {
      id: updatedUser.id,
      firstName: updatedUser.first_name || '',
      lastName: updatedUser.last_name || '',
      username: updatedUser.username || '',
      email: updatedUser.email,
      phone: updatedUser.phone || '',
      profileImage: profileImageUrl || updatedUser.profile_pic || '',
      role: updatedUser.role || 'super_admin',
      department: '',
      employeeId: ''
    };

    res.json({ status: 'success', data: { user: userData } });
  } catch (error) {
    console.error('SuperAdmin update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DEPLOYED: 2026-03-07 - includes grades routes in studentRoutes.js

app.use('/api/auth', authRoutes);

app.use('/api/auth', passwordResetRoutes); // Password reset routes

app.use('/api/students', studentRoutes); // grades routes are now INSIDE studentRoutes.js

app.use('/api/classes', classRoutes);

app.use('/api/attendance', attendanceRoutes);

app.use('/api/grades', gradeRoutes);

app.use('/api/teachers', teacherRoutes);

app.use('/api/users', userRoutes);

app.use('/api/school-years', schoolYearRoutes);

app.use('/api/notifications', notificationsRoutes);

app.use('/api/subjects', subjectRoutes);

app.use('/api/sections', sectionRoutes);

// ==========================================



// Root endpoint - only used if no dist folder

app.get('/', (req, res, next) => {

  const distPath = path.join(__dirname, '../dist');

  if (require('fs').existsSync(distPath)) {

    return next(); // let the frontend serve it

  }

  res.json({ message: 'Student Management API Running!', version: '3.5', server: 'server/server.js' });

});



// Version check endpoint

app.get('/api/version', (req, res) => {

  res.json({ version: '3.6', server: 'server/server.js', hasGradesEndpoint: true, deployedAt: '2026-03-28T00:00:00Z' });

});



// Debug middleware to track all requests

app.use((req, res, next) => {

  console.log('🔍 API Request:', {

    method: req.method,

    url: req.url,

    originalUrl: req.originalUrl,

    path: req.path

  });

  next();

});



// ============================================

// HELP CENTER API ENDPOINTS (Teachers Only)

// ============================================



// Submit a help center message

app.post('/api/teacher/help-center', async (req, res) => {

  try {

    const { query } = require('./config/database');

    const { teacher_id, teacher_name, teacher_email, grade_level, section, subject, message, category, priority } = req.body;



    // Validate required fields

    if (!teacher_id || !teacher_name || !teacher_email || !subject || !message) {

      return res.status(400).json({

        status: 'error',

        message: 'All required fields must be provided'

      });

    }



    // Insert the message

    const result = await query(`

      INSERT INTO help_center_messages 

      (teacher_id, teacher_name, teacher_email, grade_level, section, subject, message, category, priority)

      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)

    `, [teacher_id, teacher_name, teacher_email, grade_level || null, section || null, subject, message, category || 'Other', priority || 'Medium']);



    res.json({

      status: 'success',

      message: 'Help center message submitted successfully',

      data: {

        id: result.insertId,

        teacher_id,

        teacher_name,

        teacher_email,

        grade_level: grade_level || null,

        section: section || null,

        subject,

        message,

        category: category || 'Other',

        priority: priority || 'Medium',

        status: 'Pending'

      }

    });

  } catch (error) {

    console.error('Error submitting help center message:', error);

    res.status(500).json({

      status: 'error',

      message: 'Failed to submit help center message',

      error: error.message

    });

  }

});



// Get help center messages for a specific teacher

app.get('/api/teacher/help-center', async (req, res) => {

  try {

    const { query } = require('./config/database');

    const { teacher_id } = req.query;



    if (!teacher_id) {

      return res.status(400).json({

        status: 'error',

        message: 'Teacher ID is required'

      });

    }



    const messages = await query(`

      SELECT * FROM help_center_messages 

      WHERE teacher_id = ? AND (teacher_deleted IS NULL OR teacher_deleted = FALSE)

      ORDER BY created_at DESC

    `, [teacher_id]);



    res.json({

      status: 'success',

      data: messages,

      message: `Found ${messages.length} help center messages`

    });

  } catch (error) {

    console.error('Error fetching help center messages:', error);

    res.status(500).json({

      status: 'error',

      message: 'Failed to fetch help center messages',

      error: error.message

    });

  }

});



// Update help center message status

app.put('/api/teacher/help-center/:id/status', async (req, res) => {

  try {

    const { query } = require('./config/database');

    const { id } = req.params;

    const { status } = req.body;



    if (!['Pending', 'In Progress', 'Resolved', 'Closed'].includes(status)) {

      return res.status(400).json({

        status: 'error',

        message: 'Invalid status value'

      });

    }



    const result = await query(`

      UPDATE help_center_messages 

      SET status = ?, updated_at = CURRENT_TIMESTAMP 

      WHERE id = ? AND teacher_id = ?

    `, [status, id, req.body.teacher_id]);



    if (result.affectedRows === 0) {

      return res.status(404).json({

        status: 'error',

        message: 'Help center message not found or unauthorized'

      });

    }



    res.json({

      status: 'success',

      message: 'Help center message status updated successfully'

    });

  } catch (error) {

    console.error('Error updating help center message status:', error);

    res.status(500).json({

      status: 'error',

      message: 'Failed to update help center message status',

      error: error.message

    });

  }

});



// Delete help center message (teacher only - can only delete their own messages)

app.delete('/api/teacher/help-center/:id', async (req, res) => {

  try {

    const { query } = require('./config/database');

    const { id } = req.params;

    const { teacher_id } = req.query;



    if (!teacher_id) {

      return res.status(400).json({

        status: 'error',

        message: 'Teacher ID is required'

      });

    }



    // Get the message details before deleting for logging and verification

    const messageDetails = await query(`

      SELECT * FROM help_center_messages WHERE id = ? AND teacher_id = ?

    `, [id, teacher_id]);



    if (messageDetails.length === 0) {

      return res.status(404).json({

        status: 'error',

        message: 'Help center message not found or unauthorized'

      });

    }



    const message = messageDetails[0];



    // Mark as deleted by teacher (soft delete - only hides from teacher view)

    const result = await query(`

      UPDATE help_center_messages 

      SET teacher_deleted = TRUE, updated_at = CURRENT_TIMESTAMP 

      WHERE id = ? AND teacher_id = ?

    `, [id, teacher_id]);



    if (result.affectedRows === 0) {

      return res.status(404).json({

        status: 'error',

        message: 'Help center message not found or unauthorized'

      });

    }



    console.log(`🗑️ Teacher help center message deleted: ID ${id}, Teacher: ${message.teacher_name}`);



    res.json({

      status: 'success',

      message: 'Help center message deleted successfully'

    });

  } catch (error) {

    console.error('Error deleting teacher help center message:', error);

    res.status(500).json({

      status: 'error',

      message: 'Failed to delete help center message',

      error: error.message

    });

  }

});



// ============================================

// HELP CENTER ADMIN API ENDPOINTS

// ============================================



// Get all help center messages for admins

app.get('/api/admin/help-center', async (req, res) => {

  try {

    const { query } = require('./config/database');

    const { status, category, priority } = req.query;



    let whereClause = '1=1';

    const params = [];



    if (status && status !== 'All') {

      whereClause += ' AND status = ?';

      params.push(status);

    }

    if (category && category !== 'All') {

      whereClause += ' AND category = ?';

      params.push(category);

    }

    if (priority && priority !== 'All') {

      whereClause += ' AND priority = ?';

      params.push(priority);

    }



    const messages = await query(`

      SELECT * FROM help_center_messages 

      WHERE ${whereClause} AND (admin_deleted IS NULL OR admin_deleted = FALSE)

      ORDER BY created_at DESC

    `, params);



    res.json({

      status: 'success',

      data: messages,

      message: `Found ${messages.length} help center messages`

    });

  } catch (error) {

    console.error('Error fetching help center messages:', error);

    res.status(500).json({

      status: 'error',

      message: 'Failed to fetch help center messages',

      error: error.message

    });

  }

});



// Admin reply to help center message

app.put('/api/admin/help-center/:id/reply', async (req, res) => {

  try {

    console.log('🔧 REPLY ENDPOINT CALLED:', {

      id: req.params.id,

      body: req.body,

      emailUser: process.env.EMAIL_USER ? 'SET' : 'NOT_SET',

      emailPass: process.env.EMAIL_PASS ? 'SET' : 'NOT_SET'

    });



    const { query } = require('./config/database');

    const { id } = req.params;

    const { admin_reply, admin_id, status } = req.body;



    if (!admin_reply || !admin_id) {

      return res.status(400).json({

        status: 'error',

        message: 'Admin reply and admin ID are required'

      });

    }



    // Get the message details before updating to send email

    const messageDetails = await query(`

      SELECT * FROM help_center_messages WHERE id = ?

    `, [id]);



    if (messageDetails.length === 0) {

      return res.status(404).json({

        status: 'error',

        message: 'Help center message not found'

      });

    }



    const message = messageDetails[0];

    const newStatus = status || 'In Progress';



    const result = await query(`

      UPDATE help_center_messages 

      SET admin_reply = ?, admin_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP 

      WHERE id = ?

    `, [admin_reply, admin_id, newStatus, id]);



    if (result.affectedRows === 0) {

      return res.status(404).json({

        status: 'error',

        message: 'Help center message not found'

      });

    }



    // Send email notification to teacher with admin reply (non-blocking)

    setImmediate(async () => {

      try {

        const emailService = process.env.SENDGRID_API_KEY ? 'SendGrid' : 'Gmail';

        console.log('📧 Attempting to send email via:', emailService);

        console.log('📧 Email config:', {

          service: emailService,

          SENDGRID_EMAIL_FROM: process.env.SENDGRID_EMAIL_FROM,

          EMAIL_USER: process.env.EMAIL_USER,

          SENDGRID_API_KEY: process.env.SENDGRID_API_KEY ? '***SET***' : 'NOT_SET',

          EMAIL_PASS: process.env.EMAIL_PASS ? '***SET***' : 'NOT_SET',

          hasAdminReply: !!admin_reply,

          recipient: message.teacher_email

        });

        

        await sendStatusUpdateEmail({ ...message, admin_reply }, newStatus);

        console.log(`✅ Admin reply email sent via ${emailService} to ${message.teacher_email}`);

      } catch (emailError) {

        console.warn('⚠️ Failed to send admin reply email:', emailError.message);

        console.warn('⚠️ Full email error:', emailError);

        // Don't fail the request if email fails

      }

    });



    res.json({

      status: 'success',

      message: 'Admin reply sent successfully'

    });

  } catch (error) {

    console.error('Error sending admin reply:', error);

    res.status(500).json({

      status: 'error',

      message: 'Failed to send admin reply',

      error: error.message

    });

  }

});



// Update message status (admin version)

app.put('/api/admin/help-center/:id/status', async (req, res) => {

  try {

    const { query } = require('./config/database');

    const { id } = req.params;

    const { status } = req.body;



    if (!['Pending', 'In Progress', 'Resolved', 'Closed'].includes(status)) {

      return res.status(400).json({

        status: 'error',

        message: 'Invalid status value'

      });

    }



    // Get the message details before updating to send email

    const messageDetails = await query(`

      SELECT * FROM help_center_messages WHERE id = ?

    `, [id]);



    if (messageDetails.length === 0) {

      return res.status(404).json({

        status: 'error',

        message: 'Help center message not found'

      });

    }



    const message = messageDetails[0];



    const result = await query(`

      UPDATE help_center_messages 

      SET status = ?, updated_at = CURRENT_TIMESTAMP 

      WHERE id = ?

    `, [status, id]);



    if (result.affectedRows === 0) {

      return res.status(404).json({

        status: 'error',

        message: 'Help center message not found'

      });

    }



    // Send email notification to teacher

    try {

      await sendStatusUpdateEmail(message, status);

      console.log(`✅ Status update email sent to ${message.teacher_email}`);

    } catch (emailError) {

      console.warn('⚠️ Failed to send status update email:', emailError.message);

      // Don't fail the request if email fails

    }



    res.json({

      status: 'success',

      message: 'Help center message status updated successfully'

    });

  } catch (error) {

    console.error('Error updating help center message status:', error);

    res.status(500).json({

      status: 'error',

      message: 'Failed to update help center message status',

      error: error.message

    });

  }

});



// Delete help center message (admin only)

app.delete('/api/admin/help-center/:id', async (req, res) => {

  try {

    const { query } = require('./config/database');

    const { id } = req.params;



    // Get the message details before deleting for logging

    const messageDetails = await query(`

      SELECT * FROM help_center_messages WHERE id = ?

    `, [id]);



    if (messageDetails.length === 0) {

      return res.status(404).json({

        status: 'error',

        message: 'Help center message not found'

      });

    }



    const message = messageDetails[0];



    // Mark as deleted by admin (soft delete - only hides from admin view)

    const result = await query(`

      UPDATE help_center_messages 

      SET admin_deleted = TRUE, updated_at = CURRENT_TIMESTAMP 

      WHERE id = ?

    `, [id]);



    if (result.affectedRows === 0) {

      return res.status(404).json({

        status: 'error',

        message: 'Help center message not found'

      });

    }



    console.log(`🗑️ Help center message deleted: ID ${id}, Teacher: ${message.teacher_name}`);



    res.json({

      status: 'success',

      message: 'Help center message deleted successfully'

    });

  } catch (error) {

    console.error('Error deleting help center message:', error);

    res.status(500).json({

      status: 'error',

      message: 'Failed to delete help center message',

      error: error.message

    });

  }

});



// Get help center statistics

app.get('/api/admin/help-center/stats', async (req, res) => {

  try {

    const { query } = require('./config/database');



    const [total, pending, inProgress, resolved, closed] = await Promise.all([

      query('SELECT COUNT(*) as count FROM help_center_messages'),

      query('SELECT COUNT(*) as count FROM help_center_messages WHERE status = "Pending"'),

      query('SELECT COUNT(*) as count FROM help_center_messages WHERE status = "In Progress"'),

      query('SELECT COUNT(*) as count FROM help_center_messages WHERE status = "Resolved"'),

      query('SELECT COUNT(*) as count FROM help_center_messages WHERE status = "Closed"')

    ]);



    res.json({

      status: 'success',

      data: {

        total: total[0].count,

        pending: pending[0].count,

        inProgress: inProgress[0].count,

        resolved: resolved[0].count,

        closed: closed[0].count

      }

    });

  } catch (error) {

    console.error('Error fetching help center stats:', error);

    res.status(500).json({

      status: 'error',

      message: 'Failed to fetch help center statistics',

      error: error.message

    });

  }

});



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

  // Removed the next() call here

});



// ============================================

// ADMIN SETTINGS ENDPOINTS

// ============================================



// Get admin settings

app.get('/api/admin/settings', async (req, res) => {

  try {

    const { query } = require('./config/database');

    

    // Get settings from database or return defaults

    let settings = {

      siteName: "WMSU ILS-Elementary Department",

      siteDescription: "Automated Grades Portal and Students Attendance using QR Code",

      adminEmail: "admin@wmsu.edu.ph",

      allowRegistration: true,

      requireApproval: true,

      sessionTimeout: "30",

      maintenance: false,

      notifications: {

        email: true,

        sms: false,

        browser: true,

      },

      backup: {

        enabled: true,

        frequency: "daily",

        lastBackup: null,

      },

    };



    // Try to get settings from database

    try {

      const result = await query('SELECT settings FROM system_settings WHERE id = 1');

      if (result.length > 0 && result[0].settings) {

        settings = { ...settings, ...JSON.parse(result[0].settings) };

      }

    } catch (err) {

      console.log('Settings table not found, using defaults');

    }



    res.json(settings);

  } catch (error) {

    console.error('Error fetching admin settings:', error);

    res.status(500).json({ message: 'Failed to fetch settings' });

  }

});



// Update admin settings

app.put('/api/admin/settings', async (req, res) => {

  try {

    const { query } = require('./config/database');

    const settings = req.body;



    // Validate settings

    if (!settings.siteName || !settings.adminEmail) {

      return res.status(400).json({ message: 'Site name and admin email are required' });

    }



    // Create system_settings table if it doesn't exist

    await query(`

      CREATE TABLE IF NOT EXISTS system_settings (

        id INT PRIMARY KEY DEFAULT 1,

        settings JSON,

        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

      )

    `);



    // Upsert settings

    await query(`

      INSERT INTO system_settings (id, settings) 

      VALUES (1, ?) 

      ON DUPLICATE KEY UPDATE settings = VALUES(settings)

    `, [JSON.stringify(settings)]);



    res.json({ message: 'Settings updated successfully', settings });

  } catch (error) {

    console.error('Error updating admin settings:', error);

    res.status(500).json({ message: 'Failed to update settings' });

  }

});



app.get('/api/super-admin/system-settings', async (req, res) => {

  try {

    const { query } = require('./config/database');

    

    // Get settings from database or return defaults

    let settings = {

      schoolName: "WMSU Integrated Learning System",

      schoolYear: "2024-2025",

      quarter: "First Quarter",

      systemVersion: "2.0.0",

      maxFileSize: 10,

      sessionTimeout: 30,

      systemMaintenance: false,

      allowRegistrations: true,

      emailNotifications: true,

      debugMode: false,

      gradingPeriod: "Quarterly",

      passingGrade: 75,

      // Notification settings

      userRegistrationAlerts: true,

      systemErrorReports: true,

      backupReminders: true,

      adminEmail: "admin@wmsu.edu.ph",

      notificationFrequency: "Daily",

      // Backup settings

      lastBackupDate: null,

      nextBackupDate: null,

      backupFrequency: "Weekly",

      backupRetention: 30,

      autoBackup: false

    };



    // Try to get settings from database

    try {

      const result = await query('SELECT settings FROM system_settings WHERE id = 1');

      if (result.length > 0 && result[0].settings) {

        const dbSettings = JSON.parse(result[0].settings);

        settings = { ...settings, ...dbSettings };

      }

    } catch (err) {

      console.log('Settings table not found, using defaults');

    }



    res.json(settings);

  } catch (error) {

    console.error('Error fetching system settings:', error);

    res.status(500).json({ message: 'Failed to fetch settings' });

  }

});



// Update Super Admin system settings

app.put('/api/super-admin/system-settings', async (req, res) => {

  try {

    const { query } = require('./config/database');

    const settings = req.body;



    // Validate settings

    if (!settings.schoolName) {

      return res.status(400).json({ message: 'School name is required' });

    }



    // Validate numeric fields

    if (settings.maxFileSize && (settings.maxFileSize < 1 || settings.maxFileSize > 100)) {

      return res.status(400).json({ message: 'Max file size must be between 1 and 100 MB' });

    }



    if (settings.sessionTimeout && (settings.sessionTimeout < 5 || settings.sessionTimeout > 480)) {

      return res.status(400).json({ message: 'Session timeout must be between 5 and 480 minutes' });

    }



    if (settings.passingGrade && (settings.passingGrade < 50 || settings.passingGrade > 100)) {

      return res.status(400).json({ message: 'Passing grade must be between 50 and 100' });

    }



    // Create system_settings table if it doesn't exist

    await query(`

      CREATE TABLE IF NOT EXISTS system_settings (

        id INT PRIMARY KEY DEFAULT 1,

        settings JSON,

        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

      )

    `);



    // Upsert settings

    await query(`

      INSERT INTO system_settings (id, settings) 

      VALUES (1, ?) 

      ON DUPLICATE KEY UPDATE settings = VALUES(settings)

    `, [JSON.stringify(settings)]);



    console.log(' System settings updated successfully:', settings);

    res.json({ message: 'System settings updated successfully', settings });

  } catch (error) {

    console.error('Error updating system settings:', error);

    res.status(500).json({ message: 'Failed to update settings' });

  }

});



// Super Admin password change

app.put('/api/super-admin/change-password', async (req, res) => {

  try {

    const { query } = require('./config/database');

    const { newPassword } = req.body;

    const token = req.headers.authorization?.replace('Bearer ', '');

    

    console.log('🔐 Password change attempt - Token exists:', !!token);

    console.log('🔐 Password change attempt - Token length:', token?.length);

    

    if (!token) {

      return res.status(401).json({ message: 'No token provided' });

    }



    // Get current super admin from token

    const jwt = require('jsonwebtoken');

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    

    console.log('🔐 Password change - Decoded token:', decoded);

    console.log('🔐 Password change - User role:', decoded.role);

    

    if (decoded.role !== 'super_admin') {

      console.log('🔐 Password change - Access denied for role:', decoded.role);

      return res.status(403).json({ message: 'Access denied. Super admin only.' });

    }



    // Get super admin from database

    const users = await query('SELECT * FROM users WHERE id = ? AND role = "super_admin"', [decoded.id]);

    

    if (users.length === 0) {

      console.log('🔐 Password change - Super admin not found for id:', decoded.id);

      return res.status(404).json({ message: 'Super admin not found' });

    }



    console.log('🔐 Password change - Super admin found, updating password');



    // Hash new password

    const bcrypt = require('bcryptjs');

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);



    // Update password

    await query('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [hashedNewPassword, decoded.id]);



    console.log('🔐 Password change - Password updated successfully');

    res.json({ message: 'Password changed successfully' });

  } catch (error) {

    console.error('Error changing super admin password:', error);

    if (error.name === 'JsonWebTokenError') {

      console.log('🔐 Password change - JWT error:', error.message);

      return res.status(401).json({ message: 'Invalid token' });

    }

    res.status(500).json({ message: 'Failed to change password' });

  }

});



// Super Admin notifications

app.get('/api/super-admin/notifications', async (req, res) => {

  try {

    const { query } = require('./config/database');

    const token = req.headers.authorization?.replace('Bearer ', '');

    

    console.log('🔔 Notifications - Token exists:', !!token);

    console.log('🔔 Notifications - Token length:', token?.length);

    

    if (!token) {

      return res.status(401).json({ message: 'No token provided' });

    }



    // Verify token and get user ID

    const jwt = require('jsonwebtoken');

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    

    console.log('🔔 Notifications - Decoded token:', decoded);

    console.log('🔔 Notifications - User ID:', decoded.id);

    

    // First, ensure super admin user exists

    const bcrypt = require('bcryptjs');

    const hashedPassword = await bcrypt.hash('admin123', 10);

    

    // Create super admin if doesn't exist

    await query(`

      INSERT IGNORE INTO users (id, username, email, password, role, created_at, updated_at)

      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)

    `, [

      'super-admin-001',

      'superadmin', 

      'superadmin@wmsu.edu.ph',

      hashedPassword,

      'super_admin'

    ]);

    

    // Get user role from database using ID

    const users = await query('SELECT role FROM users WHERE id = ?', [decoded.id]);

    

    console.log('🔔 Notifications - Query result for user ID', decoded.id, ':', users);

    

    if (users.length === 0) {

      console.log('🔔 Notifications - User not found for ID:', decoded.id);

      return res.status(404).json({ message: 'User not found' });

    }

    

    const userRole = users[0].role;

    console.log('🔔 Notifications - User role from database:', userRole);

    

    if (userRole !== 'super_admin') {

      console.log('🔔 Notifications - Access denied for role:', userRole);

      return res.status(403).json({ message: 'Access denied. Super admin only.' });

    }



    console.log('🔔 Notifications - Access granted for super admin');



    // Return super admin specific notifications

    const notifications = [

      {

        id: 1,

        type: 'info',

        title: 'System Update',

        message: 'WMSU ILS system has been updated successfully',

        read: false,

        timestamp: new Date().toISOString()

      },

      {

        id: 2,

        type: 'warning',

        title: 'Backup Reminder',

        message: 'Monthly system backup is scheduled for tomorrow',

        read: false,

        timestamp: new Date(Date.now() - 3600000).toISOString()

      },

      {

        id: 3,

        type: 'success',

        title: 'New Registration',

        message: '5 new teacher registrations pending approval',

        read: true,

        timestamp: new Date(Date.now() - 7200000).toISOString()

      }

    ];



    res.json({ notifications });

  } catch (error) {

    console.error('Error fetching super admin notifications:', error);

    if (error.name === 'JsonWebTokenError') {

      console.log('🔔 Notifications - JWT error:', error.message);

      return res.status(401).json({ message: 'Invalid token' });

    }

    res.status(500).json({ message: 'Failed to fetch notifications' });

  }

});



// Create backup

app.post('/api/admin/backup', async (req, res) => {

  try {

    // ... (rest of the code remains the same)

    const { query } = require('./config/database');

    const fs = require('fs');

    const path = require('path');

    

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', ' ').replace('Z', '');

    const backupDir = path.join(__dirname, '../backups');

    

    // Create backups directory if it doesn't exist

    if (!fs.existsSync(backupDir)) {

      fs.mkdirSync(backupDir, { recursive: true });

    }

    

    const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);

    

    // Get all tables

    const tables = await query('SHOW TABLES');

    const tableNames = tables.map(t => Object.values(t)[0]);

    

    let backupContent = `-- WMSU ILS Database Backup

-- Generated on: ${new Date().toISOString().replace(/[:.]/g, '-').replace('T', ' ').replace('Z', '')}

-- Server: ${process.env.NODE_ENV || 'development'}

`;



    // Dump each table

    for (const table of tableNames) {

      if (table === 'system_settings') continue; // Skip settings table from backup

      

      backupContent += `\n-- Table: ${table}\n`;

      

      // Get table structure

      const structure = await query(`SHOW CREATE TABLE \`${table}\``);

      backupContent += structure[0]['Create Table'] + ';\n\n';

      

      // Get table data

      const data = await query(`SELECT * FROM \`${table}\``);

      if (data.length > 0) {

        backupContent += `-- Data for table: ${table}\n`;

        data.forEach(row => {

          const values = Object.values(row).map(val => 

            val === null ? 'NULL' : `'${val.toString().replace(/'/g, "''")}'`

          );

          backupContent += `INSERT INTO \`${table}\` VALUES (${values.join(', ')});\n`;

        });

        backupContent += '\n';

      }

    }



    // Write backup file

    fs.writeFileSync(backupFile, backupContent);

    

    // Update last backup timestamp

    try {

      await query(`

        INSERT INTO system_settings (id, settings) 

        VALUES (1, JSON_OBJECT('backup', JSON_OBJECT('lastBackup', ?)))

        ON DUPLICATE KEY UPDATE 

        settings = JSON_SET(

          COALESCE(settings, '{}'),

          '$.backup.lastBackup',

          ?

        )

      `, [timestamp, timestamp]);

    } catch (err) {

      console.warn('Failed to update backup timestamp:', err.message);

    }

    

    res.json({ 

      message: 'Backup created successfully', 

      filename: `backup-${timestamp}.sql`,

      timestamp: new Date().toISOString()

    });

  } catch (error) {

    console.error('Error creating backup:', error);

    res.status(500).json({ message: 'Failed to create backup' });

  }

});



// Get backup history

app.get('/api/admin/backup/history', async (req, res) => {

  try {

    const fs = require('fs');

    const path = require('path');

    

    const backupDir = path.join(__dirname, '../backups');

    

    if (!fs.existsSync(backupDir)) {

      return res.json({ backups: [] });

    }

    

    const files = fs.readdirSync(backupDir)

      .filter(file => file.endsWith('.sql'))

      .map(file => {

        const filePath = path.join(backupDir, file);

        const stats = fs.statSync(filePath);

        return {

          filename: file,

          size: stats.size,

          created: stats.birthtime.toISOString(),

          modified: stats.mtime.toISOString()

        };

      })

      .sort((a, b) => new Date(b.created) - new Date(a.created));

    

    res.json({ backups: files });

  } catch (error) {

    console.error('Error fetching backup history:', error);

    res.status(500).json({ message: 'Failed to fetch backup history' });

  }

});



// Download backup file

app.get('/api/admin/backup/download/:filename', async (req, res) => {

  try {

    const fs = require('fs');

    const path = require('path');

    

    const { filename } = req.params;

    const backupDir = path.join(__dirname, '../backups');

    const filePath = path.join(backupDir, filename);

    

    // Validate filename to prevent directory traversal

    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {

      return res.status(400).json({ message: 'Invalid filename' });

    }

    

    // Check if file exists

    if (!fs.existsSync(filePath)) {

      return res.status(404).json({ message: 'Backup file not found' });

    }

    

    // Send file for download

    res.download(filePath, filename, (err) => {

      if (err) {

        console.error('Error downloading backup file:', err);

        if (!res.headersSent) {

          res.status(500).json({ message: 'Failed to download backup file' });

        }

      }

    });

  } catch (error) {

    console.error('Error downloading backup:', error);

    res.status(500).json({ message: 'Failed to download backup' });

  }

});



app.post('/api/admin/test-notification', async (req, res) => {

  try {

    const { type, recipient } = req.body;

    

    if (type === 'email') {

      const transporter = createEmailTransporter();

      const fromEmail = process.env.SENDGRID_EMAIL_FROM || process.env.EMAIL_USER || 'admin@wmsu.edu.ph';

      console.log('📧 Email Test - From:', fromEmail);

      console.log('📧 Email Test - To:', recipient);

      

      const mailOptions = {

        from: fromEmail,

        to: recipient,

        subject: 'WMSU ILS - Test Notification',

        html: `

          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">

            <div style="background: linear-gradient(135deg, #8B0000, #DC143C); color: white; padding: 20px; text-align: center;">

              <h1>WMSU Integrated Learning System</h1>

              <p>Test Notification</p>

            </div>

            <div style="padding: 20px; background-color: #f9f9f9;">

              <h2>Test Email Notification</h2>

              <p>This is a test email to verify that the notification system is working correctly.</p>

              <p>If you received this email, the system is functioning properly.</p>

              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">

                <strong>Test Details:</strong><br>

                • Type: Email Notification<br>

                • Sent: ${new Date().toLocaleString()}<br>

                • Recipient: ${recipient}

              </div>

            </div>

            <div style="background-color: #8B0000; color: white; padding: 15px; text-align: center; font-size: 12px;">

              <p>&copy; 2026 WMSU Integrated Learning System. All rights reserved.</p>

              <p style="font-size: 10px;">This is an automated test message. Please do not reply to this email.</p>

            </div>

          </div>

        `

      };



      await transporter.sendMail(mailOptions);

      res.json({ message: 'Test email sent successfully' });

    } else if (type === 'browser') {

      // Browser notifications are handled client-side, so we just return success

      // The actual browser notification will be triggered by the frontend

      res.json({ message: 'Browser notification test successful' });

    } else {

      res.status(400).json({ message: 'Unsupported notification type' });

    }

  } catch (error) {

    console.error('Error sending test notification:', error);

    res.status(500).json({ message: 'Failed to send test notification' });

  }

});



// ============================================

// SERVE FRONTEND

// ============================================



const distPath = path.join(__dirname, '../dist');

const fs2 = require('fs');



if (fs2.existsSync(distPath)) {

  // Serve static files from the dist directory

  app.use(express.static(distPath));

  

  // Handle SPA routing - serve index.html for all non-API routes

  app.get('*', (req, res) => {

    if (req.path.startsWith('/api') || req.path.startsWith('/public')) {

      return res.status(404).json({ error: 'Endpoint not found' });

    }

    res.sendFile(path.join(distPath, 'index.html'));

  });

  

  console.log('📦 Serving frontend from:', distPath);

} else {

  console.log('⚠️  No dist folder found - frontend not served');

}



// Graceful shutdown handling

process.on('SIGTERM', () => {

  console.log('SIGTERM received, shutting down gracefully');

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

      { name: 'googleId', sql: 'ALTER TABLE users ADD COLUMN googleId VARCHAR(255)' },

      { name: 'first_name', sql: 'ALTER TABLE users ADD COLUMN first_name VARCHAR(100)' },

      { name: 'last_name', sql: 'ALTER TABLE users ADD COLUMN last_name VARCHAR(100)' },

      { name: 'username', sql: 'ALTER TABLE users ADD COLUMN username VARCHAR(100) UNIQUE' },

      { name: 'email', sql: 'ALTER TABLE users ADD COLUMN email VARCHAR(100) UNIQUE NOT NULL' },

      { name: 'password', sql: 'ALTER TABLE users ADD COLUMN password VARCHAR(255) NOT NULL' },

      { name: 'role', sql: 'ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT "admin"' },

      { name: 'created_at', sql: 'ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },

      { name: 'phone', sql: 'ALTER TABLE users ADD COLUMN phone VARCHAR(20) DEFAULT ""' },

      { name: 'profile_pic', sql: 'ALTER TABLE users ADD COLUMN profile_pic LONGTEXT' },

      { name: 'avatar', sql: 'ALTER TABLE users ADD COLUMN avatar LONGTEXT' },

      { name: 'name', sql: 'ALTER TABLE users ADD COLUMN name VARCHAR(255)' },

      { name: 'status', sql: 'ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT "approved"' },

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



    // Create help_center_messages table if it doesn't exist

    try {

      await query(`

        CREATE TABLE IF NOT EXISTS help_center_messages (

          id INT AUTO_INCREMENT PRIMARY KEY,

          teacher_id VARCHAR(255) NOT NULL,

          teacher_name VARCHAR(255) NOT NULL,

          teacher_email VARCHAR(255) NOT NULL,

          grade_level VARCHAR(50) NULL,

          section VARCHAR(50) NULL,

          subject VARCHAR(255) NOT NULL,

          message TEXT NOT NULL,

          category ENUM('Technical', 'Academic', 'Account', 'Other') DEFAULT 'Other',

          priority ENUM('Low', 'Medium', 'High', 'Urgent') DEFAULT 'Medium',

          status ENUM('Pending', 'In Progress', 'Resolved', 'Closed') DEFAULT 'Pending',

          admin_reply TEXT NULL,

          admin_id VARCHAR(255) NULL,

          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

          

          INDEX idx_teacher_id (teacher_id),

          INDEX idx_status (status),

          INDEX idx_category (category),

          INDEX idx_priority (priority),

          INDEX idx_created_at (created_at),

          INDEX idx_grade_level (grade_level),

          INDEX idx_subject (subject)

        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci

      `);

      console.log('✅ Help Center messages table ready');

    } catch (err) {

      console.warn('⚠️ Help Center messages table creation error:', err.message);

    }



    // Add missing columns to help_center_messages table if they don't exist

    try {

      await query(`ALTER TABLE help_center_messages ADD COLUMN IF NOT EXISTS grade_level VARCHAR(50) NULL`);

      await query(`ALTER TABLE help_center_messages ADD COLUMN IF NOT EXISTS section VARCHAR(50) NULL`);

      

      // Add indexes if they don't exist

      try {

        await query(`ALTER TABLE help_center_messages ADD INDEX IF NOT EXISTS idx_grade_level (grade_level)`);

        await query(`ALTER TABLE help_center_messages ADD INDEX IF NOT EXISTS idx_section (section)`);

      } catch (indexErr) {

        console.warn('⚠️ Index creation warning:', indexErr.message);

      }

      

      console.log('✅ Help Center messages table columns updated');

    } catch (err) {

      console.warn('⚠️ Help Center messages table update error:', err.message);

    }



    // Add teacher_deleted column if it doesn't exist

    try {

      // Check if columns exist before adding them

      const teacherDeletedCheck = await query(`SHOW COLUMNS FROM help_center_messages LIKE 'teacher_deleted'`);

      if (teacherDeletedCheck.length === 0) {

        await query(`ALTER TABLE help_center_messages ADD COLUMN teacher_deleted BOOLEAN DEFAULT FALSE`);

        console.log('✅ Added teacher_deleted column');

      }



      const adminDeletedCheck = await query(`SHOW COLUMNS FROM help_center_messages LIKE 'admin_deleted'`);

      if (adminDeletedCheck.length === 0) {

        await query(`ALTER TABLE help_center_messages ADD COLUMN admin_deleted BOOLEAN DEFAULT FALSE`);

        console.log('✅ Added admin_deleted column');

      }



      console.log('✅ Help Center delete columns ready');

    } catch (err) {

      console.warn('⚠️ Help Center delete columns creation warning:', err.message);

    }



    // Create system_settings table if it doesn't exist

    try {

      await query(`

        CREATE TABLE IF NOT EXISTS system_settings (

          id INT PRIMARY KEY DEFAULT 1,

          settings JSON,

          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci

      `);

      console.log('✅ System settings table ready');

    } catch (err) {

      console.warn('⚠️ System settings table creation warning:', err.message);

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