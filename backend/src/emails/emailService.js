const nodemailer = require('nodemailer');
const logger = require('../config/logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT || '2525'),
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

const sendEmail = async (to, subject, text, html) => {
  try {
    // If SMTP credentials aren't set, output to log for developer convenience
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.warn(`[MOCK EMAIL SENT] To: ${to} | Subject: ${subject}`);
      logger.warn(`Body Text: ${text}`);
      return true;
    }

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"ViewPay" <noreply@viewpay.com>',
      to,
      subject,
      text,
      html,
    });

    logger.info(`Email successfully sent: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error(`Error sending email to ${to}:`, error);
    return false;
  }
};

/**
 * Send OTP for verification
 * @param {string} email 
 * @param {string} code 
 */
const sendOtpVerificationEmail = async (email, code) => {
  const subject = 'Verify your email - ViewPay';
  const text = `Your verification code is: ${code}. It expires in 15 minutes.`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #333;">
      <h2>Welcome to ViewPay!</h2>
      <p>Thank you for signing up. Please verify your email using the following 6-digit OTP code:</p>
      <div style="background: #f4f5f6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; border-radius: 4px; margin: 20px 0;">
        ${code}
      </div>
      <p>This code will expire in 15 minutes.</p>
      <p>If you did not make this request, you can safely ignore this email.</p>
    </div>
  `;
  return sendEmail(email, subject, text, html);
};

/**
 * Send password reset email
 * @param {string} email 
 * @param {string} code 
 */
const sendPasswordResetEmail = async (email, code) => {
  const subject = 'Reset your password - ViewPay';
  const text = `Your password reset code is: ${code}. It expires in 15 minutes.`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #333;">
      <h2>Reset Password Request</h2>
      <p>We received a request to reset your password. Use the following OTP code to proceed:</p>
      <div style="background: #f4f5f6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; border-radius: 4px; margin: 20px 0;">
        ${code}
      </div>
      <p>This code will expire in 15 minutes.</p>
      <p>If you did not request a password reset, please change your password or contact support immediately.</p>
    </div>
  `;
  return sendEmail(email, subject, text, html);
};

module.exports = {
  sendEmail,
  sendOtpVerificationEmail,
  sendPasswordResetEmail
};
