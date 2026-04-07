// SendGrid configuration
const SENDGRID_API_KEY = import.meta.env.SENDGRID_API_KEY || 'YOUR_SENDGRID_API_KEY'; // Add to .env file
const FROM_EMAIL = import.meta.env.SENDGRID_EMAIL_FROM || 'noreply@wmsu.edu.ph';

export const sendOTPEmail = async (email, otp, teacherName) => {
  try {
    // For development/testing without API key, show OTP in console
    if (SENDGRID_API_KEY === 'YOUR_SENDGRID_API_KEY') {
      console.log('🔧 DEVELOPMENT MODE - OTP Code:', otp);
      console.log('🔧 Add your SendGrid API key to emailService.js to send real emails');
      return { success: true, message: 'OTP prepared (development mode)' };
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email }],
          subject: 'WMSU ILS Teacher Account Verification',
        }],
        from: { email: FROM_EMAIL, name: 'WMSU ILS System' },
        content: [{
          type: 'text/html',
          value: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px;">WMSU ILS Teacher Account</h1>
                <p style="margin: 20px 0; font-size: 16px;">Email Verification Required</p>
              </div>
              
              <div style="background: #f9f9f9; padding: 30px; border-radius: 10px; margin-top: 20px;">
                <h2 style="color: #333; margin-top: 0;">Dear ${teacherName},</h2>
                <p style="color: #666; line-height: 1.6;">Your WMSU ILS Teacher Account has been created. To verify your identity as a WMSU teacher, please use the following verification code:</p>
                
                <div style="background: #e74c3c; color: white; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0; letter-spacing: 5px;">
                  ${otp}
                </div>
                
                <p style="color: #666; line-height: 1.6;">
                  <strong>Important:</strong> This code will expire in <strong>15 minutes</strong>.
                </p>
                
                <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p style="margin: 0; color: #856404;">
                    <strong>Security Notice:</strong> If you did not request this account, please contact the ILS administrator immediately.
                  </p>
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #999; font-size: 14px; margin: 0;">
                  Best regards,<br>
                  <strong>WMSU ILS Elementary Department</strong>
                </p>
              </div>
            </div>
          `
        }]
      })
    });

    if (response.ok) {
      console.log('✅ OTP email sent successfully via SendGrid');
      return { success: true, message: 'OTP sent successfully' };
    } else {
      const errorData = await response.json();
      throw new Error(errorData.message || 'SendGrid API error');
    }

  } catch (error) {
    console.error('❌ Error sending OTP email via SendGrid:', error);
    return { success: false, message: 'Failed to send OTP email' };
  }
};

export const generateOTP = () => {
  // Generate 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const isOTPValid = (storedOTP, inputOTP, timestamp) => {
  if (!storedOTP || !inputOTP) return false;
  
  // Check if OTP matches
  if (storedOTP !== inputOTP) return false;
  
  // Check if OTP is expired (15 minutes)
  const now = Date.now();
  const otpAge = now - timestamp;
  const fifteenMinutes = 15 * 60 * 1000; // 15 minutes in milliseconds
  
  return otpAge < fifteenMinutes;
};
