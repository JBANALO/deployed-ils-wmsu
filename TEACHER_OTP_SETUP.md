# Teacher Email OTP Verification Setup

This document explains how to set up email OTP verification for teacher accounts using SendGrid.

## 🚀 Quick Setup

### 1. Configure SendGrid API Key

Edit `src/services/emailService.js` and add your SendGrid API key:

```javascript
const SENDGRID_API_KEY = 'SG.YOUR_ACTUAL_SENDGRID_API_KEY_HERE'; // Replace with real key
```

### 2. Add Backend Endpoints

Add the following routes to your `backend/server/server.js` (see `backend/examples/teacher-otp-verification.js`):

```javascript
// OTP verification endpoint
app.post('/api/teachers/verify-otp', (req, res) => { /* implementation */ });

// Update teacher status endpoint  
app.put('/api/teachers/:id/verify-email', (req, res) => { /* implementation */ });
```

### 3. Update Database Schema

Run these SQL queries to add required columns:

```sql
ALTER TABLE teachers ADD COLUMN emailVerified BOOLEAN DEFAULT FALSE;
ALTER TABLE teachers ADD COLUMN status ENUM('pending_verification', 'approved', 'archived') DEFAULT 'pending_verification';
```

## 📋 Features Implemented

### ✅ Frontend Components
- **OTPVerification.jsx**: Modal for 6-digit code entry
- **EmailService.js**: SendGrid integration with HTML emails
- **AdminCreateTeacher.jsx**: Full OTP flow integration

### ✅ Security Features
- **6-digit OTP codes**: Secure and easy to enter
- **15-minute expiry**: Prevents replay attacks
- **Rate limiting**: Resend protection
- **Account cleanup**: Deletes unverified accounts on cancel

### ✅ User Experience
- **Auto-focus**: Moves between OTP input fields
- **Paste support**: Users can paste full OTP
- **Timer display**: Shows remaining time
- **Resend option**: Request new codes
- **Professional emails**: HTML formatted with WMSU branding

## 🔄 How It Works

1. **Admin creates teacher account** → Status: `pending_verification`
2. **OTP generated** → 6-digit code created
3. **Email sent** → Using SendGrid API
4. **Teacher enters OTP** → Via modal popup
5. **Verification successful** → Status: `approved`, `emailVerified: true`
6. **Full access granted** → Teacher can use account

## 🛠️ Development Mode

Without SendGrid API key, the system works in development mode:
- OTP codes are logged to console
- No actual emails sent
- Easy for testing without API costs

## 📧 Testing

1. Create a teacher account with real WMSU email
2. Check browser console for OTP code (development mode)
3. Enter OTP in verification modal
4. Verify teacher status changes to `approved`

## 🔧 Production Deployment

1. Add SendGrid API key to `emailService.js`
2. Deploy backend endpoints
3. Update database schema
4. Test with real email addresses

## 📨 Email Template

The system sends professional HTML emails with:
- WMSU branding and colors
- Clear OTP code display
- Security notices
- Expiration information
- Professional signature

## 🔒 Security Considerations

- **OTP expiry**: 15 minutes prevents replay attacks
- **Account cleanup**: Unverified accounts deleted on cancel
- **Rate limiting**: Prevents email spam
- **Secure storage**: Temporary OTP storage only

## 🚨 Important Notes

- Teachers can't access system until email is verified
- Unverified accounts are automatically cleaned up
- SendGrid costs apply in production
- Keep API keys secure and environment-based

## 📞 Support

For issues with OTP verification:
1. Check SendGrid API key configuration
2. Verify backend endpoints are added
3. Confirm database schema updates
4. Check browser console for errors
