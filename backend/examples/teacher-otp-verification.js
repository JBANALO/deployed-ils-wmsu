// Backend implementation for teacher OTP verification
// Add this to your Express server (backend/server/server.js)

const otpStore = new Map(); // In production, use Redis or database

// Store OTP temporarily (15 minutes expiry)
const storeOTP = (email, otp) => {
  const expiry = Date.now() + (15 * 60 * 1000); // 15 minutes
  otpStore.set(email, { otp, expiry });
  
  // Auto-cleanup expired OTPs
  setTimeout(() => {
    otpStore.delete(email);
  }, 15 * 60 * 1000);
};

// Verify OTP
const verifyOTP = (email, otp) => {
  const stored = otpStore.get(email);
  if (!stored) return false;
  
  if (stored.otp !== otp) return false;
  
  if (Date.now() > stored.expiry) {
    otpStore.delete(email);
    return false;
  }
  
  return true;
};

// Express route to handle OTP verification
app.post('/api/teachers/verify-otp', (req, res) => {
  try {
    const { email, otp, timestamp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and OTP are required' 
      });
    }
    
    // Verify OTP (you can also validate timestamp here)
    const isValid = verifyOTP(email, otp);
    
    if (isValid) {
      // Clear OTP after successful verification
      otpStore.delete(email);
      
      res.json({ 
        success: true, 
        message: 'OTP verified successfully' 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired OTP' 
      });
    }
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during OTP verification' 
    });
  }
});

// Update teacher creation endpoint to store OTP
app.post('/api/teachers', async (req, res) => {
  try {
    const teacherData = req.body;
    
    // Create teacher with pending_verification status
    const result = await db.query(
      'INSERT INTO teachers (firstName, middleName, lastName, username, email, password, role, bio, profilePic, status, emailVerified, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        teacherData.firstName,
        teacherData.middleName,
        teacherData.lastName,
        teacherData.username,
        teacherData.email,
        teacherData.password,
        teacherData.role,
        teacherData.bio,
        teacherData.profilePic,
        'pending_verification', // New status
        false, // emailVerified
        new Date()
      ]
    );
    
    const teacherId = result.insertId;
    
    // Generate and store OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    storeOTP(teacherData.email, otp);
    
    // Send OTP email (handled by frontend)
    
    res.status(201).json({
      success: true,
      data: {
        id: teacherId,
        ...teacherData,
        status: 'pending_verification',
        emailVerified: false
      }
    });
    
  } catch (error) {
    console.error('Teacher creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create teacher account'
    });
  }
});

// Update teacher status after OTP verification
app.put('/api/teachers/:id/verify-email', async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.query(
      'UPDATE teachers SET status = ?, emailVerified = ? WHERE id = ?',
      ['approved', true, id]
    );
    
    res.json({
      success: true,
      message: 'Teacher email verified successfully'
    });
    
  } catch (error) {
    console.error('Email verification update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify email'
    });
  }
});

// Database schema addition needed:
// ALTER TABLE teachers ADD COLUMN emailVerified BOOLEAN DEFAULT FALSE;
// ALTER TABLE teachers ADD COLUMN status ENUM('pending_verification', 'approved', 'archived') DEFAULT 'pending_verification';
