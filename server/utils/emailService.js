// server/utils/emailService.js
// Using SendGrid Web API - works on Railway (no SMTP port blocking)

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM || 'wmsuils.attendance@gmail.com';
const FROM_NAME = 'WMSU ILS Attendance';

/**
 * Send email via SendGrid Web API
 */
const sendViaSendGrid = async (to, subject, htmlContent, textContent) => {
  if (!SENDGRID_API_KEY) {
    console.error('📧 SENDGRID_API_KEY not configured');
    return { success: false, error: 'SendGrid API key not configured' };
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: subject,
      content: [
        { type: 'text/plain', value: textContent },
        { type: 'text/html', value: htmlContent }
      ]
    })
  });

  if (response.ok || response.status === 202) {
    console.log(`📧 Email sent successfully to ${to} via SendGrid`);
    return { success: true, messageId: response.headers.get('x-message-id') || 'sent' };
  } else {
    const errorText = await response.text();
    console.error(`📧 SendGrid error: ${response.status} - ${errorText}`);
    return { success: false, error: `SendGrid error: ${response.status}` };
  }
};

/**
 * Send attendance notification email to parent
 * @param {Object} params - Email parameters
 * @param {string} params.parentEmail - Parent's email address
 * @param {string} params.studentName - Student's name
 * @param {string} params.studentLRN - Student's LRN
 * @param {string} params.gradeLevel - Grade level
 * @param {string} params.section - Section
 * @param {string} params.status - Attendance status (present/late/absent)
 * @param {string} params.period - Time period (morning/afternoon)
 * @param {string} params.time - Time recorded
 * @param {string} params.teacherName - Teacher's name
 */
const sendAttendanceEmail = async (params) => {
  const {
    parentEmail,
    studentName,
    studentLRN,
    gradeLevel,
    section,
    status,
    period,
    time,
    teacherName
  } = params;

  if (!parentEmail) {
    console.log('📧 No parent email provided, skipping email notification');
    return { success: false, message: 'No parent email provided' };
  }

  const periodText = period === 'morning' ? 'Morning' : 'Afternoon';
  const statusText = status.toUpperCase();
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  let statusMessage = '';
  let statusColor = '';
  let statusIcon = '';

  if (status === 'present') {
    statusMessage = `We are pleased to inform you that <strong>${studentName}</strong> has arrived at school and was marked <strong style="color: #4CAF50;">PRESENT</strong>.`;
    statusColor = '#4CAF50';
    statusIcon = '✓';
  } else if (status === 'late') {
    statusMessage = `We would like to inform you that <strong>${studentName}</strong> arrived late at school today and was marked <strong style="color: #FF9800;">LATE</strong>.`;
    statusColor = '#FF9800';
    statusIcon = '⏰';
  } else {
    statusMessage = `We regret to inform you that <strong>${studentName}</strong> was marked <strong style="color: #F44336;">ABSENT</strong> for today's ${periodText.toLowerCase()} session.`;
    statusColor = '#F44336';
    statusIcon = '✗';
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Attendance Notification</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <tr>
          <td style="background-color: #8B0000; padding: 30px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">WMSU ILS - Elementary Department</h1>
            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Attendance Monitoring System</p>
          </td>
        </tr>
        
        <!-- Status Banner -->
        <tr>
          <td style="background-color: ${statusColor}; padding: 15px 20px; text-align: center;">
            <span style="color: #ffffff; font-size: 32px; display: block;">${statusIcon}</span>
            <span style="color: #ffffff; font-size: 20px; font-weight: bold;">${statusText}</span>
          </td>
        </tr>
        
        <!-- Content -->
        <tr>
          <td style="padding: 30px 20px;">
            <p style="font-size: 16px; color: #333333; margin: 0 0 20px 0;">Dear Parent/Guardian,</p>
            <p style="font-size: 16px; color: #333333; margin: 0 0 20px 0; line-height: 1.6;">${statusMessage}</p>
            
            <!-- Details Card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; border-radius: 8px; margin: 20px 0;">
              <tr>
                <td style="padding: 20px;">
                  <h3 style="color: #8B0000; margin: 0 0 15px 0; font-size: 16px; border-bottom: 2px solid #8B0000; padding-bottom: 10px;">📋 ATTENDANCE DETAILS</h3>
                  <table width="100%" cellpadding="5" cellspacing="0">
                    <tr>
                      <td style="color: #666666; font-size: 14px; width: 40%;">Student Name:</td>
                      <td style="color: #333333; font-size: 14px; font-weight: bold;">${studentName}</td>
                    </tr>
                    <tr>
                      <td style="color: #666666; font-size: 14px;">LRN:</td>
                      <td style="color: #333333; font-size: 14px;">${studentLRN || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td style="color: #666666; font-size: 14px;">Grade & Section:</td>
                      <td style="color: #333333; font-size: 14px;">${gradeLevel || 'N/A'} - ${section || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td style="color: #666666; font-size: 14px;">Date:</td>
                      <td style="color: #333333; font-size: 14px;">${today}</td>
                    </tr>
                    <tr>
                      <td style="color: #666666; font-size: 14px;">Session:</td>
                      <td style="color: #333333; font-size: 14px;">${periodText}</td>
                    </tr>
                    <tr>
                      <td style="color: #666666; font-size: 14px;">Time Recorded:</td>
                      <td style="color: #333333; font-size: 14px;">${time || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td style="color: #666666; font-size: 14px;">Status:</td>
                      <td style="color: ${statusColor}; font-size: 14px; font-weight: bold;">${statusText}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            
            ${status === 'absent' ? `
            <div style="background-color: #FFF3E0; border-left: 4px solid #FF9800; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #E65100; font-size: 14px;">
                ⚠️ <strong>Important:</strong> Please ensure your child attends school regularly. If there is a valid reason for the absence, kindly inform the school administration.
              </p>
            </div>
            ` : ''}
            
            <p style="font-size: 14px; color: #666666; margin: 20px 0 0 0; line-height: 1.6;">
              Thank you for your continued support in your child's education.
            </p>
            
            <p style="font-size: 14px; color: #333333; margin: 20px 0 0 0;">
              Best regards,<br>
              <strong>${teacherName || 'School Administration'}</strong><br>
              WMSU ILS - Elementary Department
            </p>
          </td>
        </tr>
        
        <!-- Footer -->
        <tr>
          <td style="background-color: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0; color: #999999; font-size: 12px;">
              This is an automated message from the WMSU ILS Attendance Monitoring System.<br>
              Please do not reply to this email.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const textContent = `
WMSU ILS - Elementary Department
Attendance Monitoring System

Dear Parent/Guardian,

${status === 'present' ? `We are pleased to inform you that ${studentName} has arrived at school and was marked PRESENT.` : 
  status === 'late' ? `We would like to inform you that ${studentName} arrived late at school today and was marked LATE.` :
  `We regret to inform you that ${studentName} was marked ABSENT for today's ${periodText.toLowerCase()} session.`}

ATTENDANCE DETAILS:
-------------------
Student Name: ${studentName}
LRN: ${studentLRN || 'N/A'}
Grade & Section: ${gradeLevel || 'N/A'} - ${section || 'N/A'}
Date: ${today}
Session: ${periodText}
Time Recorded: ${time || 'N/A'}
Status: ${statusText}
-------------------

${status === 'absent' ? 'Please ensure your child attends school regularly. If there is a valid reason for the absence, kindly inform the school administration.\n' : ''}
Thank you for your continued support in your child's education.

Best regards,
${teacherName || 'School Administration'}
WMSU ILS - Elementary Department
  `;

  const subject = `Attendance Update: ${studentName} - ${statusText} (${periodText})`;

  try {
    const result = await sendViaSendGrid(parentEmail, subject, htmlContent, textContent);
    return result;
  } catch (error) {
    console.error(`📧 Error sending email to ${parentEmail}:`, error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendAttendanceEmail };
