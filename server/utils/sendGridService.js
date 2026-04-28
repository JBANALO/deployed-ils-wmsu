// server/utils/sendGridService.js
// SendGrid service for web parent OTP verification

const https = require('https');

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_EMAIL_FROM || 'studtech1234@gmail.com';
const FROM_NAME = 'WMSU ILS Portal';

const postJson = (url, payload, headers = {}) =>
  new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...headers
        }
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          const status = res.statusCode || 500;
          let parsed = {};
          try {
            parsed = body ? JSON.parse(body) : {};
          } catch (err) {
            parsed = { message: body };
          }

          if (status >= 200 && status < 300) {
            resolve(parsed);
          } else {
            const error = new Error(parsed?.message || `HTTP ${status}`);
            error.response = { status, data: parsed };
            reject(error);
          }
        });
      }
    );

    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });

const buildParentOTPEmailHtml = ({ parentName, studentName, otp }) => {
  return `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
        <h2 style="color: #8B0000;">Parent Account Verification</h2>
        <p>Hi ${parentName || 'there'},</p>
        <p>Your verification code for ${studentName}'s WMSU ILS portal access is:</p>
        <div style="background: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0;">
          <span style="font-size: 24px; font-weight: bold; letter-spacing: 3px;">${otp}</span>
        </div>
        <p>This code will expire in 15 minutes. If you didn't request this, please ignore this email.</p>
        <p style="margin-top: 24px;">Regards,<br/>WMSU ILS - Elementary Department</p>
      </body>
    </html>
  `;
};

const sendParentOTPEmail = async ({ to, parentName, studentName, otp }) => {
  console.log('📧 SendGrid Configuration Check:');
  console.log('- SENDGRID_API_KEY exists:', !!SENDGRID_API_KEY);
  console.log('- SENDGRID_API_KEY length:', SENDGRID_API_KEY?.length || 0);
  console.log('- FROM_EMAIL:', FROM_EMAIL);
  console.log('- TO email:', to);
  
  if (!SENDGRID_API_KEY) {
    console.warn('SENDGRID_API_KEY not configured. Parent OTP email not sent.');
    return { success: false, error: 'SendGrid service not configured' };
  }

  if (!SENDGRID_API_KEY.startsWith('SG.')) {
    console.warn('SENDGRID_API_KEY format invalid. Should start with "SG."');
    return { success: false, error: 'Invalid SendGrid API key format' };
  }

  try {
    console.log('📧 Sending parent OTP email via SendGrid to', to);
    
    const payload = {
      personalizations: [{
        to: [{ email: to, name: parentName || 'Parent' }],
        subject: 'WMSU ILS - Parent Verification Code'
      }],
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME
      },
      content: [
        { 
          type: 'text/html', 
          value: buildParentOTPEmailHtml({ parentName, studentName, otp }) 
        },
        { 
          type: 'text/plain', 
          value: `Your verification code is: ${otp}` 
        }
      ]
    };
    
    console.log('📧 SendGrid payload:', JSON.stringify(payload, null, 2));
    
    const response = await postJson('https://api.sendgrid.com/v3/mail/send', payload, {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`
    });

    console.log('📧 SendGrid API response:', response);
    return { success: true, data: response };
  } catch (error) {
    console.error('Failed to send parent OTP email:', error.message);
    console.error('Full error:', error);
    if (error.response) {
      console.error('SendGrid error response:', JSON.stringify(error.response, null, 2));
      if (error.response.data && error.response.data.errors) {
        console.error('SendGrid error details:', error.response.data.errors);
      }
    }
    
    // Fallback to Brevo email service
    console.log('🔄 Falling back to Brevo email service...');
    try {
      const { sendBrevoEmail } = require('./emailService');
      const htmlContent = buildParentOTPEmailHtml({ parentName, studentName, otp });
      
      const brevoResult = await sendBrevoEmail({
        to: [{ email: to, name: parentName || 'Parent' }],
        subject: 'WMSU ILS - Parent Verification Code',
        htmlContent: htmlContent,
        textContent: `Your verification code is: ${otp}`
      });
      
      console.log('📧 Brevo fallback email sent successfully');
      return { success: true, data: brevoResult, service: 'brevo' };
    } catch (brevoError) {
      console.error('Brevo fallback also failed:', brevoError.message);
      return { success: false, error: `SendGrid: ${error.message}, Brevo: ${brevoError.message}` };
    }
  }
};

module.exports = {
  sendParentOTPEmail
};
