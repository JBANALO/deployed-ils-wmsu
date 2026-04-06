// server/utils/emailService.js
// Using Brevo (Sendinblue) API - works on Railway (no SMTP port blocking)

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM || 'wmsuils.attendance@gmail.com';
const FROM_NAME = 'WMSU ILS Attendance';

/**
 * Send email via Brevo (Sendinblue) API
 */
const sendViaBrevo = async (to, subject, htmlContent, textContent) => {
  if (!BREVO_API_KEY) {
    console.error('📧 BREVO_API_KEY not configured');
    return { success: false, error: 'Brevo API key not configured' };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: FROM_NAME, email: FROM_EMAIL },
        to: [{ email: to }],
        subject: subject,
        htmlContent: htmlContent,
        textContent: textContent
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log(`📧 Email sent successfully to ${to} via Brevo. MessageId: ${result.messageId}`);
      return { success: true, messageId: result.messageId };
    } else {
      console.error(`📧 Brevo error: ${response.status} - ${JSON.stringify(result)}`);
      return { success: false, error: result.message || `Brevo error: ${response.status}` };
    }
  } catch (error) {
    console.error(`📧 Brevo fetch error: ${error.message}`);
    return { success: false, error: error.message };
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
 * @param {string} params.subject - Subject name (for per-subject attendance)
 * @param {string} params.scheduleStartTime - Subject start time
 * @param {string} params.scheduleEndTime - Subject end time
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
    subject,
    scheduleStartTime,
    scheduleEndTime,
    time,
    teacherName
  } = params;

  if (!parentEmail) {
    console.log('📧 No parent email provided, skipping email notification');
    return { success: false, message: 'No parent email provided' };
  }

  const periodText = period === 'morning'
    ? 'Morning'
    : period === 'afternoon'
    ? 'Afternoon'
    : 'Per Subject';
  const subjectText = String(subject || '').trim() || 'N/A';
  const scheduleText = (scheduleStartTime && scheduleEndTime)
    ? `${scheduleStartTime} - ${scheduleEndTime}`
    : 'N/A';
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
    statusMessage = `We regret to inform you that <strong>${studentName}</strong> was marked <strong style="color: #F44336;">ABSENT</strong> for today's ${periodText.toLowerCase()} attendance.`;
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
                      <td style="color: #666666; font-size: 14px;">Subject:</td>
                      <td style="color: #333333; font-size: 14px;">${subjectText}</td>
                    </tr>
                    <tr>
                      <td style="color: #666666; font-size: 14px;">Schedule:</td>
                      <td style="color: #333333; font-size: 14px;">${scheduleText}</td>
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
  `We regret to inform you that ${studentName} was marked ABSENT for today's ${periodText.toLowerCase()} attendance.`}

ATTENDANCE DETAILS:
-------------------
Student Name: ${studentName}
LRN: ${studentLRN || 'N/A'}
Grade & Section: ${gradeLevel || 'N/A'} - ${section || 'N/A'}
Date: ${today}
Session: ${periodText}
Subject: ${subjectText}
Schedule: ${scheduleText}
Time Recorded: ${time || 'N/A'}
Status: ${statusText}
-------------------

${status === 'absent' ? 'Please ensure your child attends school regularly. If there is a valid reason for the absence, kindly inform the school administration.\n' : ''}
Thank you for your continued support in your child's education.

Best regards,
${teacherName || 'School Administration'}
WMSU ILS - Elementary Department
  `;

  const emailTitle = `Attendance Update: ${studentName} - ${statusText}${subjectText !== 'N/A' ? ` (${subjectText})` : ` (${periodText})`}`;

  try {
    const result = await sendViaBrevo(parentEmail, emailTitle, htmlContent, textContent);
    return result;
  } catch (error) {
    console.error(`📧 Error sending email to ${parentEmail}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send grade report email to parent with full subject breakdown
 */
const sendGradeReportEmail = async ({ parentEmail, studentName, gradeLevel, section, gradesMap, teacherName }) => {
  if (!parentEmail) return { success: false, error: 'No parent email provided' };

  const rows = Object.entries(gradesMap).map(([subject, grades]) => {
    const vals = [grades.q1, grades.q2, grades.q3, grades.q4].filter(v => v != null && v > 0);
    const avg = vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : '—';
    const avgColor = avg !== '—' && parseFloat(avg) < 75 ? '#dc2626' : '#111827';
    return `<tr>
      <td style="padding:8px 12px;border:1px solid #e5e7eb;font-size:13px;">${subject}</td>
      <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;font-size:13px;">${grades.q1 ?? '—'}</td>
      <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;font-size:13px;">${grades.q2 ?? '—'}</td>
      <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;font-size:13px;">${grades.q3 ?? '—'}</td>
      <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;font-size:13px;">${grades.q4 ?? '—'}</td>
      <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;font-weight:bold;font-size:13px;color:${avgColor};">${avg}</td>
    </tr>`;
  }).join('');

  const allVals = Object.values(gradesMap).flatMap(g => [g.q1, g.q2, g.q3, g.q4].filter(v => v != null && v > 0));
  const overallAvg = allVals.length > 0 ? (allVals.reduce((a, b) => a + b, 0) / allVals.length).toFixed(2) : '—';
  const remarks = overallAvg !== '—'
    ? (parseFloat(overallAvg) >= 90 ? 'With High Honors' : parseFloat(overallAvg) >= 85 ? 'With Honors' : parseFloat(overallAvg) >= 75 ? 'Passed' : 'Needs Improvement')
    : 'Pending';

  const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',sans-serif;background:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;margin:0 auto;background:#fff;">
  <tr><td style="background:#8B0000;padding:28px 24px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">WMSU ILS – Grade Report</h1>
    <p style="color:#fca5a5;margin:6px 0 0;font-size:13px;">Elementary Department</p>
  </td></tr>
  <tr><td style="padding:28px 24px;">
    <p style="font-size:15px;color:#111827;margin:0 0 6px;">Dear Parent/Guardian of <strong>${studentName}</strong>,</p>
    <p style="font-size:13px;color:#6b7280;margin:0 0 20px;">Below is the grade report for <strong>${gradeLevel} – ${section}</strong>.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
      <thead>
        <tr style="background:#8B0000;color:#fff;">
          <th style="padding:10px 12px;text-align:left;font-size:13px;">Subject</th>
          <th style="padding:10px 12px;text-align:center;font-size:13px;">Q1</th>
          <th style="padding:10px 12px;text-align:center;font-size:13px;">Q2</th>
          <th style="padding:10px 12px;text-align:center;font-size:13px;">Q3</th>
          <th style="padding:10px 12px;text-align:center;font-size:13px;">Q4</th>
          <th style="padding:10px 12px;text-align:center;font-size:13px;">Subject Avg</th>
        </tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="6" style="padding:12px;text-align:center;color:#9ca3af;">No grades recorded yet</td></tr>'}</tbody>
      <tfoot>
        <tr style="background:#fef2f2;">
          <td colspan="5" style="padding:10px 12px;font-weight:bold;color:#991b1b;font-size:14px;">Overall Average</td>
          <td style="padding:10px 12px;text-align:center;font-weight:bold;color:#991b1b;font-size:16px;">${overallAvg}</td>
        </tr>
        <tr style="background:#fef2f2;">
          <td colspan="5" style="padding:6px 12px;color:#991b1b;font-size:13px;">Remarks</td>
          <td style="padding:6px 12px;text-align:center;font-weight:bold;color:#991b1b;font-size:13px;">${remarks}</td>
        </tr>
      </tfoot>
    </table>
    <p style="font-size:13px;color:#6b7280;margin:0 0 4px;">If you have concerns, please contact the class adviser.</p>
    <p style="font-size:14px;color:#111827;margin:20px 0 0;">Best regards,<br><strong>${teacherName || 'Class Adviser'}</strong><br>WMSU ILS – Elementary Department</p>
  </td></tr>
  <tr><td style="background:#f9fafb;padding:14px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="margin:0;color:#9ca3af;font-size:11px;">Automated message from WMSU ILS. Do not reply.</p>
  </td></tr>
</table></body></html>`;

  const textContent = [
    `Grade Report – ${studentName} (${gradeLevel} – ${section})`,
    '',
    ...Object.entries(gradesMap).map(([s, g]) => {
      const vals = [g.q1, g.q2, g.q3, g.q4].filter(v => v != null && v > 0);
      const avg = vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : '—';
      return `${s}: Q1=${g.q1||'—'} Q2=${g.q2||'—'} Q3=${g.q3||'—'} Q4=${g.q4||'—'} Avg=${avg}`;
    }),
    '',
    `Overall Average: ${overallAvg} (${remarks})`,
    '',
    `From: ${teacherName || 'Class Adviser'}, WMSU ILS`
  ].join('\n');

  return sendViaBrevo(
    parentEmail,
    `Grade Report: ${studentName} – ${gradeLevel} ${section}`,
    htmlContent,
    textContent
  );
};

const sendAdviserGradeSubmissionEmail = async ({
  adviserEmail,
  adviserName,
  submitterName,
  studentName,
  gradeLevel,
  section,
  subjects,
  quarter,
  schoolYearLabel
}) => {
  if (!adviserEmail) return { success: false, error: 'No adviser email provided' };

  const subjectList = (Array.isArray(subjects) ? subjects : [])
    .map((s) => String(s || '').trim())
    .filter(Boolean)
    .join(', ');

  const cleanQuarter = String(quarter || '').trim().toUpperCase() || 'CURRENT QUARTER';
  const nowText = new Date().toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',sans-serif;background:#f3f4f6;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;margin:0 auto;background:#fff;">
  <tr><td style="background:#8B0000;padding:24px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:21px;">WMSU ILS - Grade Submission Notice</h1>
    <p style="color:#fecaca;margin:6px 0 0;font-size:13px;">Elementary Department</p>
  </td></tr>
  <tr><td style="padding:24px;">
    <p style="margin:0 0 10px;font-size:15px;color:#111827;">Dear ${adviserName || 'Class Adviser'},</p>
    <p style="margin:0 0 14px;font-size:14px;color:#374151;line-height:1.6;">
      <strong>${submitterName || 'Subject teacher'}</strong> submitted grades for
      <strong>${studentName || 'a student'}</strong>.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f9fafb;border:1px solid #e5e7eb;">
      <tr><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280;width:38%;">Student</td><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;font-weight:600;">${studentName || 'N/A'}</td></tr>
      <tr><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280;">Grade & Section</td><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;">${gradeLevel || 'N/A'} - ${section || 'N/A'}</td></tr>
      <tr><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280;">Quarter</td><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;">${cleanQuarter}</td></tr>
      <tr><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280;">Subjects Submitted</td><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;">${subjectList || 'N/A'}</td></tr>
      <tr><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280;">School Year</td><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;">${schoolYearLabel || 'Active school year'}</td></tr>
      <tr><td style="padding:10px 12px;font-size:13px;color:#6b7280;">Submitted At</td><td style="padding:10px 12px;font-size:13px;color:#111827;">${nowText}</td></tr>
    </table>
    <p style="margin:14px 0 0;font-size:12px;color:#6b7280;">This is an automated notification from WMSU ILS.</p>
  </td></tr>
</table></body></html>`;

  const textContent = [
    'WMSU ILS - Grade Submission Notice',
    '',
    `${submitterName || 'Subject teacher'} submitted grades.`,
    `Student: ${studentName || 'N/A'}`,
    `Grade & Section: ${gradeLevel || 'N/A'} - ${section || 'N/A'}`,
    `Quarter: ${cleanQuarter}`,
    `Subjects: ${subjectList || 'N/A'}`,
    `School Year: ${schoolYearLabel || 'Active school year'}`,
    `Submitted At: ${nowText}`
  ].join('\n');

  return sendViaBrevo(
    adviserEmail,
    `Grade Submission Alert: ${studentName || 'Student'} (${cleanQuarter})`,
    htmlContent,
    textContent
  );
};

module.exports = { sendAttendanceEmail, sendGradeReportEmail, sendAdviserGradeSubmissionEmail };
