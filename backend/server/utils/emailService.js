const https = require('https');

const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const FROM_EMAIL = process.env.EMAIL_FROM || 'no-reply@wmsu-ils.edu';
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'WMSU ILS Portal';

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


const buildResetEmailHtml = ({ name, resetLink }) => {
  return `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
        <h2 style="color: #8B0000;">Password Reset Request</h2>
        <p>Hi ${name || 'there'},</p>
        <p>We received a request to reset your password for the WMSU ILS portal. If you made this request, click the button below to set a new password:</p>
        <p>
          <a href="${resetLink}" style="display: inline-block; padding: 12px 18px; background: #8B0000; color: #fff; border-radius: 6px; text-decoration: none;">Reset Password</a>
        </p>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all;"><a href="${resetLink}">${resetLink}</a></p>
        <p>This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
        <p style="margin-top: 24px;">Regards,<br/>WMSU ILS - Elementary Department</p>
      </body>
    </html>
  `;
};

const sendPasswordResetEmail = async ({ to, name, resetLink }) => {
  if (!BREVO_API_KEY) {
    console.warn('BREVO_API_KEY not configured. Password reset email not sent.');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    console.log('📧 Sending password reset email via Brevo to', to, 'with link', resetLink);
    const response = await postJson('https://api.brevo.com/v3/smtp/email', {
      sender: {
        email: FROM_EMAIL,
        name: FROM_NAME
      },
      to: [{ email: to, name }],
      subject: 'Reset your WMSU ILS portal password',
      htmlContent: buildResetEmailHtml({ name, resetLink }),
      textContent: `Reset your password using this link: ${resetLink}`
    }, {
      'api-key': BREVO_API_KEY
    });

    console.log('📧 Brevo API response:', response);
    return { success: true, data: response };
  } catch (error) {
    console.error('Failed to send password reset email:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPasswordResetEmail
};
