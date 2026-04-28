// server/controllers/parentController.js
const { query } = require('../config/database');
const { sendParentOTPEmail } = require('../utils/sendGridService');
const crypto = require('crypto');

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP to parent email
const sendParentOTP = async (req, res) => {
  try {
    console.log('🔍 Parent OTP Request - Body:', req.body);
    console.log('🔍 Parent OTP Request - User:', req.user);
    
    const { studentId, parentEmail, parentFirstName, parentLastName, studentName } = req.body;

    if (!studentId || !parentEmail || !parentFirstName || !studentName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate OTP and expiry (15 minutes)
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    // Store OTP in database (create parent_verifications table if not exists)
    await query(
      `INSERT INTO parent_verifications (student_id, parent_email, parent_name, otp, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE 
       otp = VALUES(otp), 
       expires_at = VALUES(expires_at), 
       created_at = VALUES(created_at)`,
      [studentId, parentEmail, `${parentFirstName} ${parentLastName}`, otp, expiresAt]
    );

    // Send OTP email
    const emailResult = await sendParentOTPEmail({
      to: parentEmail,
      parentName: `${parentFirstName} ${parentLastName}`,
      studentName: studentName,
      otp: otp,
      studentId: studentId,
      parentEmail: parentEmail
    });

    if (emailResult.success) {
      res.json({ 
        success: true, 
        message: 'OTP sent to parent email',
        expiresAt: expiresAt
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to send OTP email', 
        details: emailResult.error 
      });
    }

  } catch (error) {
    console.error('Error sending parent OTP:', error);
    res.status(500).json({ error: 'Failed to send OTP', details: error.message });
  }
};

// Verify parent OTP
const verifyParentOTP = async (req, res) => {
  try {
    console.log('🔍 Received verification request body:', req.body);
    const { studentId, otp } = req.body;

    console.log('🔍 Extracted values:', { studentId, otp });

    if (!studentId || !otp) {
      console.log('🔍 Missing required fields:', { studentId: !!studentId, otp: !!otp });
      return res.status(400).json({ error: 'Student ID and OTP are required' });
    }

    // Check OTP in database - handle both string and number student_id
    console.log('🔍 Querying parent_verifications table for:', { studentId, otp, studentIdType: typeof studentId });
    
    // Try without time check first to see if record exists
    const [rows] = await query(
      `SELECT * FROM parent_verifications 
       WHERE student_id = ? AND otp = ? AND verified = 0`,
      [String(studentId), otp]
    );
    
    console.log('🔍 Query executed:', {
      sql: `SELECT * FROM parent_verifications WHERE student_id = '${String(studentId)}' AND otp = '${otp}' AND verified = 0`,
      params: [String(studentId), otp]
    });
    
    // Also check with time condition to see if expired
    const [rowsWithTime] = await query(
      `SELECT *, expires_at > NOW() as is_not_expired FROM parent_verifications 
       WHERE student_id = ? AND otp = ? AND verified = 0`,
      [String(studentId), otp]
    );
    
    console.log('🔍 Time check result:', {
      withoutTime: rows.length,
      withTime: rowsWithTime.length,
      record: rowsWithTime[0],
      currentTime: new Date().toISOString()
    });

    console.log('🔍 Query result:', rows.length, 'rows found');
    console.log('🔍 First row:', rows[0]);

    if (rows.length === 0) {
      console.log('🔍 No matching OTP found, checking if any record exists...');
      const [allRows] = await query(
        `SELECT * FROM parent_verifications WHERE student_id = ? ORDER BY created_at DESC LIMIT 5`,
        [String(studentId)]
      );
      console.log('🔍 Recent records for student:', allRows);
      
      // Check if student exists in students table
      const [studentRows] = await query(
        `SELECT id, first_name, last_name, parent_email FROM students WHERE id = ?`,
        [String(studentId)]
      );
      console.log('🔍 Student record check:', studentRows);
      
      return res.status(400).json({ 
        error: 'Invalid or expired OTP',
        debug: {
          studentId,
          otp,
          foundRecords: allRows.length,
          studentExists: studentRows.length > 0
        }
      });
    }

    const verification = rows[0];

    // Mark as verified
    await query(
      `UPDATE parent_verifications 
       SET verified = 1, verified_at = NOW() 
       WHERE id = ?`,
      [verification.id]
    );

    // Update student table to mark parent as verified
    await query(
      `UPDATE students SET parent_verified = 1 WHERE id = ?`,
      [String(studentId)]
    );

    res.json({ 
      success: true, 
      message: 'Parent account verified successfully' 
    });

  } catch (error) {
    console.error('🔍 Error verifying parent OTP:', error);
    console.error('🔍 Error stack:', error.stack);
    console.error('🔍 Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    res.status(500).json({ error: 'Failed to verify OTP', details: error.message });
  }
};

// Check parent verification status
const checkParentVerificationStatus = async (req, res) => {
  try {
    const { studentId } = req.params;

    const [rows] = await query(
      `SELECT parent_verified FROM students WHERE id = ?`,
      [studentId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ 
      parentVerified: Boolean(rows[0].parent_verified) 
    });

  } catch (error) {
    console.error('Error checking parent verification status:', error);
    res.status(500).json({ error: 'Failed to check status', details: error.message });
  }
};

module.exports = {
  sendParentOTP,
  verifyParentOTP,
  checkParentVerificationStatus
};
