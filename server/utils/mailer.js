const nodemailer = require('nodemailer');
require('dotenv').config();

const mailEnabled = process.env.MAIL_ENABLED === 'true';

let transporter = null;

if (mailEnabled) {
  transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT) || 587,
    secure: process.env.MAIL_SECURE === 'true',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    }
  });
}

const fromAddress = process.env.MAIL_FROM || 'Anizil <no-reply@anizil.com>';
const siteUrl = process.env.SITE_URL || process.env.CORS_ORIGIN || 'http://localhost:3001';

function sendMail(to, subject, html) {
  if (!mailEnabled || !transporter) {
    console.log(`[mailer] Email disabled - would send to ${to}: ${subject}`);
    return Promise.resolve({ skipped: true });
  }
  return transporter.sendMail({
    from: fromAddress,
    to,
    subject,
    html
  });
}

function baseLayout(title, contentHtml) {
  return `
    <div style="font-family: Arial, sans-serif; background:#0f172a; color:#e2e8f0; padding:24px;">
      <div style="max-width:520px; margin:0 auto; background:#1e293b; border-radius:12px; overflow:hidden;">
        <div style="padding:20px 24px; background:linear-gradient(90deg,#0ea5e9,#0284c7);">
          <h1 style="margin:0; color:#fff; font-size:20px;">${title}</h1>
        </div>
        <div style="padding:24px;">${contentHtml}</div>
        <div style="padding:16px 24px; border-top:1px solid rgba(148,163,184,0.15); color:#94a3b8; font-size:12px;">
          &copy; ${new Date().getFullYear()} Anizil. All rights reserved.
        </div>
      </div>
    </div>`;
}

function button(url, label) {
  return `<a href="${url}" style="display:inline-block; background:#0ea5e9; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600; margin-top:12px;">${label}</a>`;
}

async function sendPasswordReset(to, name, token) {
  const resetUrl = `${siteUrl}/reset-password?token=${token}`;
  const html = baseLayout('Reset Your Password', `
    <p>Hello ${name},</p>
    <p>We received a request to reset your password. Click the button below to choose a new password. This link expires in 1 hour.</p>
    ${button(resetUrl, 'Reset Password')}
    <p style="margin-top:16px; font-size:13px; color:#94a3b8;">If you didn't request this, you can safely ignore this email.</p>
  `);
  return sendMail(to, 'Reset Your Password - Anizil', html);
}

async function sendVerification(to, name, token) {
  const verifyUrl = `${siteUrl}/verify-email?token=${token}`;
  const html = baseLayout('Verify Your Email', `
    <p>Welcome to Anizil, ${name}!</p>
    <p>Please confirm your email address to activate your account by clicking the button below.</p>
    ${button(verifyUrl, 'Verify Email')}
    <p style="margin-top:16px; font-size:13px; color:#94a3b8;">If you didn't create this account, you can ignore this email.</p>
  `);
  return sendMail(to, 'Verify Your Email - Anizil', html);
}

module.exports = {
  sendMail,
  sendPasswordReset,
  sendVerification,
  mailEnabled
};
