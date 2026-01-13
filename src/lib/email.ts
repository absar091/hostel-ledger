// Backend API-based email service
// Uses your deployed Node.js backend server for sending emails

// Email configuration
const EMAIL_CONFIG = {
  apiUrl: import.meta.env.VITE_API_URL || 'https://hostel-ledger-backend.vercel.app',
  host: import.meta.env.VITE_SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(import.meta.env.VITE_SMTP_PORT || '587'),
  user: import.meta.env.VITE_SMTP_USER || 'ahmadraoabsar@gmail.com',
};

const EMAIL_FROM = import.meta.env.VITE_EMAIL_FROM || 'Hostel Ledger<noreply@quizzicallabz.qzz.io>';

// Check if backend API is available
export const verifyEmailConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${EMAIL_CONFIG.apiUrl}/health`);
    const result = await response.json();
    console.log('✅ Backend API status:', result.message);
    return response.ok;
  } catch (error) {
    console.warn('⚠️ Backend API not available:', error);
    return false;
  }
};

// Generate verification code
export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send email using backend API
const sendEmailWithAPI = async (emailData: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) => {
  try {
    console.log('📧 Sending email via backend API to:', emailData.to);
    
    const response = await fetch(`${EMAIL_CONFIG.apiUrl}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to send email');
    }

    console.log('✅ Email sent successfully via API:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    console.error('❌ API email error:', error);
    throw error;
  }
};

// Send verification email using backend API
const sendVerificationEmailAPI = async (email: string, code: string, name: string) => {
  try {
    console.log('📧 Sending verification email via backend API to:', email);
    
    const response = await fetch(`${EMAIL_CONFIG.apiUrl}/api/send-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        code,
        name
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to send verification email');
    }

    console.log('✅ Verification email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    console.error('❌ Verification email API error:', error);
    throw error;
  }
};

// Send welcome email using backend API
const sendWelcomeEmailAPI = async (email: string, name: string) => {
  try {
    console.log('📧 Sending welcome email via backend API to:', email);
    
    const response = await fetch(`${EMAIL_CONFIG.apiUrl}/api/send-welcome`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        name
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to send welcome email');
    }

    console.log('✅ Welcome email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    console.error('❌ Welcome email API error:', error);
    throw error;
  }
};

// Send transaction alert email using backend API
const sendTransactionAlertAPI = async (
  email: string, 
  name: string, 
  transactionType: string, 
  amount: string, 
  groupName: string, 
  date: string, 
  description: string
) => {
  try {
    console.log('📧 Sending transaction alert via backend API to:', email);
    
    const response = await fetch(`${EMAIL_CONFIG.apiUrl}/api/send-transaction-alert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        name,
        transactionType,
        amount,
        groupName,
        date,
        description
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to send transaction alert email');
    }

    console.log('✅ Transaction alert email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    console.error('❌ Transaction alert email API error:', error);
    throw error;
  }
};

// Send verification email using new template
const sendVerificationEmailNewAPI = async (email: string, code: string, name: string) => {
  try {
    console.log('📧 Sending verification email (new template) via backend API to:', email);
    
    const response = await fetch(`${EMAIL_CONFIG.apiUrl}/api/send-verification-new`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        code,
        name
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to send verification email');
    }

    console.log('✅ Verification email (new template) sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    console.error('❌ Verification email (new template) API error:', error);
    throw error;
  }
};
const sendPasswordResetEmailAPI = async (email: string, resetLink: string, name: string) => {
  try {
    console.log('📧 Sending password reset email via backend API to:', email);
    
    const response = await fetch(`${EMAIL_CONFIG.apiUrl}/api/send-password-reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        resetLink,
        name
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to send password reset email');
    }

    console.log('✅ Password reset email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    console.error('❌ Password reset email API error:', error);
    throw error;
  }
};

// Email templates (for fallback mode)
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
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1> Hostel Ledger</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Welcome to smart expense sharing!</p>
          </div>
          
          <div class="content">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Hi ${name}! 👋</h2>
            
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

  passwordReset: (resetLink: string, name: string) => ({
    subject: '🔑 Reset Your Hostel Ledger Password',
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
            <h1 style="color: white; margin: 0;">🔑 Password Reset</h1>
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

// Main email sending functions - backend API only (no fallback)
export const sendVerificationEmail = async (email: string, code: string, name: string) => {
  try {
    console.log('📧 Sending verification email to:', email);
    console.log('📧 Using API URL:', EMAIL_CONFIG.apiUrl);
    
    // Use new template
    const result = await sendVerificationEmailNewAPI(email, code, name);
    console.log('✅ Verification email sent via backend API');
    return result;
  } catch (error: any) {
    console.error('❌ Verification email failed:', error);
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
};

export const sendWelcomeEmail = async (email: string, name: string) => {
  try {
    console.log('📧 Sending welcome email to:', email);
    console.log('📧 Using API URL:', EMAIL_CONFIG.apiUrl);
    
    const result = await sendWelcomeEmailAPI(email, name);
    console.log('✅ Welcome email sent via backend API');
    return result;
  } catch (error: any) {
    console.error('❌ Welcome email failed:', error);
    throw new Error(`Failed to send welcome email: ${error.message}`);
  }
};

export const sendTransactionAlertEmail = async (
  email: string, 
  name: string, 
  transactionType: string, 
  amount: string, 
  groupName: string, 
  date: string, 
  description: string
) => {
  try {
    console.log('📧 Sending transaction alert email to:', email);
    console.log('📧 Using API URL:', EMAIL_CONFIG.apiUrl);
    
    const result = await sendTransactionAlertAPI(email, name, transactionType, amount, groupName, date, description);
    console.log('✅ Transaction alert email sent via backend API');
    return result;
  } catch (error: any) {
    console.error('❌ Transaction alert email failed:', error);
    throw new Error(`Failed to send transaction alert email: ${error.message}`);
  }
};

export const sendPasswordResetEmail = async (email: string, resetLink: string, name: string) => {
  try {
    console.log('📧 Sending password reset email to:', email);
    console.log('📧 Using API URL:', EMAIL_CONFIG.apiUrl);
    
    const result = await sendPasswordResetEmailAPI(email, resetLink, name);
    console.log('✅ Password reset email sent via backend API');
    return result;
  } catch (error: any) {
    console.error('❌ Password reset email failed:', error);
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
};

export const sendTransactionEmail = async (
  email: string, 
  transaction: any, 
  userType: 'payer' | 'participant'
) => {
  try {
    console.log('📧 Sending transaction notification to:', email);
    console.log('📧 Using API URL:', EMAIL_CONFIG.apiUrl);
    
    const emailData = {
      to: email,
      subject: `💰 ${userType === 'payer' ? 'Expense Added' : 'New Expense'} - ${transaction.title}`,
      html: `
        <h2>Transaction Notification</h2>
        <p><strong>Transaction:</strong> ${transaction.title}</p>
        <p><strong>Amount:</strong> Rs ${transaction.amount}</p>
        <p><strong>Type:</strong> ${userType === 'payer' ? 'You paid this amount' : 'You are part of this expense'}</p>
        <p><strong>Group:</strong> ${transaction.groupName}</p>
      `
    };
    
    const result = await sendEmailWithAPI(emailData);
    console.log('✅ Transaction email sent via backend API');
    return result;
  } catch (error: any) {
    console.error('❌ Transaction email failed:', error);
    throw new Error(`Failed to send transaction email: ${error.message}`);
  }
};

// Legacy function exports for backward compatibility
export { sendEmailWithAPI as sendEmailAPI };
export { sendVerificationEmailAPI };
export { sendVerificationEmailNewAPI };
export { sendPasswordResetEmailAPI };
export { sendWelcomeEmailAPI };
export { sendTransactionAlertAPI };