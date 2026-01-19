// Backend API Example for Email Sending
// This should be implemented on your backend server (Node.js/Express)

const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting for email endpoints
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many email requests, please try again later.'
});

// Email configuration
const transporter = nodemailer.createTransporter({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER, // ahmadraoabsar@gmail.com
    pass: process.env.SMTP_PASS, // uzpk gcix ebfh sfrg
  },
});

// Verify email configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('Email configuration error:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

// Email sending endpoint
app.post('/api/send-email', emailLimiter, async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;

    // Validate input
    if (!to || !subject || !html) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, subject, html'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address'
      });
    }

    // Send email
    const mailOptions = {
      from: 'Hostel Ledger <noreply@quizzicallabz.qzz.io>',
      to: to,
      subject: subject,
      html: html,
      text: text || ''
    };

    const result = await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      messageId: result.messageId
    });

  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email'
    });
  }
});

// Verification email endpoint
app.post('/api/send-verification', emailLimiter, async (req, res) => {
  try {
    const { email, code, name } = req.body;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Email Verification</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f0fdf4; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background: linear-gradient(135deg, #10b981, #059669); padding: 40px 20px; text-align: center; }
          .content { padding: 40px 20px; }
          .code { font-size: 36px; font-weight: 800; color: #059669; letter-spacing: 8px; text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="color: white; margin: 0;">🏠 Hostel Ledger</h1>
          </div>
          <div class="content">
            <h2>Hi ${name}!</h2>
            <p>Your verification code is:</p>
            <div class="code">${code}</div>
            <p>This code expires in 10 minutes.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: 'Hostel Ledger <noreply@quizzicallabz.qzz.io>',
      to: email,
      subject: '🔐 Verify Your Hostel Ledger Account',
      html: html
    };

    const result = await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      messageId: result.messageId
    });

  } catch (error) {
    console.error('Verification email error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send verification email'
    });
  }
});

// Password reset email endpoint
app.post('/api/send-password-reset', emailLimiter, async (req, res) => {
  try {
    const { email, resetLink, name } = req.body;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f0fdf4; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background: linear-gradient(135deg, #10b981, #059669); padding: 40px 20px; text-align: center; }
          .content { padding: 40px 20px; }
          .button { display: inline-block; background: #10b981; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="color: white; margin: 0;">🔑 Password Reset</h1>
          </div>
          <div class="content">
            <h2>Hi ${name}!</h2>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </div>
            <p>This link expires in 1 hour.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: 'Hostel Ledger <noreply@quizzicallabz.qzz.io>',
      to: email,
      subject: '🔑 Reset Your Hostel Ledger Password',
      html: html
    };

    const result = await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      messageId: result.messageId
    });

  } catch (error) {
    console.error('Password reset email error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send password reset email'
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Email API server running on port ${PORT}`);
});

module.exports = app;

// To use this backend:
// 1. Create a new Node.js project: npm init -y
// 2. Install dependencies: npm install express nodemailer cors express-rate-limit
// 3. Set environment variables: SMTP_USER and SMTP_PASS
// 4. Run: node backend-email-api-example.js
// 5. Update your frontend to call these endpoints instead of the mock functions