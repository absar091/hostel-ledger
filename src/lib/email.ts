import nodemailer from 'nodemailer';

// Email configuration - you'll need to provide your credentials
const EMAIL_CONFIG = {
  host: process.env.VITE_EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.VITE_EMAIL_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.VITE_EMAIL_USER || '', // Your email
    pass: process.env.VITE_EMAIL_PASS || '', // Your app password
  },
};

// Create transporter
const transporter = nodemailer.createTransporter(EMAIL_CONFIG);

// Verify connection configuration
export const verifyEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log('Email server is ready to take our messages');
    return true;
  } catch (error) {
    console.error('Email server connection failed:', error);
    return false;
  }
};

// Generate verification code
export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Email templates
export const emailTemplates = {
  verification: (code: string, name: string) => ({
    subject: ' Verify Your Hostel Ledger Account',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 0; background-color: #f0fdf4; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background: linear-gradient(135deg, #10b981, #059669); padding: 40px 20px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 700; }
          .content { padding: 40px 20px; }
          .verification-code { background: #f0fdf4; border: 2px solid #10b981; border-radius: 12px; padding: 20px; text-align: center; margin: 30px 0; }
          .code { font-size: 36px; font-weight: 800; color: #059669; letter-spacing: 8px; margin: 10px 0; }
          .footer { background-color: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
          .button { display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏠 Hostel Ledger</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Welcome to smart expense sharing!</p>
          </div>
          
          <div class="content">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Hi ${name}! </h2>
            
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
              Thanks for signing up for Hostel Ledger! We're excited to help you manage your shared expenses effortlessly.
            </p>
            
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
              To complete your registration, please verify your email address using the code below:
            </p>
            
            <div class="verification-code">
              <p style="margin: 0; color: #059669; font-weight: 600;">Your Verification Code</p>
              <div class="code">${code}</div>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">This code expires in 10 minutes</p>
            </div>
            
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
              Simply enter this code in the app to verify your account and start splitting expenses with your friends!
            </p>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>Security Note:</strong> If you didn't create an account with Hostel Ledger, please ignore this email.
              </p>
            </div>
          </div>
          
          <div class="footer">
            <p>© 2024 Hostel Ledger. Made with ❤️ for better expense sharing.</p>
            <p>Need help? Contact us at support@hostelledger.com</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Hi ${name}!
      
      Welcome to Hostel Ledger! 
      
      Your verification code is: ${code}
      
      This code expires in 10 minutes. Enter it in the app to verify your account.
      
      If you didn't create an account, please ignore this email.
      
      Best regards,
      Hostel Ledger Team
    `
  }),

  transactionNotification: (transaction: any, userType: 'payer' | 'participant') => ({
    subject: ` ${userType === 'payer' ? 'Expense Added' : 'New Expense'} - ${transaction.title}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Transaction Notification</title>
        <style>
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 0; background-color: #f0fdf4; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background: linear-gradient(135deg, #10b981, #059669); padding: 30px 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .transaction-card { background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981; }
          .amount { font-size: 24px; font-weight: 700; color: #059669; }
          .footer { background-color: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="color: white; margin: 0;"> Transaction Update</h1>
          </div>
          
          <div class="content">
            <h2 style="color: #1f2937;">
              ${userType === 'payer' ? 'Expense Successfully Added!' : 'You\'re part of a new expense'}
            </h2>
            
            <div class="transaction-card">
              <h3 style="margin: 0 0 10px 0; color: #1f2937;">${transaction.title}</h3>
              <div class="amount">Rs ${transaction.amount.toLocaleString()}</div>
              <p style="color: #6b7280; margin: 10px 0 0 0;">
                ${userType === 'payer' ? 'You paid this amount' : `Your share: Rs ${transaction.userShare?.toLocaleString() || '0'}`}
              </p>
            </div>
            
            <p><strong>Group:</strong> ${transaction.groupName}</p>
            <p><strong>Date:</strong> ${new Date(transaction.date).toLocaleDateString()}</p>
            ${transaction.note ? `<p><strong>Note:</strong> ${transaction.note}</p>` : ''}
            
            <div style="margin-top: 30px; text-align: center;">
              <a href="${process.env.VITE_APP_URL || 'http://localhost:3000'}" 
                 style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                View in App
              </a>
            </div>
          </div>
          
          <div class="footer">
            <p>© 2024 Hostel Ledger. Split your expenses with ease!</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  passwordReset: (resetLink: string, name: string) => ({
    subject: ' Reset Your Hostel Ledger Password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 0; background-color: #f0fdf4; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background: linear-gradient(135deg, #10b981, #059669); padding: 40px 20px; text-align: center; }
          .content { padding: 40px 20px; }
          .button { display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
          .footer { background-color: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="color: white; margin: 0;"> Password Reset</h1>
          </div>
          
          <div class="content">
            <h2 style="color: #1f2937;">Hi ${name}!</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">
              We received a request to reset your password for your Hostel Ledger account.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </div>
            
            <p style="color: #4b5563; line-height: 1.6; font-size: 14px;">
              This link will expire in 1 hour for security reasons.
            </p>
            
            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #dc2626; font-size: 14px;">
                <strong>Security Note:</strong> If you didn't request this password reset, please ignore this email and your password will remain unchanged.
              </p>
            </div>
          </div>
          
          <div class="footer">
            <p>© 2024 Hostel Ledger. Keeping your account secure.</p>
          </div>
        </div>
      </body>
      </html>
    `
  })
};

// Send verification email
export const sendVerificationEmail = async (email: string, code: string, name: string) => {
  try {
    const template = emailTemplates.verification(code, name);
    
    const mailOptions = {
      from: `"Hostel Ledger" <${EMAIL_CONFIG.auth.user}>`,
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: error.message };
  }
};

// Send transaction notification
export const sendTransactionEmail = async (
  email: string, 
  transaction: any, 
  userType: 'payer' | 'participant'
) => {
  try {
    const template = emailTemplates.transactionNotification(transaction, userType);
    
    const mailOptions = {
      from: `"Hostel Ledger" <${EMAIL_CONFIG.auth.user}>`,
      to: email,
      subject: template.subject,
      html: template.html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Transaction email sent:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending transaction email:', error);
    return { success: false, error: error.message };
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (email: string, resetLink: string, name: string) => {
  try {
    const template = emailTemplates.passwordReset(resetLink, name);
    
    const mailOptions = {
      from: `"Hostel Ledger" <${EMAIL_CONFIG.auth.user}>`,
      to: email,
      subject: template.subject,
      html: template.html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};