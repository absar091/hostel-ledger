const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const webpush = require('web-push');
require('dotenv').config();

// Initialize Firebase Admin SDK using environment variables
try {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID || "hostel-ledger",
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    universe_domain: "googleapis.com"
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL || "https://hostel-ledger-default-rtdb.firebaseio.com"
  });
  
  console.log('✅ Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('❌ Firebase Admin SDK initialization failed:', error.message);
  console.warn('⚠️ Email existence check will not work without Firebase Admin SDK');
}

// Configure Web Push with VAPID keys
// Updated: 2026-01-22 - Added FCM_SERVER_KEY support
try {
  webpush.setVapidDetails(
    'mailto:hostelledger@aarx.online',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  console.log('✅ Web Push configured with VAPID keys');
  
  // For FCM endpoints, we also need to set GCM API key
  // FCM uses the Firebase Server Key for authorization
  if (process.env.FCM_SERVER_KEY) {
    webpush.setGCMAPIKey(process.env.FCM_SERVER_KEY);
    console.log('✅ FCM Server Key configured');
  } else {
    console.warn('⚠️ FCM_SERVER_KEY not set - FCM push notifications may fail');
  }
} catch (error) {
  console.error('❌ Web Push configuration failed:', error.message);
  console.warn('⚠️ Push notifications will not work without VAPID keys');
}

const app = express();

// Trust proxy for Vercel deployment
app.set('trust proxy', 1);

// Middleware - More permissive CORS for debugging
app.use(cors({
  origin: true, // Allow all origins during debugging
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control']
}));

// Handle preflight requests explicitly
app.options('*', cors());

app.use(express.json());

// Rate limiting for email endpoints - very generous limits for testing
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs (increased from 50)
  message: {
    success: false,
    error: 'Too many email requests, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// General rate limiter for API endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs (increased from 100)
  message: {
    success: false,
    error: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper function to load and process email templates
const loadEmailTemplate = (templateName, variables = {}) => {
  try {
    const templatePath = path.join(__dirname, 'email-templates', `${templateName}.html`);
    let template = fs.readFileSync(templatePath, 'utf8');
    
    // Replace variables in template
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      template = template.replace(regex, variables[key]);
    });
    
    return template;
  } catch (error) {
    console.error(`❌ Error loading template ${templateName}:`, error);
    return null;
  }
};
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: true, // true for 465 (SSL), false for 587 (TLS)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: true
  }
});

// Verify email configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email configuration error:', error);
  } else {
    console.log('✅ Email server is ready to send messages');
    console.log('📧 SMTP User:', process.env.SMTP_USER);
  }
});

// Root endpoint
app.get('/', (req, res) => {
  console.log('📍 Root endpoint accessed from:', req.get('origin') || 'direct');
  res.json({ 
    success: true, 
    message: 'Hostel Ledger Email API',
    version: '3.0.0-push-active',
    endpoints: {
      health: '/health',
      sendEmail: '/api/send-email',
      sendVerification: '/api/send-verification',
      sendPasswordReset: '/api/send-password-reset',
      sendWelcome: '/api/send-welcome',
      sendTransactionAlert: '/api/send-transaction-alert',
      pushSubscribe: '/api/push-subscribe',
      pushNotify: '/api/push-notify',
      pushNotifyMultiple: '/api/push-notify-multiple',
      pushTest: '/api/push-test'
    },
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check endpoint (no rate limiting)
app.get('/health', (req, res) => {
  console.log('🏥 Health check accessed from:', req.get('origin') || 'direct');
  res.json({ 
    success: true, 
    message: 'Hostel Ledger Email API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '3.0.0-push-active', // Updated version to verify new deployment
    pushEndpointsActive: true,
    deployedAt: '2026-01-22T12:00:00Z'
  });
});

// Test endpoint to verify push routes are loaded
app.get('/api/push-test', (req, res) => {
  res.json({
    success: true,
    message: 'Push notification routes are active!',
    availableEndpoints: [
      'POST /api/push-subscribe',
      'POST /api/push-notify',
      'POST /api/push-notify-multiple',
      'GET /api/push-subscription/:userId',
      'DELETE /api/push-unsubscribe/:userId'
    ]
  });
});

// Apply general rate limiting to API endpoints only
app.use('/api', generalLimiter);

// Generic email sending endpoint
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
      from: process.env.EMAIL_FROM,
      to: to,
      subject: subject,
      html: html,
      text: text || ''
    };

    console.log('📧 Sending email to:', to);
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);

    res.json({
      success: true,
      messageId: result.messageId
    });

  } catch (error) {
    console.error('❌ Email sending error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email: ' + error.message
    });
  }
});

// Verification email endpoint
app.post('/api/send-verification', emailLimiter, async (req, res) => {
  try {
    const { email, code, name } = req.body;

    if (!email || !code || !name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, code, name'
      });
    }

    const html = `
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
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: ' Verify Your Hostel Ledger Account',
      html: html,
      text: `Hi ${name}!\n\nYour verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nBest regards,\nHostel Ledger Team`
    };

    console.log('📧 Sending verification email to:', email);
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent:', result.messageId);

    res.json({
      success: true,
      messageId: result.messageId
    });

  } catch (error) {
    console.error('❌ Verification email error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send verification email: ' + error.message
    });
  }
});

// Password reset email endpoint
app.post('/api/send-password-reset', emailLimiter, async (req, res) => {
  try {
    const { email, resetLink, name } = req.body;

    if (!email || !resetLink || !name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, resetLink, name'
      });
    }

    const html = `
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
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: '🔑 Reset Your Hostel Ledger Password',
      html: html,
      text: `Hi ${name}!\n\nClick the link below to reset your password:\n${resetLink}\n\nThis link expires in 1 hour.\n\nBest regards,\nHostel Ledger Team`
    };

    console.log('📧 Sending password reset email to:', email);
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent:', result.messageId);

    res.json({
      success: true,
      messageId: result.messageId
    });

  } catch (error) {
    console.error('❌ Password reset email error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send password reset email: ' + error.message
    });
  }
});

// Welcome email endpoint
app.post('/api/send-welcome', emailLimiter, async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, name'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address'
      });
    }

    // Load and process welcome template
    const html = loadEmailTemplate('welcome', {
      USER_NAME: name
    });

    if (!html) {
      return res.status(500).json({
        success: false,
        error: 'Failed to load email template'
      });
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: '🎉 Welcome to Hostel Ledger!',
      html: html,
      text: `Welcome to Hostel Ledger, ${name}!\n\nYour account has been successfully created and verified.\n\nYou can now start tracking shared expenses, settling balances, and managing hostel finances with ease.\n\nBest regards,\nHostel Ledger Team`
    };

    console.log('📧 Sending welcome email to:', email);
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent:', result.messageId);

    res.json({
      success: true,
      messageId: result.messageId
    });

  } catch (error) {
    console.error('❌ Welcome email error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send welcome email: ' + error.message
    });
  }
});

// Transaction alert email endpoint
app.post('/api/send-transaction-alert', emailLimiter, async (req, res) => {
  try {
    const { email, name, transactionType, amount, groupName, date, description } = req.body;

    if (!email || !name || !transactionType || !amount || !groupName || !date || !description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, name, transactionType, amount, groupName, date, description'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address'
      });
    }

    // Load and process transaction alert template
    const html = loadEmailTemplate('transaction-alert', {
      USER_NAME: name,
      TRANSACTION_TYPE: transactionType,
      AMOUNT: amount,
      GROUP_NAME: groupName,
      DATE: date,
      DESCRIPTION: description
    });

    if (!html) {
      return res.status(500).json({
        success: false,
        error: 'Failed to load email template'
      });
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Transaction Alert - ${transactionType} in ${groupName}`,
      html: html,
      text: `Transaction Alert\n\nHello ${name},\n\nA new transaction has been recorded on your Hostel Ledger account.\n\nType: ${transactionType}\nAmount: ${amount}\nGroup: ${groupName}\nDate: ${date}\nDescription: ${description}\n\nBest regards,\nHostel Ledger Team`
    };

    console.log('📧 Sending transaction alert email to:', email);
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Transaction alert email sent:', result.messageId);

    res.json({
      success: true,
      messageId: result.messageId
    });

  } catch (error) {
    console.error('❌ Transaction alert email error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send transaction alert email: ' + error.message
    });
  }
});

// Update verification email endpoint to use new template
app.post('/api/send-verification-new', emailLimiter, async (req, res) => {
  try {
    const { email, code, name } = req.body;

    if (!email || !code || !name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, code, name'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address'
      });
    }

    // Load and process verification template
    const html = loadEmailTemplate('verification', {
      USER_NAME: name,
      CODE: code
    });

    if (!html) {
      return res.status(500).json({
        success: false,
        error: 'Failed to load email template'
      });
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: '🔐 Verify Your Hostel Ledger Account',
      html: html,
      text: `Hi ${name}!\n\nYour verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nBest regards,\nHostel Ledger Team`
    };

    console.log('📧 Sending verification email to:', email);
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent:', result.messageId);

    res.json({
      success: true,
      messageId: result.messageId
    });

  } catch (error) {
    console.error('❌ Verification email error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send verification email: ' + error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Email existence check endpoint
app.post('/api/check-email-exists', generalLimiter, async (req, res) => {
  console.log('🔍 Email existence check requested from:', req.get('origin') || 'direct');
  
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }
    
    console.log('📧 Checking email existence for:', email);
    
    try {
      // Check Firebase Auth first
      let existsInAuth = false;
      try {
        const userRecord = await admin.auth().getUserByEmail(email);
        if (userRecord) {
          console.log('❌ Email exists in Firebase Auth:', email);
          existsInAuth = true;
        }
      } catch (authError) {
        if (authError.code === 'auth/user-not-found') {
          console.log('✅ Email not found in Firebase Auth:', email);
        } else {
          console.warn('⚠️ Firebase Auth check error:', authError.message);
        }
      }
      
      // Check Realtime Database
      let existsInDatabase = false;
      try {
        const usersRef = admin.database().ref('users');
        const snapshot = await usersRef.once('value');
        
        if (snapshot.exists()) {
          const users = snapshot.val();
          console.log('📊 Found', Object.keys(users).length, 'users in database');
          
          // Search through all users to find matching email
          for (const uid in users) {
            if (users[uid].email === email) {
              console.log('❌ Email exists in database:', email);
              console.log('👤 User details:', {
                uid,
                name: users[uid].name,
                email: users[uid].email,
                createdAt: users[uid].createdAt
              });
              existsInDatabase = true;
              break;
            }
          }
        } else {
          console.log('📭 No users found in database');
        }
      } catch (dbError) {
        console.error('❌ Database check error:', dbError.message);
      }
      
      const exists = existsInAuth || existsInDatabase;
      
      console.log(`📊 Email existence result for ${email}:`, {
        existsInAuth,
        existsInDatabase,
        finalResult: exists
      });
      
      res.json({
        success: true,
        exists: exists,
        message: exists ? 'Email already exists' : 'Email is available'
      });
      
    } catch (error) {
      console.error('❌ Email existence check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check email existence'
      });
    }
    
  } catch (error) {
    console.error('❌ Email existence check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check email existence'
    });
  }
});

// ============================================
// PUSH NOTIFICATION ENDPOINTS
// Last updated: 2026-01-22 - Force rebuild v3 - Cache bust
// CRITICAL: These endpoints MUST be before the 404 handler
// Using Firebase Realtime Database for subscription storage
// ============================================

// Subscribe to push notifications
app.post('/api/push-subscribe', generalLimiter, async (req, res) => {
  try {
    const { userId, subscription, fcmToken } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: userId'
      });
    }

    // Support both old subscription format and new FCM token format
    let tokenToStore;
    
    if (fcmToken) {
      // New format: direct FCM token
      tokenToStore = fcmToken;
      console.log('🔔 Storing FCM token for user:', userId);
      console.log('📝 Token length:', fcmToken.length);
    } else if (subscription && subscription.endpoint) {
      // Old format: subscription object with endpoint
      // For now, store the whole subscription object
      console.log('🔔 Storing push subscription for user:', userId);
      await admin.database().ref(`pushSubscriptions/${userId}`).set({
        subscription: subscription,
        updatedAt: new Date().toISOString()
      });
      
      return res.json({
        success: true,
        message: 'Push subscription stored successfully'
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Missing fcmToken or subscription'
      });
    }

    // Store FCM token in Firebase Realtime Database
    const subscriptionsRef = admin.database().ref(`pushSubscriptions/${userId}`);
    await subscriptionsRef.set({
      fcmToken: tokenToStore,
      updatedAt: new Date().toISOString()
    });

    console.log('✅ FCM token stored successfully in Firebase');

    res.json({
      success: true,
      message: 'FCM token stored successfully'
    });

  } catch (error) {
    console.error('❌ Push subscribe error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to store push subscription: ' + error.message
    });
  }
});

// Send push notification to a specific user
app.post('/api/push-notify', generalLimiter, async (req, res) => {
  try {
    const { userId, title, body, icon, badge, tag, data } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, title, body'
      });
    }

    console.log('🔔 Sending push notification to user:', userId);

    // Get subscription from Firebase Realtime Database
    const subscriptionsRef = admin.database().ref(`pushSubscriptions/${userId}`);
    const snapshot = await subscriptionsRef.once('value');
    const subscriptionData = snapshot.val();
    
    if (!subscriptionData) {
      console.warn('⚠️ No push subscription found for user:', userId);
      return res.status(404).json({
        success: false,
        error: 'No push subscription found for this user'
      });
    }

    // Check if we have FCM token or subscription object
    if (subscriptionData.fcmToken) {
      // Use Firebase Admin SDK
      const message = {
        token: subscriptionData.fcmToken,
        notification: {
          title: title,
          body: body,
        },
        data: data ? Object.fromEntries(
          Object.entries(data).map(([key, value]) => [key, String(value)])
        ) : {},
        webpush: {
          notification: {
            icon: icon || '/only-logo.png',
            badge: badge || '/only-logo.png',
            tag: tag || 'default',
          }
        }
      };

      const response = await admin.messaging().send(message);
      console.log('✅ Push notification sent via FCM');
      
      return res.json({
        success: true,
        message: 'Push notification sent successfully',
        messageId: response
      });
    } else if (subscriptionData.subscription) {
      // Use web-push library
      const payload = JSON.stringify({
        title: title,
        body: body,
        icon: icon || '/only-logo.png',
        badge: badge || '/only-logo.png',
        tag: tag || 'default',
        data: data || {}
      });

      await webpush.sendNotification(subscriptionData.subscription, payload);
      console.log('✅ Push notification sent via web-push');
      
      return res.json({
        success: true,
        message: 'Push notification sent successfully'
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid subscription data'
      });
    }

  } catch (error) {
    console.error('❌ Push notify error:', error);
    
    // Handle invalid or expired tokens
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      console.warn('⚠️ Token expired or invalid, removing from Firebase');
      const { userId } = req.body;
      if (userId) {
        await admin.database().ref(`pushSubscriptions/${userId}`).remove();
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to send push notification: ' + error.message,
      code: error.code
    });
  }
});

// Send push notification to multiple users
app.post('/api/push-notify-multiple', generalLimiter, async (req, res) => {
  try {
    const { userIds, title, body, icon, badge, tag, data } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'userIds must be a non-empty array'
      });
    }

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, body'
      });
    }

    console.log('🔔 Sending push notifications to', userIds.length, 'users');

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    // Send to all users
    for (const userId of userIds) {
      try {
        // Get subscription from Firebase
        const subscriptionsRef = admin.database().ref(`pushSubscriptions/${userId}`);
        const snapshot = await subscriptionsRef.once('value');
        const subscriptionData = snapshot.val();
        
        if (!subscriptionData) {
          console.warn('⚠️ No subscription for user:', userId);
          results.failed++;
          results.errors.push({ userId, error: 'No subscription found' });
          continue;
        }

        // Check if we have FCM token or subscription object
        if (subscriptionData.fcmToken) {
          // Use Firebase Admin SDK
          const message = {
            token: subscriptionData.fcmToken,
            notification: {
              title: title,
              body: body,
            },
            data: data ? Object.fromEntries(
              Object.entries(data).map(([key, value]) => [key, String(value)])
            ) : {},
            webpush: {
              notification: {
                icon: icon || '/only-logo.png',
                badge: badge || '/only-logo.png',
                tag: tag || 'default',
              }
            }
          };

          await admin.messaging().send(message);
        } else if (subscriptionData.subscription) {
          // Use web-push library
          const payload = JSON.stringify({
            title: title,
            body: body,
            icon: icon || '/only-logo.png',
            badge: badge || '/only-logo.png',
            tag: tag || 'default',
            data: data || {}
          });

          await webpush.sendNotification(subscriptionData.subscription, payload);
        } else {
          throw new Error('Invalid subscription data');
        }

        results.success++;
        console.log('✅ Notification sent to:', userId);

      } catch (error) {
        console.error('❌ Failed to send to user:', userId, error.message);
        results.failed++;
        results.errors.push({ userId, error: error.message });

        // Remove expired tokens
        if (error.code === 'messaging/invalid-registration-token' || 
            error.code === 'messaging/registration-token-not-registered') {
          await admin.database().ref(`pushSubscriptions/${userId}`).remove();
        }
      }
    }

    console.log('📊 Notification results:', results);

    res.json({
      success: true,
      message: `Sent ${results.success} notifications, ${results.failed} failed`,
      results: results
    });

  } catch (error) {
    console.error('❌ Push notify multiple error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send push notifications: ' + error.message
    });
  }
});

// Get subscription status for a user
app.get('/api/push-subscription/:userId', generalLimiter, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const subscriptionsRef = admin.database().ref(`pushSubscriptions/${userId}`);
    const snapshot = await subscriptionsRef.once('value');
    const subscriptionData = snapshot.val();
    
    res.json({
      success: true,
      hasSubscription: !!subscriptionData,
      hasFcmToken: !!(subscriptionData && subscriptionData.fcmToken)
    });

  } catch (error) {
    console.error('❌ Get subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get subscription status: ' + error.message
    });
  }
});

// Unsubscribe from push notifications
app.delete('/api/push-unsubscribe/:userId', generalLimiter, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    console.log('🔕 Removing push subscription for user:', userId);

    const subscriptionsRef = admin.database().ref(`pushSubscriptions/${userId}`);
    const snapshot = await subscriptionsRef.once('value');
    const existed = snapshot.exists();
    
    await subscriptionsRef.remove();

    console.log('✅ Push subscription removed from Firebase');

    res.json({
      success: true,
      message: existed ? 'Subscription removed' : 'No subscription found'
    });

  } catch (error) {
    console.error('❌ Push unsubscribe error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove subscription: ' + error.message
    });
  }
});

// 404 handler - MUST BE LAST
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Hostel Ledger Email API server running on port ${PORT}`);
  console.log(`📧 SMTP configured for: ${process.env.SMTP_USER}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
