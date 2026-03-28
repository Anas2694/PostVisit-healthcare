/**
 * Email Service
 * Nodemailer-based email notifications
 */

const nodemailer = require('nodemailer');

// ========================
// Create Transporter
// ========================
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const FROM = process.env.EMAIL_FROM || 'PostVisit Health <noreply@postvisit.health>';

// ========================
// Base HTML Email Template
// ========================
const baseTemplate = (title, content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fb; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1a6b8a, #0d4f6a); padding: 32px 40px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; letter-spacing: 1px; }
    .header p { color: #a8d8ea; margin: 6px 0 0; font-size: 13px; }
    .body { padding: 36px 40px; }
    .body h2 { color: #1a6b8a; margin-top: 0; }
    .body p { color: #444; line-height: 1.7; }
    .btn { display: inline-block; background: #1a6b8a; color: #fff !important; padding: 13px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 18px 0; }
    .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 14px 18px; border-radius: 6px; margin: 16px 0; }
    .footer { background: #f4f7fb; padding: 20px 40px; text-align: center; font-size: 12px; color: #888; }
    .divider { border: none; border-top: 1px solid #eee; margin: 24px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏥 PostVisit</h1>
      <p>AI-Powered Health Intelligence</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>PostVisit Health Platform &mdash; <a href="${process.env.APP_URL}">postvisit.health</a></p>
      <p style="color:#bbb; font-size:11px;">This is an automated message. Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>`;

// ========================
// Send Welcome Email
// ========================
exports.sendWelcomeEmail = async (user) => {
  if (!process.env.EMAIL_USER) return;
  const transporter = createTransporter();
  const content = `
    <h2>Welcome to PostVisit, ${user.firstName}! 👋</h2>
    <p>We're thrilled to have you on board. PostVisit uses cutting-edge AI to help you understand your medical reports, track your health trends, and take charge of your wellbeing.</p>
    <p>Here's what you can do:</p>
    <ul style="color:#444; line-height:2;">
      <li>📄 <strong>Upload medical reports</strong> (blood tests, X-rays, MRIs)</li>
      <li>🤖 <strong>Get AI-powered explanations</strong> in plain English</li>
      <li>📊 <strong>Track health trends</strong> over time</li>
      <li>💬 <strong>Chat with your AI health assistant</strong></li>
      <li>🔔 <strong>Set medication reminders</strong></li>
    </ul>
    <a href="${process.env.APP_URL}/dashboard" class="btn">Go to My Dashboard →</a>
    <hr class="divider">
    <div class="alert">
      <strong>⚠️ Important:</strong> PostVisit AI provides informational insights only. Always consult a qualified doctor for medical decisions.
    </div>`;
  await transporter.sendMail({ from: FROM, to: user.email, subject: '🏥 Welcome to PostVisit — Your AI Health Companion', html: baseTemplate('Welcome', content) });
};

// ========================
// Send Report Ready Email
// ========================
exports.sendReportAnalyzedEmail = async (user, report, analysis) => {
  if (!process.env.EMAIL_USER || !user.preferences?.emailNotifications) return;
  const transporter = createTransporter();
  const severityColor = { normal: '#2ecc71', mild: '#f39c12', moderate: '#e67e22', severe: '#e74c3c', critical: '#c0392b' };
  const color = severityColor[analysis.severity] || '#1a6b8a';
  const content = `
    <h2>Your Report Analysis is Ready 📊</h2>
    <p>Great news! Your report <strong>"${report.title}"</strong> has been analyzed by our AI engine.</p>
    <div style="background:#f8f9fa; border-radius:8px; padding:20px; margin:16px 0;">
      <p style="margin:0 0 8px;"><strong>Report:</strong> ${report.title}</p>
      <p style="margin:0 0 8px;"><strong>Type:</strong> ${report.reportType?.replace(/_/g, ' ')}</p>
      <p style="margin:0 0 8px;"><strong>Severity:</strong> <span style="color:${color}; font-weight:600;">${(analysis.severity || 'N/A').toUpperCase()}</span></p>
      <p style="margin:0;"><strong>Summary:</strong> ${analysis.summary?.substring(0, 200)}...</p>
    </div>
    <a href="${process.env.APP_URL}/reports/${report._id}" class="btn">View Full Analysis →</a>`;
  await transporter.sendMail({ from: FROM, to: user.email, subject: `📊 Analysis Ready: ${report.title}`, html: baseTemplate('Report Ready', content) });
};

// ========================
// Send Medication Reminder Email
// ========================
exports.sendMedicationReminder = async (user, notification) => {
  if (!process.env.EMAIL_USER) return;
  const transporter = createTransporter();
  const content = `
    <h2>Medication Reminder 💊</h2>
    <p>Hi ${user.firstName}, this is your scheduled reminder:</p>
    <div style="background:#e8f4f8; border-left:4px solid #1a6b8a; border-radius:6px; padding:18px; margin:16px 0;">
      <h3 style="margin:0 0 8px; color:#1a6b8a;">${notification.title}</h3>
      <p style="margin:0; color:#444;">${notification.message}</p>
    </div>
    <a href="${process.env.APP_URL}/notifications" class="btn">View All Reminders →</a>`;
  await transporter.sendMail({ from: FROM, to: user.email, subject: `💊 Reminder: ${notification.title}`, html: baseTemplate('Reminder', content) });
};

// ========================
// Send Password Reset Email
// ========================
exports.sendPasswordResetEmail = async (user, resetUrl) => {
  if (!process.env.EMAIL_USER) return;
  const transporter = createTransporter();
  const content = `
    <h2>Password Reset Request 🔐</h2>
    <p>Hi ${user.firstName}, we received a request to reset your password.</p>
    <p>Click the button below to create a new password. This link expires in <strong>10 minutes</strong>.</p>
    <a href="${resetUrl}" class="btn">Reset My Password →</a>
    <div class="alert">
      <strong>Didn't request this?</strong> If you didn't request a password reset, please ignore this email. Your account remains secure.
    </div>`;
  await transporter.sendMail({ from: FROM, to: user.email, subject: '🔐 PostVisit — Password Reset Request', html: baseTemplate('Reset Password', content) });
};

// ========================
// Send Health Alert Email
// ========================
exports.sendHealthAlert = async (user, alertData) => {
  if (!process.env.EMAIL_USER) return;
  const transporter = createTransporter();
  const content = `
    <h2>⚠️ Health Alert</h2>
    <p>Hi ${user.firstName}, our AI has detected some values in your recent report that need your attention.</p>
    <div style="background:#fff3cd; border-left:4px solid #e74c3c; border-radius:6px; padding:18px; margin:16px 0;">
      <strong>${alertData.title}</strong>
      <p style="margin:8px 0 0;">${alertData.message}</p>
    </div>
    <p>Please consult your doctor at the earliest opportunity.</p>
    <a href="${process.env.APP_URL}/dashboard" class="btn">View Dashboard →</a>`;
  await transporter.sendMail({ from: FROM, to: user.email, subject: `⚠️ Health Alert — Action Required`, html: baseTemplate('Health Alert', content) });
};
