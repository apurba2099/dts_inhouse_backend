const nodemailer = require("nodemailer");
const logger = require("../config/logger");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendPasswordResetEmail = async (toEmail, resetLink) => {
  const mailOptions = {
    from: `"DynamicPro HR" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Reset your DynamicPro HR password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1F3A5F;">Reset your password</h2>
        <p>We received a request to reset your DynamicPro HR password. Click the button below to set a new one. This link expires in 30 minutes.</p>
        <a href="${resetLink}" style="display: inline-block; background: #1F3A5F; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">Reset Password</a>
        <p style="color: #667085; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Password reset email sent to ${toEmail}`);
  } catch (error) {
    logger.error(`Failed to send email: ${error.message}`);
    throw error;
  }
};

const sendBreakNotification = async (recipientEmails, { type, employeeName, time, reason, duration }) => {
  if (!recipientEmails || recipientEmails.length === 0) return;

  const isStart = type === "start";

  const subject = isStart
    ? `${employeeName} is now on a break`
    : `${employeeName} is back from break`;

  const html = isStart
    ? `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1F3A5F;">${employeeName} is on a break</h2>
        <p><strong>Started:</strong> ${time}</p>
        <p><strong>Reason:</strong> ${reason}</p>
      </div>
    `
    : `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1F3A5F;">${employeeName} is back from break</h2>
        <p><strong>Resumed at:</strong> ${time}</p>
        <p><strong>Break duration:</strong> ${duration}</p>
      </div>
    `;

  const mailOptions = {
    from: `"DynamicPro HR" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    bcc: recipientEmails,
    subject,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Break ${type} notification sent to ${recipientEmails.length} people`);
  } catch (error) {
    logger.error(`Failed to send break notification: ${error.message}`);
  }
};

module.exports = { sendPasswordResetEmail, sendBreakNotification };