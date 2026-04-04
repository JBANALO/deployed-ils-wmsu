const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { readUsers, writeUsers } = require('../utils/fileStorage');
const { query } = require('../config/database');
const sgMail = require('@sendgrid/mail');

const router = express.Router();

// Configure SendGrid
console.log('🔍 Environment variables check:');
console.log('🔍 SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? 'SET' : 'NOT SET');
console.log('🔍 SENDGRID_EMAIL_FROM:', process.env.SENDGRID_EMAIL_FROM ? 'SET' : 'NOT SET');
console.log('🔍 All env vars:', Object.keys(process.env).filter(key => key.includes('SENDGRID')));

if (!process.env.SENDGRID_API_KEY) {
  console.error('❌ SENDGRID_API_KEY not found in environment variables');
  console.error('❌ Available env vars with SENDGRID:', Object.keys(process.env).filter(key => key.includes('SENDGRID')));
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('✅ SendGrid configured successfully');
  console.log('✅ API Key length:', process.env.SENDGRID_API_KEY.length);
}

// Store reset tokens (in production, use Redis or database)
const resetTokens = new Map();

// Forgot password route
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    console.log('Password reset requested for:', email);

    // First check database for all user types (students, teachers, users)
    let user = null;
    let userSource = null; // Track where user was found
    
    try {
      // Check users table (for students, admin, super_admin)
      const [users] = await query(
        'SELECT id, username, first_name as firstName, last_name as lastName, email, role FROM users WHERE email = ?',
        [email]
      );
      
      if (users && users.length > 0) {
        user = users[0];
        userSource = 'database';
        console.log('Found user in users table:', email, 'Role:', users[0].role);
      } else {
        // Check teachers table (for teachers)
        const [teachers] = await query(
          'SELECT id, teacher_id as teacherId, first_name as firstName, last_name as lastName, email, "teacher" as role FROM teachers WHERE email = ?',
          [email]
        );
        
        if (teachers && teachers.length > 0) {
          user = teachers[0];
          userSource = 'database';
          console.log('Found teacher in teachers table:', email);
        } else {
          // Check students table as fallback (if you still use it)
          const [students] = await query(
            'SELECT id, lrn, first_name as firstName, last_name as lastName, student_email as email, "student" as role FROM students WHERE student_email = ?',
            [email]
          );
          
          if (students && students.length > 0) {
            user = students[0];
            userSource = 'database';
            console.log('Found student in students table:', email);
          }
        }
      }
    } catch (dbError) {
      console.error('Database error during password reset:', dbError);
    }

    // If still not found, check users.json as fallback (for local development)
    if (!user) {
      const users = readUsers();
      user = users.find(u => u.email === email);
      if (user) {
        userSource = 'json';
        console.log('Found user in users.json:', email);
      }
    }

    // Always return success to prevent email enumeration attacks
    if (!user) {
      console.log('User not found for email:', email);
      return res.json({ message: 'If an account with this email exists, a reset link has been sent.' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenData = {
      email: user.email,
      userId: user.id,
      role: user.role,
      source: userSource // Track where user was found
    };
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Store token
    resetTokens.set(resetToken, { ...tokenData, expiry: resetTokenExpiry });

    // Create reset URL
    console.log('🔍 FRONTEND_URL from env:', process.env.FRONTEND_URL);
    const resetUrl = `${process.env.FRONTEND_URL || 'https://deployed-ils-wmsu-production.up.railway.app'}/reset-password/${resetToken}`;
    console.log('🔍 Generated reset URL:', resetUrl);

    // Build email HTML
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; padding: 20px;">
          <img src="https://deployed-ils-wmsu-production.up.railway.app/wmsu-logo.jpg" alt="WMSU Logo" style="width: 100px; height: auto;" onerror="this.style.display='none';">
        </div>
        <h2 style="color: #dc2626; text-align: center;">Password Reset Request</h2>
        <p>Hello ${user.firstName},</p>
        <p>You requested to reset your password for the WMSU ILS Portal. Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p><strong>This link will expire in 1 hour.</strong></p>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <hr style="border: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px; text-align: center;">
          WMSU ILS Portal - Elementary Department<br>
          Automated Grades Portal and Students Attendance using QR Code
        </p>
      </div>
    `;

    try {
      // Prefer Brevo SMTP if configured
      if (process.env.BREVO_API_KEY) {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: 'smtp-relay.brevo.com',
          port: 587,
          secure: false,
          auth: {
            user: 'apikey',
            pass: process.env.BREVO_API_KEY
          }
        });

        await transporter.sendMail({
          from: process.env.BREVO_EMAIL_FROM || process.env.SENDGRID_EMAIL_FROM || 'noreply@wmsu.edu.ph',
          to: email,
          subject: 'WMSU ILS - Password Reset Request',
          html
        });
        console.log('✅ Reset email sent via Brevo SMTP to:', email);
      } else if (process.env.SENDGRID_API_KEY) {
        // Fallback to SendGrid if available
        const msg = {
          to: email,
          from: process.env.SENDGRID_EMAIL_FROM || 'noreply@wmsu.edu.ph',
          subject: 'WMSU ILS - Password Reset Request',
          html
        };
        await sgMail.send(msg);
        console.log('✅ Reset email sent via SendGrid to:', email);
      } else {
        console.error('❌ No email provider configured (BREVO_API_KEY or SENDGRID_API_KEY)');
        // Still return success to the caller to avoid enumeration
      }
    } catch (emailError) {
      console.error('❌ Email sending error:', emailError);
    }

    res.json({ message: 'If an account with this email exists, a reset link has been sent.' });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error during password reset request' });
  }
});

// Reset password route
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    // Check if token exists and is valid
    const tokenData = resetTokens.get(token);
    
    if (!tokenData) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    if (new Date() > tokenData.expiry) {
      resetTokens.delete(token);
      return res.status(400).json({ message: 'Reset token has expired' });
    }

    console.log('Password reset for:', tokenData.email, 'Role:', tokenData.role);

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password based on user role and source
    if (tokenData.role === 'teacher') {
      // For teachers: ALWAYS update BOTH users.json AND Railway database for redundancy
      console.log('🔄 Teacher password reset: updating both users.json and Railway database');
      
      // 1. Update users.json (for current teachers)
      try {
        const users = readUsers();
        const userIndex = users.findIndex(u => u.id === tokenData.userId);
        
        if (userIndex !== -1) {
          users[userIndex].password = hashedPassword;
          users[userIndex].updatedAt = new Date().toISOString();
          writeUsers(users);
          console.log('✅ Teacher password updated in users.json');
        }
      } catch (jsonError) {
        console.error('Error updating users.json:', jsonError);
      }
      
      // 2. Update Railway database (for future teachers and redundancy)
      try {
        await query(
          'UPDATE teachers SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [hashedPassword, tokenData.userId]
        );
        console.log('✅ Teacher password updated in Railway teachers database');
      } catch (dbError) {
        console.error('Error updating Railway database:', dbError);
      }
      
    } else if (tokenData.source === 'json') {
      // Handle advisers, subject_teachers from users.json only
      const users = readUsers();
      const userIndex = users.findIndex(u => u.id === tokenData.userId);
      
      if (userIndex !== -1) {
        users[userIndex].password = hashedPassword;
        users[userIndex].updatedAt = new Date().toISOString();
        writeUsers(users);
        console.log(`✅ ${tokenData.role} password updated in users.json`);
      } else {
        return res.status(404).json({ message: 'User not found' });
      }
    } else {
      // Handle database users (students, admins, super_admin)
      if (tokenData.role === 'student') {
        // Update student in users table (main users table)
        await query(
          'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [hashedPassword, tokenData.userId]
        );
        console.log('✅ Student password updated in users database');
      } else if (tokenData.role === 'admin' || tokenData.role === 'super_admin') {
        // Update admin/super_admin in users table
        await query(
          'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [hashedPassword, tokenData.userId]
        );
        console.log(`✅ ${tokenData.role} password updated in users database`);
      }
    }

    // Clean up token
    resetTokens.delete(token);

    res.json({ message: 'Password reset successful' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
});

// Clean up expired tokens (run periodically)
setInterval(() => {
  const now = new Date();
  for (const [token, data] of resetTokens.entries()) {
    if (now > data.expiry) {
      resetTokens.delete(token);
    }
  }
}, 60000); // Clean up every minute

module.exports = router;
