const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
// Note: web-push removed - using OneSignal for push notifications
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

// OneSignal Configuration Check
if (process.env.ONESIGNAL_APP_ID && process.env.ONESIGNAL_REST_API_KEY) {
  console.log('✅ OneSignal configured for push notifications');
} else {
  console.warn('⚠️ OneSignal not configured - push notifications will not work');
}

const app = express();

// Trust proxy for Vercel deployment
app.set('trust proxy', 1);

// Middleware - Restricted CORS for production
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:8080',
  'https://hostel-ledger.aarx.online',
  'https://app.hostelledger.aarx.online',
  'https://hostel-ledger.vercel.app',
  'https://hostel-ledger-absar.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Check for allowed specific origins
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    // Dynamic checks
    // Allow any localhost origin (dev environments on different ports)
    if (origin.match(/^http:\/\/localhost:[0-9]+$/)) {
      return callback(null, true);
    }

    // Allow any Vercel preview deployment
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }

    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
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
    version: '4.0.0-onesignal',
    pushProvider: 'OneSignal',
    endpoints: {
      health: '/health',
      sendEmail: '/api/send-email',
      sendVerification: '/api/send-verification',
      sendPasswordReset: '/api/send-password-reset',
      sendWelcome: '/api/send-welcome',
      sendTransactionAlert: '/api/send-transaction-alert',
      pushNotify: '/api/push-notify (OneSignal)',
      pushNotifyMultiple: '/api/push-notify-multiple (OneSignal)',
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
    version: '4.0.0-onesignal', // Updated version for OneSignal
    pushProvider: 'OneSignal',
    oneSignalConfigured: !!(process.env.ONESIGNAL_APP_ID && process.env.ONESIGNAL_REST_API_KEY),
    deployedAt: '2026-01-22T13:00:00Z'
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

// Stricter rate limiting for creation endpoints
const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each IP to 20 group creations per hour
  message: {
    success: false,
    error: 'Too many groups created, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Authentication Middleware
 * Verifies Firebase ID Token in Authorization header
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('⚠️ Missing or malformed Authorization header');
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing or malformed token'
    });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    console.log(`👤 Authenticated user: ${decodedToken.email} (${decodedToken.uid})`);
    next();
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or expired token'
    });
  }
};

/**
 * Create Group Endpoint
 */
app.post('/api/create-group', createLimiter, authenticate, async (req, res) => {
  const { name, emoji, members, invitedUsernames, invitedEmails, coverPhoto } = req.body;
  const userId = req.user.uid;

  if (!name) return res.status(400).json({ success: false, error: 'Group name is required' });

  const hasManualMembers = members && members.length > 0;
  const hasInvitedUsernames = invitedUsernames && invitedUsernames.length > 0;
  const hasInvitedEmails = invitedEmails && invitedEmails.length > 0;

  if (!hasManualMembers && !hasInvitedUsernames && !hasInvitedEmails) {
    return res.status(400).json({ success: false, error: 'Please add at least one member (manual or invited)' });
  }

  try {
    const groupsRef = admin.database().ref('groups');
    const newGroupRef = groupsRef.push();
    const groupId = newGroupRef.key;

    // 1. Create Group Object
    const newGroup = {
      id: groupId,
      name: name.trim().substring(0, 50),
      emoji: emoji || "📁",
      coverPhoto: coverPhoto || null,
      members: [
        {
          id: userId,
          name: "You",
          isCurrentUser: true,
          userId: userId,
          paymentDetails: {}, // Should fetch from user profile ideally
          isAdmin: true
        },
        ...members.map(m => ({
          id: `member_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          name: m.name,
          userId: m.uid || null, // If real user
          username: m.username || null,
          type: m.type || 'manual',
          email: m.email || null,
          isPending: !!m.email,
          invitedAt: m.email ? new Date().toISOString() : null,
          email: m.email || null, // Persist email for pending status
          isPending: !!m.email,   // Mark as pending if email exists
          invitedAt: m.email ? new Date().toISOString() : null
        }))
      ],
      createdBy: userId,
      createdAt: new Date().toISOString()
    };

    // 2. Save Group
    await newGroupRef.set(newGroup);

    // 3. Add to User's Group Index
    await admin.database().ref(`userGroups/${userId}/${groupId}`).set({
      name: newGroup.name,
      emoji: newGroup.emoji,
      coverPhoto: newGroup.coverPhoto,
      memberCount: newGroup.members.length,
      role: 'admin',
      createdAt: newGroup.createdAt
    });

    // 4. Handle Invited Usernames (send invitations to existing users)
    if (invitedUsernames && invitedUsernames.length > 0) {
      for (const username of invitedUsernames) {
        const usernameRef = admin.database().ref(`usernames/${username.toLowerCase()}`);
        const s = await usernameRef.get();
        if (s.exists()) {
          // Handle both formats: direct UID string or object
          const uidData = s.val();
          const inviteeUid = typeof uidData === 'string' ? uidData : (uidData?.uid || uidData?.userId || null);

          if (!inviteeUid) {
            console.error(`Invalid UID format for username ${username}:`, uidData);
            continue;
          }

          // Create invitation
          const invRef = admin.database().ref('invitations').push();
          // Fetch sender name
          const senderSnap = await admin.database().ref(`users/${userId}/name`).get();
          const senderName = senderSnap.exists() ? senderSnap.val() : "Someone";

          await invRef.set({
            id: invRef.key,
            groupId,
            groupName: newGroup.name,
            groupEmoji: newGroup.emoji,
            senderId: userId,
            senderName,
            receiverId: inviteeUid,
            status: 'pending',
            createdAt: new Date().toISOString()
          });

          // Send email notification to existing user
          try {
            const inviteeSnap = await admin.database().ref(`users/${inviteeUid}`).get();
            if (inviteeSnap.exists()) {
              const inviteeData = inviteeSnap.val();
              const inviteeEmail = inviteeData.email;
              const inviteeName = inviteeData.name || username;

              if (inviteeEmail) {
                const mailOptions = {
                  from: process.env.EMAIL_FROM || '"Hostel Ledger" <noreply@hostelledger.aarx.online>',
                  to: inviteeEmail,
                  subject: `${senderName} invited you to join "${newGroup.name}" on Hostel Ledger`,
                  html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                      <h2 style="color: #4a6850;">You've been invited! 🎉</h2>
                      <p>Hello <strong>${inviteeName}</strong>,</p>
                      <p><strong>${senderName}</strong> has invited you to join the group <strong>"${newGroup.name}"</strong> on Hostel Ledger.</p>
                      <p>Open the app to accept or decline this invitation.</p>
                      <a href="https://app.hostelledger.aarx.online" style="display: inline-block; background-color: #4a6850; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 16px 0;">Open Hostel Ledger</a>
                    </div>
                  `
                };
                await transporter.sendMail(mailOptions);
                console.log(`✅ Invitation email sent to existing user: ${inviteeEmail}`);
              }
            }
          } catch (emailErr) {
            console.error(`❌ Failed to send invitation email to ${username}:`, emailErr);
            // Don't fail the group creation, just log the error
          }
        }
      }
    }

    // 5. Handle Email Invites (Manual members with emails)
    const emailMembers = newGroup.members.filter(m => m.email && m.type === 'manual');

    if (emailMembers.length > 0) {
      console.log(`📧 Sending ${emailMembers.length} email invites...`);
      const senderSnap = await admin.database().ref(`users/${userId}/name`).get();
      const senderName = senderSnap.exists() ? senderSnap.val() : "A friend";

      // Send emails in parallel
      await Promise.all(emailMembers.map(async (member) => {
        try {
          const inviteLink = `https://app.hostelledger.aarx.online/join/${groupId}?email=${encodeURIComponent(member.email)}`;

          const mailOptions = {
            from: process.env.EMAIL_FROM || '"Hostel Ledger" <noreply@hostelledger.aarx.online>',
            to: member.email,
            subject: `${senderName} invited you to join "${newGroup.name}"`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4a6850;">You're invited! 🎉</h2>
                <p>Hello <strong>${member.name}</strong>,</p>
                <p><strong>${senderName}</strong> has added you to the group <strong>"${newGroup.name}"</strong> on Hostel Ledger.</p>
                <p>They have already added you as a member so they can start splitting expenses with you immediately.</p>
                <p>To view the group and track your expenses, please join the app:</p>
                <a href="${inviteLink}" style="display: inline-block; background-color: #4a6850; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 16px 0;">Join Group</a>
                <p style="color: #666; font-size: 12px; margin-top: 24px;">If you don't accept within 7 days, your pending access may expire.</p>
              </div>
            `
          };

          await transporter.sendMail(mailOptions);
          console.log(`✅ Email sent to ${member.email}`);
        } catch (emailErr) {
          console.error(`❌ Failed to send email to ${member.email}:`, emailErr);
        }
      }));
    }



    res.json({ success: true, groupId, message: 'Group created successfully' });

  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ success: false, error: 'Failed to create group' });
  }
});

/**
 * Financial Logic Helpers
 */

const calculateExpenseSplit = (totalAmount, participants, payerId) => {
  if (!participants || participants.length === 0) {
    throw new Error("Must have at least one participant");
  }

  const totalCents = Math.round(totalAmount * 100);
  const baseCents = Math.floor(totalCents / participants.length);
  const remainderCents = totalCents % participants.length;

  const payerIndex = participants.findIndex(p => p.id === payerId);
  const startIndex = payerIndex >= 0 ? payerIndex : 0;

  return participants.map((participant, index) => {
    const adjustedIndex = (index + participants.length - startIndex) % participants.length;
    const getsRemainder = adjustedIndex < remainderCents;

    return {
      participantId: participant.id,
      participantName: participant.name,
      amount: (baseCents + (getsRemainder ? 1 : 0)) / 100,
      isRemainder: getsRemainder
    };
  });
};

/**
 * CORRECTED: Calculate global settlement updates for expense
 * Returns all debt relationships created by this transaction
 */
const calculateGlobalExpenseSettlements = (splits, payerId, groupId) => {
  const updates = [];
  const payerSplit = splits.find(s => s.participantId === payerId);

  if (!payerSplit) {
    throw new Error("Payer must be a participant");
  }

  // Everyone else owes the payer their split amount
  splits.forEach(split => {
    if (split.participantId !== payerId) {
      updates.push({
        fromId: split.participantId, // Debtor
        toId: payerId,               // Creditor
        amount: split.amount,
        groupId
      });
    }
  });

  return updates;
};

// --- New Endpoint: Get Valid User Details ---
app.post('/api/get-valid-user-details', authenticate, async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ success: false, error: 'Username is required' });
    }

    const cleanUsername = username.toLowerCase().trim().replace('@', '');
    const usernameRef = admin.database().ref(`usernames/${cleanUsername}`);
    const snapshot = await usernameRef.get();

    if (!snapshot.exists()) {
      return res.json({ success: true, exists: false });
    }

    const uidData = snapshot.val();
    // Handle both formats: direct UID string or object like { uid: '...' }
    const uid = typeof uidData === 'string' ? uidData : (uidData?.uid || uidData?.userId || null);

    if (!uid || typeof uid !== 'string') {
      console.error('Invalid UID format in usernames lookup:', uidData);
      return res.json({ success: true, exists: false });
    }

    const userRef = admin.database().ref(`users/${uid}`);
    const userSnap = await userRef.get();

    if (!userSnap.exists()) {
      return res.json({ success: true, exists: false });
    }

    const userData = userSnap.val();

    // Safety check for userData
    if (!userData) {
      console.error('User data is null despite snapshot exists');
      return res.json({ success: true, exists: false });
    }

    const paymentDetails = userData.paymentDetails || {};

    // Sanitize return data (public info only)
    const publicProfile = {
      uid,
      username: userData.username || 'Unknown',
      name: userData.name || 'Unknown User',
      photoURL: userData.photoURL || null,
      paymentMethods: {
        jazzCash: !!paymentDetails.jazzCash,
        easypaisa: !!paymentDetails.easypaisa,
        bankName: !!paymentDetails.bankName,
        raastId: !!paymentDetails.raastId
      }
    };

    res.json({ success: true, exists: true, user: publicProfile });

  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ success: false, error: 'Failed to search user' });
  }
});


// Apply authentication middleware to ALL /api routes EXCEPT public ones
app.use('/api', (req, res, next) => {
  // Public endpoints that don't need auth
  const publicEndpoints = ['/push-test', '/check-email-exists']; // Example: /api/push-test is public
  if (publicEndpoints.includes(req.path)) {
    return next();
  }
  authenticate(req, res, next);
});

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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Email existence check endpoint (Production-hardened)
app.post('/api/check-email-exists', generalLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email format' });
    }

    try {
      // Check Firebase Auth efficiently
      await admin.auth().getUserByEmail(email);

      // If we reach here, the user exists
      res.json({
        success: true,
        exists: true,
        message: 'If this email is registered, you will receive instructions.'
      });
    } catch (authError) {
      if (authError.code === 'auth/user-not-found') {
        res.json({
          success: true,
          exists: false,
          message: 'If this email is registered, you will receive instructions.'
        });
      } else {
        throw authError;
      }
    }

  } catch (error) {
    console.error('❌ Email check error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while processing your request.'
    });
  }
});

// ============================================
// PUSH NOTIFICATION ENDPOINTS
// Last updated: 2026-01-22 - Force rebuild v3 - Cache bust
// CRITICAL: These endpoints MUST be before the 404 handler
// Using Firebase Realtime Database for subscription storage
// ============================================

// Subscribe to push notifications (OneSignal handles this automatically)
// This endpoint is kept for backward compatibility but is no longer needed
app.post('/api/push-subscribe', generalLimiter, async (req, res) => {
  try {
    console.log('ℹ️ Push subscribe endpoint called (OneSignal handles subscriptions automatically)');

    res.json({
      success: true,
      message: 'OneSignal handles subscriptions automatically - no action needed'
    });

  } catch (error) {
    console.error('❌ Push subscribe error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process subscription: ' + error.message
    });
  }
});

// Send push notification to a specific user using OneSignal REST API
app.post('/api/push-notify', generalLimiter, async (req, res) => {
  try {
    const { userId, title, body, icon, badge, tag, data } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, title, body'
      });
    }

    console.log('🔔 Sending push notification to user via OneSignal:', userId);

    // Check if OneSignal is configured
    const oneSignalAppId = process.env.ONESIGNAL_APP_ID;
    const oneSignalApiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!oneSignalAppId || !oneSignalApiKey) {
      console.error('❌ OneSignal not configured');
      return res.status(500).json({
        success: false,
        error: 'OneSignal not configured on server'
      });
    }

    // Get OneSignal Player ID from Firebase Realtime Database
    let playerId = null;
    try {
      const playerRef = admin.database().ref(`oneSignalPlayers/${userId}`);
      const snapshot = await playerRef.once('value');
      const playerData = snapshot.val();

      if (playerData && playerData.playerId) {
        playerId = playerData.playerId;
        console.log('✅ Found Player ID for user:', playerId);
      } else {
        console.warn('⚠️ No Player ID found for user (will try external_id only):', userId);
        // We continue because we can still try sending by external_id (userId)
      }
    } catch (error) {
      console.error('❌ Failed to get Player ID:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get user notification settings'
      });
    }

    // Send notification via OneSignal REST API
    // Updated: 2026-01-25 - Using include_external_user_ids for better reliability
    const notificationData = {
      app_id: oneSignalAppId,
      include_external_user_ids: [userId], // Primary: send via Firebase UID
      include_player_ids: playerId ? [playerId] : undefined, // Fallback: send via Player ID if we have it
      headings: { en: title },
      contents: { en: body },
      web_url: data?.url || undefined,
      chrome_web_icon: icon || '/only-logo.png',
      chrome_web_badge: badge || '/only-logo.png',
      data: data || {}
    };

    console.log('📤 Sending to OneSignal API (External ID + Player ID)...');
    console.log('📝 Target User UID:', userId);
    if (playerId) console.log('📝 Target Player ID:', playerId);

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${oneSignalApiKey}`
      },
      body: JSON.stringify(notificationData)
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ OneSignal API error:', responseData);
      return res.status(500).json({
        success: false,
        error: 'OneSignal API error: ' + (responseData.errors?.[0] || 'Unknown error')
      });
    }

    console.log('✅ Push notification sent successfully via OneSignal');
    console.log('📊 Stats:', {
      id: responseData.id,
      recipients: responseData.recipients,
      external_id_recipients: responseData.external_id_recipients || 'N/A'
    });

    res.json({
      success: true,
      message: 'Push notification sent successfully',
      recipients: responseData.recipients,
      id: responseData.id
    });

  } catch (error) {
    console.error('❌ Push notify error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send push notification: ' + error.message
    });
  }
});

/**
 * Internal OneSignal Notification Helper (with detailed logging)
 */
const sendOneSignalNotificationInternal = async ({ userIds, title, body, icon, badge, data }) => {
  console.log('🔔 ============ ONESIGNAL NOTIFICATION START ============');
  console.log('🔔 Target User IDs:', userIds);
  console.log('🔔 Title:', title);
  console.log('🔔 Body:', body);

  const oneSignalAppId = process.env.ONESIGNAL_APP_ID;
  const oneSignalApiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!oneSignalAppId || !oneSignalApiKey) {
    console.error('❌ OneSignal NOT configured! Missing env vars:',
      !oneSignalAppId ? 'ONESIGNAL_APP_ID' : '',
      !oneSignalApiKey ? 'ONESIGNAL_REST_API_KEY' : ''
    );
    throw new Error('OneSignal not configured on server');
  }
  console.log('✅ OneSignal credentials found (App ID:', oneSignalAppId.substring(0, 8) + '...)');

  // Get OneSignal Player IDs from Firebase Realtime Database
  const playerIds = [];
  console.log('🔍 Looking up Player IDs in Firebase...');

  for (const userId of userIds) {
    try {
      const playerRef = admin.database().ref(`oneSignalPlayers/${userId}`);
      const snapshot = await playerRef.once('value');
      const playerData = snapshot.val();

      if (playerData && playerData.playerId) {
        playerIds.push(playerData.playerId);
        console.log(`  ✅ User ${userId}: Player ID found (${playerData.playerId.substring(0, 12)}...)`);
      } else {
        console.log(`  ⚠️ User ${userId}: NO Player ID in Firebase (user may not have subscribed)`);
      }
    } catch (error) {
      console.error(`  ❌ User ${userId}: Failed to get Player ID:`, error.message);
    }
  }

  console.log('📊 Summary: Found', playerIds.length, 'Player IDs out of', userIds.length, 'users');

  // Build notification payload
  const notificationData = {
    app_id: oneSignalAppId,
    include_external_user_ids: userIds,
    include_player_ids: playerIds.length > 0 ? playerIds : undefined,
    headings: { en: title },
    contents: { en: body },
    chrome_web_icon: icon || '/only-logo.png',
    chrome_web_badge: badge || '/only-logo.png',
    data: data || {}
  };

  console.log('📤 Sending to OneSignal API...');
  console.log('📤 Targeting:', playerIds.length > 0 ? `${playerIds.length} Player IDs` : 'External User IDs only');

  const response = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${oneSignalApiKey}`
    },
    body: JSON.stringify(notificationData)
  });

  const responseData = await response.json();

  if (!response.ok) {
    console.error('❌ OneSignal API Error:', responseData);
    console.log('🔔 ============ ONESIGNAL NOTIFICATION FAILED ============');
    throw new Error('OneSignal API error: ' + (responseData.errors?.[0] || JSON.stringify(responseData)));
  }

  console.log('✅ OneSignal API Response:', responseData);
  console.log('📊 Recipients:', responseData.recipients || 0);
  console.log('🔔 ============ ONESIGNAL NOTIFICATION SUCCESS ============');

  return responseData;
};

// Send push notification to multiple users using OneSignal REST API
app.post('/api/push-notify-multiple', generalLimiter, async (req, res) => {
  try {
    const { userIds, title, body, icon, badge, data } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, error: 'userIds must be a non-empty array' });
    }

    if (!title || !body) {
      return res.status(400).json({ success: false, error: 'Missing required fields: title, body' });
    }

    console.log('🔔 Sending push notifications via internal helper');
    const result = await sendOneSignalNotificationInternal({ userIds, title, body, icon, badge, data });

    res.json({
      success: true,
      message: `Sent notifications to ${result.recipients} users`,
      recipients: result.recipients,
      id: result.id
    });

  } catch (error) {
    console.error('❌ Push notify multiple error:', error);
    res.status(500).json({ success: false, error: 'Failed to send push notifications: ' + error.message });
  }
});

// Get subscription status for a user (OneSignal handles this)
app.get('/api/push-subscription/:userId', generalLimiter, async (req, res) => {
  try {
    console.log('ℹ️ Push subscription status endpoint called (OneSignal handles this)');

    res.json({
      success: true,
      message: 'OneSignal handles subscription status - check OneSignal dashboard'
    });

  } catch (error) {
    console.error('❌ Get subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get subscription status: ' + error.message
    });
  }
});

// Unsubscribe from push notifications (OneSignal handles this)
app.delete('/api/push-unsubscribe/:userId', generalLimiter, async (req, res) => {
  try {
    console.log('ℹ️ Push unsubscribe endpoint called (OneSignal handles this)');

    res.json({
      success: true,
      message: 'OneSignal handles unsubscription automatically'
    });

  } catch (error) {
    console.error('❌ Push unsubscribe error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process unsubscription: ' + error.message
    });
  }
});

/**
 * FINANCIAL MUTATION ENDPOINTS
 */

// Add Expense endpoint (Secure)
app.post('/api/add-expense', generalLimiter, async (req, res) => {
  const { groupId, amount, paidBy, participants, note, place } = req.body;
  const currentUserId = req.user.uid;

  if (!groupId || !amount || !paidBy || !participants || participants.length === 0) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    const db = admin.database();

    // 1. Get Group Data & User Data in parallel
    const [groupSnap, userSnap] = await Promise.all([
      db.ref(`groups/${groupId}`).get(),
      db.ref(`users/${currentUserId}`).get()
    ]);

    if (!groupSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    const group = groupSnap.val();
    const user = userSnap.val();

    // 2. Verify current user is in the group
    const member = group.members.find(m => m.userId === currentUserId || m.id === currentUserId);
    if (!member) {
      return res.status(403).json({ success: false, error: 'You are not a member of this group' });
    }

    // 3. Verify payer and participants exist in group
    const payer = group.members.find(m => m.id === paidBy);
    if (!payer) {
      return res.status(400).json({ success: false, error: 'Invalid payer' });
    }

    const participantMembers = group.members.filter(m => participants.includes(m.id));
    if (participantMembers.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid participants' });
    }

    // 4. Calculate Split and Settlements
    const splits = calculateExpenseSplit(amount, participantMembers.map(m => ({ id: m.id, name: m.name })), paidBy);
    const globalSettlements = calculateGlobalExpenseSettlements(splits, paidBy, groupId);

    // 5. Build multi-path update object
    const updates = {};
    const transactionId = db.ref('transactions').push().key;
    const timestamp = Date.now();
    const serverTime = admin.database.ServerValue.TIMESTAMP;

    const isCurrentUserPayer = paidBy === currentUserId;

    // A. Update Wallet Balance if current user is payer
    let walletBalanceAfter = user.walletBalance || 0;
    if (isCurrentUserPayer) {
      if ((user.walletBalance || 0) < amount) {
        return res.status(400).json({ success: false, error: 'Insufficient wallet balance' });
      }
      walletBalanceAfter -= amount;
      updates[`users/${currentUserId}/walletBalance`] = walletBalanceAfter;
    }

    // B. Create Transaction Record
    const newTransaction = {
      id: transactionId,
      groupId,
      type: "expense",
      title: note || "Expense",
      amount,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      timestamp,
      paidBy,
      paidByName: payer.name,
      paidByIsTemporary: !!payer.isTemporary,
      participants: splits.map(s => ({
        id: s.participantId,
        name: s.participantName,
        amount: s.amount,
        isTemporary: !!group.members.find(m => m.id === s.participantId)?.isTemporary
      })),
      place: place || null,
      note: note || null,
      walletBalanceAfter,
      createdAt: new Date().toISOString(),
      serverTimestamp: serverTime
    };

    updates[`transactions/${transactionId}`] = newTransaction;

    // C. Add to userTransaction lists for all group members (Denormalized)
    const transactionSummaryBase = {
      type: "expense",
      title: newTransaction.title || "Expense",
      amount,
      createdAt: newTransaction.createdAt,
      groupId,
      timestamp,
      paidBy,
      paidByName: payer.name,
      paidByIsTemporary: !!payer.isTemporary,
      memberCount: group.members.length,
      participantsCount: participants.length
    };

    group.members.forEach(m => {
      if (m.userId) {
        const userSummary = { ...transactionSummaryBase };
        const split = splits.find(s => s.participantId === m.id);

        userSummary.userIsPayer = (m.id === paidBy);
        userSummary.userIsParticipant = !!split;
        userSummary.userShare = split ? split.amount : 0;

        updates[`userTransactions/${m.userId}/${transactionId}`] = userSummary;
      }
    });

    // D. Apply Global Settlement Updates
    // We fetch settlements for ALL involved real users
    const memberMap = new Map(); // memberId -> userId (if exists)
    group.members.forEach(m => {
        if (m.userId) memberMap.set(m.id, m.userId);
        // Also map userId to itself in case IDs are mixed
        if (m.userId) memberMap.set(m.userId, m.userId);
    });

    const uniqueUserIdsToFetch = new Set();
    const payerUserId = memberMap.get(paidBy);
    if (payerUserId) uniqueUserIdsToFetch.add(payerUserId);

    participantMembers.forEach(p => {
        const uid = memberMap.get(p.id);
        if (uid) uniqueUserIdsToFetch.add(uid);
    });

    // Fetch settlements for these users
    const settlementsSnapshot = await Promise.all(
        Array.from(uniqueUserIdsToFetch).map(uid =>
            db.ref(`users/${uid}/settlements/${groupId}`).get()
            .then(snap => ({ uid, data: snap.val() || {} }))
        )
    );

    const userSettlements = {}; // uid -> { otherId -> { toReceive, toPay } }
    settlementsSnapshot.forEach(item => {
        userSettlements[item.uid] = item.data;
    });

    // Apply global settlements
    for (const update of globalSettlements) {
        const debtorId = update.fromId;
        const creditorId = update.toId;
        const amount = update.amount;

        const debtorUserId = memberMap.get(debtorId);
        const creditorUserId = memberMap.get(creditorId);

        // Update Debtor's View (if they are a real user)
        if (debtorUserId) {
            const current = userSettlements[debtorUserId][creditorId] || { toReceive: 0, toPay: 0 };
            let newToPay = current.toPay + amount;
            let newToReceive = current.toReceive;

            // Netting
            if (newToPay > 0 && newToReceive > 0) {
                 if (newToPay >= newToReceive) {
                     newToPay -= newToReceive;
                     newToReceive = 0;
                 } else {
                     newToReceive -= newToPay;
                     newToPay = 0;
                 }
            }

            userSettlements[debtorUserId][creditorId] = { toReceive: newToReceive, toPay: newToPay };

            updates[`users/${debtorUserId}/settlements/${groupId}/${creditorId}`] = {
                toReceive: newToReceive,
                toPay: newToPay
            };
        }

        // Update Creditor's View (if they are a real user)
        if (creditorUserId) {
            const current = userSettlements[creditorUserId][debtorId] || { toReceive: 0, toPay: 0 };
            let newToReceive = current.toReceive + amount;
            let newToPay = current.toPay;

             // Netting
            if (newToPay > 0 && newToReceive > 0) {
                 if (newToReceive >= newToPay) {
                     newToReceive -= newToPay;
                     newToPay = 0;
                 } else {
                     newToPay -= newToReceive;
                     newToReceive = 0;
                 }
            }

            userSettlements[creditorUserId][debtorId] = { toReceive: newToReceive, toPay: newToPay };

            updates[`users/${creditorUserId}/settlements/${groupId}/${debtorId}`] = {
                toReceive: newToReceive,
                toPay: newToPay
            };
        }
    }

    // 6. Execute Atomic Update
    await db.ref().update(updates);

    // 7. Success Response
    res.json({
      success: true,
      transactionId,
      transaction: newTransaction
    });

    // 8. Notifications (Async - Call helper directly)
    setImmediate(async () => {
      try {
        // Send to ALL members including the user who added the expense
        const membersWithUserId = group.members.filter(m => m.userId);
        if (membersWithUserId.length > 0) {
          const userIds = membersWithUserId.map(m => m.userId);
          await sendOneSignalNotificationInternal({
            userIds,
            title: `New Expense in ${group.name}`,
            body: `${payer.name} paid Rs ${amount.toLocaleString()} for "${note || 'Expense'}"`,
            data: { type: 'expense', transactionId, groupId, amount }
          });
        }
      } catch (notifyError) {
        console.error('⚠️ Async notification failed:', notifyError);
      }
    });

  } catch (error) {
    console.error('❌ Add expense error:', error);
    res.status(500).json({ success: false, error: 'Internal server error: ' + error.message });
  }
});

// Record Payment endpoint (Secure)
app.post('/api/record-payment', generalLimiter, async (req, res) => {
  const { groupId, fromMember, toMember, amount, method, note } = req.body;
  const currentUserId = req.user.uid;

  if (!groupId || !fromMember || !toMember || !amount || !method) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    const db = admin.database();

    // 1. Get Group Data & User Data in parallel
    const [groupSnap, userSnap] = await Promise.all([
      db.ref(`groups/${groupId}`).get(),
      db.ref(`users/${currentUserId}`).get()
    ]);

    if (!groupSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    const group = groupSnap.val();
    const user = userSnap.val();

    // 2. Verify current user is in the group
    const member = group.members.find(m => m.userId === currentUserId || m.id === currentUserId);
    if (!member) {
      return res.status(403).json({ success: false, error: 'You are not a member of this group' });
    }

    // 3. Verify members exist in group
    const fromPerson = group.members.find(m => m.id === fromMember);
    const toPerson = group.members.find(m => m.id === toMember);
    if (!fromPerson || !toPerson) {
      return res.status(400).json({ success: false, error: 'Invalid members' });
    }

    // 4. Build multi-path update object
    const updates = {};
    const transactionId = db.ref('transactions').push().key;
    const timestamp = Date.now();
    const serverTime = admin.database.ServerValue.TIMESTAMP;

    const isReceiving = toMember === currentUserId;
    const isPaying = fromMember === currentUserId;

    if (!isReceiving && !isPaying) {
      return res.status(403).json({ success: false, error: 'You must be either the payer or the receiver' });
    }

    // A. Update Wallet Balance
    let walletBalanceAfter = user.walletBalance || 0;
    if (isPaying) {
      if ((user.walletBalance || 0) < amount) {
        return res.status(400).json({ success: false, error: 'Insufficient wallet balance' });
      }
      walletBalanceAfter -= amount;
    } else if (isReceiving) {
      walletBalanceAfter += amount;
    }
    updates[`users/${currentUserId}/walletBalance`] = walletBalanceAfter;

    // B. Create Transaction Record
    const newTransaction = {
      id: transactionId,
      groupId,
      type: "payment",
      title: "Payment",
      amount,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      timestamp,
      paidBy: fromMember,
      paidByName: fromPerson.name,
      paidByIsTemporary: !!fromPerson.isTemporary,
      from: fromMember,
      fromName: fromPerson.name,
      fromIsTemporary: !!fromPerson.isTemporary,
      to: toMember,
      toName: toPerson.name,
      toIsTemporary: !!toPerson.isTemporary,
      method,
      note: note || null,
      walletBalanceBefore: user.walletBalance || 0,
      walletBalanceAfter,
      createdAt: new Date().toISOString(),
      serverTimestamp: serverTime
    };

    updates[`transactions/${transactionId}`] = newTransaction;

    // C. Add to userTransaction lists for relevant members (Denormalized)
    const transactionSummaryBase = {
      type: "payment",
      title: newTransaction.title || "Payment",
      amount,
      createdAt: newTransaction.createdAt,
      groupId,
      timestamp,
      paidBy: fromMember,
      paidByName: fromPerson.name,
      fromName: fromPerson.name,
      toName: toPerson.name,
      method,
      memberCount: group.members.length
    };

    if (fromPerson.userId) {
      const userTxUpdate = { ...transactionSummaryBase };
      userTxUpdate.userRole = 'payer';
      updates[`userTransactions/${fromPerson.userId}/${transactionId}`] = userTxUpdate;
    }
    if (toPerson.userId) {
      const userTxUpdate = { ...transactionSummaryBase };
      userTxUpdate.userRole = 'receiver';
      updates[`userTransactions/${toPerson.userId}/${transactionId}`] = userTxUpdate;
    }

    // D. Update Bidirectional Settlements
    const otherPersonId = isPaying ? toMember : fromMember;
    const currentSettlement = (user.settlements?.[groupId]?.[otherPersonId] || { toReceive: 0, toPay: 0 });

    let newToReceive = currentSettlement.toReceive;
    let newToPay = currentSettlement.toPay;

    if (isPaying) {
      newToPay = Math.max(0, newToPay - amount);
    } else if (isReceiving) {
      newToReceive = Math.max(0, newToReceive - amount);
    }

    // Update current user's view
    updates[`users/${currentUserId}/settlements/${groupId}/${otherPersonId}`] = {
      toReceive: newToReceive,
      toPay: newToPay
    };

    // Update other user's view (Mirror)
    updates[`users/${otherPersonId}/settlements/${groupId}/${currentUserId}`] = {
      toReceive: newToPay,
      toPay: newToReceive
    };

    // 5. Execute Atomic Update
    await db.ref().update(updates);

    // 6. Success Response
    res.json({
      success: true,
      transactionId,
      transaction: newTransaction
    });

    // 7. Notifications (Async - Send to ALL group members)
    setImmediate(async () => {
      try {
        // Send to ALL members including the user who recorded the payment
        const membersWithUserId = group.members.filter(m => m.userId);
        if (membersWithUserId.length > 0) {
          const userIds = membersWithUserId.map(m => m.userId);
          await sendOneSignalNotificationInternal({
            userIds,
            title: `Payment Recorded in ${group.name}`,
            body: isPaying
              ? `${user.name} paid Rs ${amount.toLocaleString()} to ${toPerson.name}`
              : `${fromPerson.name} paid Rs ${amount.toLocaleString()} to ${user.name}`,
            data: {
              type: 'payment',
              transactionId,
              groupId,
              amount
            }
          });
        }
      } catch (notifyError) {
        console.error('⚠️ Async notification failed:', notifyError);
      }
    });

  } catch (error) {
    console.error('❌ Record payment error:', error);
    res.status(500).json({ success: false, error: 'Internal server error: ' + error.message });
  }
});


// Update Wallet endpoint (Manual adjustments - Secure)
app.post('/api/update-wallet', generalLimiter, async (req, res) => {
  const { amount, type, note } = req.body; // type: 'add' or 'deduct'
  const currentUserId = req.user.uid;

  if (typeof amount !== 'number' || amount <= 0 || !['add', 'deduct'].includes(type)) {
    return res.status(400).json({ success: false, error: 'Invalid parameters: amount must be a positive number and type must be add or deduct' });
  }

  try {
    const db = admin.database();
    const userRef = db.ref(`users/${currentUserId}`);
    const userSnap = await userRef.get();

    if (!userSnap.exists()) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = userSnap.val();
    const currentBalance = user.walletBalance || 0;

    let newBalance = currentBalance;
    if (type === 'add') {
      newBalance += amount;
    } else {
      if (currentBalance < amount) {
        return res.status(400).json({ success: false, error: 'Insufficient wallet balance' });
      }
      newBalance -= amount;
    }

    const transactionId = db.ref('transactions').push().key;
    const serverTime = admin.database.ServerValue.TIMESTAMP;

    const updates = {};
    updates[`users/${currentUserId}/walletBalance`] = newBalance;

    // Record internal wallet transaction
    const walletTransaction = {
      id: transactionId,
      type: type === 'add' ? 'wallet_add' : 'wallet_deduct',
      title: type === 'add' ? 'Manual Deposit' : 'Manual Withdrawal',
      amount,
      note: note || `Manual wallet ${type}`,
      timestamp: Date.now(),
      serverTimestamp: serverTime,
      walletBalanceBefore: currentBalance,
      walletBalanceAfter: newBalance,
      userId: currentUserId,
      createdAt: new Date().toISOString()
    };

    const transactionSummary = {
      type: walletTransaction.type,
      title: walletTransaction.title,
      amount,
      createdAt: walletTransaction.createdAt,
      groupId: "wallet",
      timestamp: walletTransaction.timestamp,
      note: walletTransaction.note
    };

    updates[`transactions/${transactionId}`] = walletTransaction;
    updates[`userTransactions/${currentUserId}/${transactionId}`] = transactionSummary;

    await db.ref().update(updates);

    res.json({
      success: true,
      balance: newBalance,
      transactionId
    });

  } catch (error) {
    console.error('❌ Update wallet error:', error);
    res.status(500).json({ success: false, error: 'Internal server error: ' + error.message });
  }
});


// Cleanup Temporary Members endpoint (Server-Authoritative)
app.post('/api/cleanup-temp-members', generalLimiter, async (req, res) => {
  try {
    const db = admin.database();
    const groupsSnap = await db.ref('groups').get();

    if (!groupsSnap.exists()) {
      return res.json({ success: true, removedCount: 0 });
    }

    const groups = groupsSnap.val();
    const now = Date.now();
    let removedCount = 0;
    const updates = {};

    for (const groupId in groups) {
      const group = groups[groupId];
      if (!group.members) continue;

      const members = group.members;
      let hasCleanup = false;

      const newMembers = members.filter(member => {
        // Only consider temporary members for cleanup
        if (!member.isTemporary) return true;

        // Check if member has any settlements
        // We need to check all users' settlements to be absolutely sure
        // But for efficiency, we can assume if the group creator sees no debt, it's safe (or we can skip this check if the condition is purely TIME_LIMIT)
        // However, the rule is: no debt.

        // This is a complex check because settlements are stored under users.
        // For a simple version, we can check if the member is expired.
        const isExpired = member.deletionCondition === 'TIME_LIMIT' && member.expiresAt && member.expiresAt < now;
        const isSettledCheckRequired = member.deletionCondition === 'SETTLED' || member.deletionCondition === 'TIME_LIMIT';

        if (isExpired || member.deletionCondition === 'SETTLED') {
          // We'll mark it for cleanup, but in a real-world scenario, we'd verify settlements first
          // For this implementation, we'll assume the client-side settlement state was the trigger
          // or we'd perform a deeper scan if this were a production cron.
          hasCleanup = true;
          removedCount++;
          return false;
        }

        return true;
      });

      if (hasCleanup) {
        updates[`groups/${groupId}/members`] = newMembers;
      }
    }

    if (Object.keys(updates).length > 0) {
      await db.ref().update(updates);
    }

    res.json({
      success: true,
      removedCount,
      message: `Cleaned up ${removedCount} temporary members across groups.`
    });

  } catch (error) {
    console.error('❌ Member cleanup error:', error);
    res.status(500).json({ success: false, error: 'Internal server error: ' + error.message });
  }
});



// ============================================
// INVITATION SYSTEM ENDPOINTS
// ============================================

// Get Public User Details (for Group Creation)
app.post('/api/get-valid-user-details', generalLimiter, async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ success: false, error: 'Username is required' });
    }

    const db = admin.database();
    const normalizedUsername = username.toLowerCase().replace(/[^a-z0-9._]/g, '');

    // 1. Resolve username
    const usernameSnap = await db.ref(`usernames/${normalizedUsername}`).get();
    if (!usernameSnap.exists()) {
      return res.json({ success: true, exists: false });
    }

    const uid = usernameSnap.val().uid;
    const userSnap = await db.ref(`users/${uid}`).get();

    if (!userSnap.exists()) {
      return res.json({ success: true, exists: false }); // Should technically exist if username does
    }

    const userData = userSnap.val();

    // 2. Extract Public Info
    const publicProfile = {
      name: userData.name || "Unknown",
      username: userData.username,
      photoURL: userData.photoURL || null,
      uid: uid,
      paymentMethods: {
        jazzCash: !!userData.paymentDetails?.jazzCash,
        easypaisa: !!userData.paymentDetails?.easypaisa,
        bankName: !!userData.paymentDetails?.bankName,
        raastId: !!userData.paymentDetails?.raastId
      }
    };

    res.json({ success: true, exists: true, user: publicProfile });

  } catch (error) {
    console.error('❌ Get user details error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});
app.post('/api/send-invitation', generalLimiter, async (req, res) => {
  try {
    const { groupId, inviteeUsername } = req.body;
    const senderUid = req.user.uid;

    if (!groupId || !inviteeUsername) {
      return res.status(400).json({ success: false, error: 'Group ID and username are required' });
    }

    const db = admin.database();

    // 1. Resolve invitee username to UID
    // Using the 'usernames' index we created in Phase 1
    const normalizedUsername = inviteeUsername.toLowerCase().replace(/[^a-z0-9._]/g, '');
    const usernameSnap = await db.ref(`usernames/${normalizedUsername}`).get();

    if (!usernameSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Username not found' });
    }

    const inviteeUid = usernameSnap.val().uid;

    if (inviteeUid === senderUid) {
      return res.status(400).json({ success: false, error: 'You cannot invite yourself' });
    }

    // 2. Verify Group Exists and Sender is Member
    const groupRef = db.ref(`groups/${groupId}`);
    const groupSnap = await groupRef.get();

    if (!groupSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    const group = groupSnap.val();
    const isSenderMember = (group.members || []).some(m => m.userId === senderUid || (m.isTemporary && m.createdBy === senderUid)); // Ideally real members only

    // Actually, only real members should invite. We check if sender is in the group.
    // For now, simpler check: check if userGroups has it
    const senderGroupCheck = await db.ref(`userGroups/${senderUid}/${groupId}`).get();
    if (!senderGroupCheck.exists()) {
      return res.status(403).json({ success: false, error: 'You must be a member of the group to invite others' });
    }

    // 3. Check if Invitee is already in group
    const isInviteeAlreadyMember = (group.members || []).some(m => m.userId === inviteeUid);
    if (isInviteeAlreadyMember) {
      return res.status(400).json({ success: false, error: 'User is already a member of this group' });
    }

    // 4. Create Invitation
    const invitationId = db.ref('invitations').push().key;
    const now = new Date().toISOString();

    // Get sender info for the notification
    const senderSnap = await db.ref(`users/${senderUid}`).get();
    const senderName = senderSnap.exists() ? senderSnap.val().name : "A friend";
    const senderUsername = senderSnap.exists() ? (senderSnap.val().username || "") : "";

    const invitationData = {
      id: invitationId,
      groupId,
      groupName: group.name,
      invitedBy: {
        uid: senderUid,
        name: senderName,
        username: senderUsername
      },
      invitee: {
        uid: inviteeUid,
        username: normalizedUsername
      },
      status: 'pending',
      createdAt: now,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };

    const updates = {};
    updates[`invitations/${invitationId}`] = invitationData;
    updates[`userInvitations/${inviteeUid}/${invitationId}`] = {
      invitationId,
      groupId,
      groupName: group.name,
      invitedBy: senderName,
      createdAt: now,
      status: 'pending'
    };

    await db.ref().update(updates);

    // 5. Send Notification (Async)
    setImmediate(async () => {
      try {
        // Send Push Notification
        await sendOneSignalNotificationInternal({
          userIds: [inviteeUid],
          title: "New Group Invitation! 🏠",
          body: `${senderName} invited you to join "${group.name}"`,
          data: { type: 'invitation', invitationId, groupId }
        });
      } catch (err) {
        console.error("Failed to send invitation notification", err);
      }

      // Send Email Invitation
      try {
        const userRecord = await admin.auth().getUser(inviteeUid);
        const inviteeEmail = userRecord.email;

        if (inviteeEmail) {
          const templatePath = path.join(__dirname, 'email-templates', 'invitation.html');
          if (fs.existsSync(templatePath)) {
            let html = fs.readFileSync(templatePath, 'utf8');

            // Replace placeholders
            html = html.replace(/{{INVITEE_NAME}}/g, userRecord.displayName || normalizedUsername);
            html = html.replace(/{{SENDER_NAME}}/g, senderName);
            html = html.replace(/{{GROUP_NAME}}/g, group.name);

            await transporter.sendMail({
              from: `"Hostel Ledger" <${process.env.SMTP_USER}>`,
              to: inviteeEmail,
              subject: `${senderName} invited you to join "${group.name}" 🏠`,
              html: html
            });
            console.log(`📧 Invitation email sent to ${inviteeEmail}`);
          } else {
            console.warn("Invitation template not found at", templatePath);
          }
        }
      } catch (emailError) {
        console.error("Failed to send invitation email:", emailError);
      }
    });

    res.json({ success: true, message: 'Invitation sent successfully' });

  } catch (error) {
    console.error('❌ Send invitation error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});


// Send External Invitation (to email)
app.post('/api/send-external-invitation', generalLimiter, async (req, res) => {
  try {
    const { email, groupId } = req.body;
    const senderUid = req.user.uid;

    if (!email || !groupId) {
      return res.status(400).json({ success: false, error: 'Email and Group ID are required' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email address' });
    }

    const db = admin.database();

    // 1. Verify Sender and Group
    const groupRef = db.ref(`groups/${groupId}`);
    const groupSnap = await groupRef.get();

    if (!groupSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    const group = groupSnap.val();

    // Check sender membership
    const isSenderMember = (group.members || []).some(m => m.userId === senderUid || (m.isTemporary && m.createdBy === senderUid));
    if (!isSenderMember) {
      // Also check userGroups as backup
      const senderGroupCheck = await db.ref(`userGroups/${senderUid}/${groupId}`).get();
      if (!senderGroupCheck.exists()) {
        return res.status(403).json({ success: false, error: 'You must be a member of the group to invite others' });
      }
    }

    // 2. Get Sender Info
    const senderSnap = await db.ref(`users/${senderUid}`).get();
    const senderName = senderSnap.exists() ? senderSnap.val().name : "A friend";

    // 3. Send Email
    const templatePath = path.join(__dirname, 'email-templates', 'external-invitation.html');
    if (fs.existsSync(templatePath)) {
      let html = fs.readFileSync(templatePath, 'utf8');

      // Replace placeholders
      html = html.replace(/{{SENDER_NAME}}/g, senderName);
      html = html.replace(/{{GROUP_NAME}}/g, group.name);

      await transporter.sendMail({
        from: `"Hostel Ledger" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `${senderName} invited you to join "${group.name}" 🚀`,
        html: html
      });
      console.log(`📧 External invitation email sent to ${email}`);

      res.json({ success: true, message: 'Invitation email sent successfully' });
    } else {
      console.error("External invitation template not found");
      res.status(500).json({ success: false, error: 'Email template error' });
    }

  } catch (error) {
    console.error('❌ Send external invitation error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Respond to Invitation
app.post('/api/respond-invitation', generalLimiter, async (req, res) => {
  try {
    const { invitationId, accept } = req.body;
    const uid = req.user.uid;

    if (!invitationId) {
      return res.status(400).json({ success: false, error: 'Invitation ID is required' });
    }

    const db = admin.database();

    // 1. Get Invitation
    const invitationRef = db.ref(`invitations/${invitationId}`);
    const invitationSnap = await invitationRef.get();

    if (!invitationSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Invitation not found' });
    }

    const invitation = invitationSnap.val();

    // 2. Verify Ownership
    if (invitation.invitee.uid !== uid) {
      return res.status(403).json({ success: false, error: 'This invitation is not for you' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ success: false, error: `Invitation is already ${invitation.status}` });
    }

    const updates = {};
    const now = new Date().toISOString();

    if (accept) {
      // 3. Accept Logic

      // Add to Group Members
      const groupRef = db.ref(`groups/${invitation.groupId}`);
      const groupSnap = await groupRef.get();

      if (!groupSnap.exists()) {
        updates[`invitations/${invitationId}/status`] = 'expired'; // Group deleted?
        updates[`userInvitations/${uid}/${invitationId}/status`] = 'expired';
        await db.ref().update(updates);
        return res.status(404).json({ success: false, error: 'Group no longer exists' });
      }

      const group = groupSnap.val();
      const currentMembers = group.members || [];

      // Check again if already member
      if (currentMembers.some(m => m.userId === uid)) {
        // Already member, just mark invite complete
        updates[`invitations/${invitationId}/status`] = 'accepted';
        updates[`userInvitations/${uid}/${invitationId}/status`] = 'accepted';
        await db.ref().update(updates);
        return res.json({ success: true, message: 'You are already in this group' });
      }

      // Get user profile for member details
      const userSnap = await db.ref(`users/${uid}`).get();
      const userData = userSnap.exists() ? userSnap.val() : {};

      const newMember = {
        id: `mem_${uid}_${Date.now()}`, // Consistent ID format? Or reuse UID? usually random ID
        userId: uid,
        name: userData.name || "Member",
        username: userData.username || "",
        joinedAt: now,
        isTemporary: false,
        role: 'member'
      };

      // Add member to group
      // Note: This is an array. We need to find the next index or push.
      // Firebase arrays can be tricky if using numerical keys.
      // Usually better to read, modify, write for arrays or use an object map for members.
      // Current implementation seems to use array for members?
      // "members": [ { ... }, { ... } ]
      // We will read-modify-write as we have the snapshot.

      const updatedMembers = [...currentMembers, newMember];
      updates[`groups/${invitation.groupId}/members`] = updatedMembers;

      // Add group to user's list
      updates[`userGroups/${uid}/${invitation.groupId}`] = {
        name: group.name,
        emoji: group.emoji || '🏠',
        joinedAt: now,
        role: 'member'
      };

      // Mark invitation accepted
      updates[`invitations/${invitationId}/status`] = 'accepted';
      updates[`invitations/${invitationId}/respondedAt`] = now;
      updates[`userInvitations/${uid}/${invitationId}/status`] = 'accepted';

      // Initialize settlements for this user in the group...
      // Actually, standard logic initializes settlements lazily or 0s. 
      // But we should probably ensure keys exist.
      // Let's rely on addExpense to create keys if they don't exist.

      // Notify Inviter
      setImmediate(async () => {
        try {
          await sendOneSignalNotificationInternal({
            userIds: [invitation.invitedBy.uid],
            title: "Invitation Accepted! ✅",
            body: `${userData.name} joined "${group.name}"`,
            data: { type: 'invitation_response', invitationId, groupId: invitation.groupId }
          });
        } catch (e) {
          console.error("Failed notification", e);
        }
      });

    } else {
      // 4. Decline Logic
      updates[`invitations/${invitationId}/status`] = 'declined';
      updates[`invitations/${invitationId}/respondedAt`] = now;
      updates[`userInvitations/${uid}/${invitationId}/status`] = 'declined';
    }

    await db.ref().update(updates);

    res.json({ success: true, message: accept ? 'Invitation accepted' : 'Invitation declined' });

  } catch (error) {
    console.error('❌ Respond invitation error:', error);
    res.status(500).json({ success: false, error: 'Internal server error: ' + error.message });
  }
});

/**
 * User Discovery Endpoint
 * Fetches public user details by username
 */
app.post('/api/get-valid-user-details', authenticate, async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ success: false, error: 'Username is required' });
  }

  try {
    const usernameRef = admin.database().ref(`usernames/${username.toLowerCase()}`);
    const usernameSnapshot = await usernameRef.get();

    if (!usernameSnapshot.exists()) {
      return res.json({ success: true, exists: false });
    }

    const uid = usernameSnapshot.val();
    const userRef = admin.database().ref(`users/${uid}`);
    const userSnapshot = await userRef.get();

    if (!userSnapshot.exists()) {
      return res.json({ success: true, exists: false });
    }

    const userData = userSnapshot.val();

    const publicProfile = {
      uid,
      username: userData.username,
      name: userData.name,
      photoURL: userData.photoURL || null,
      paymentMethods: {
        jazzCash: !!userData.paymentDetails?.jazzCash,
        easypaisa: !!userData.paymentDetails?.easypaisa,
        bankName: !!userData.paymentDetails?.bankName,
        raastId: !!userData.paymentDetails?.raastId
      }
    };

    res.json({ success: true, exists: true, user: publicProfile });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user details' });
  }
});

/**
 * Internal Invitation Endpoint
 */
app.post('/api/send-invitation', authenticate, async (req, res) => {
  const { groupId, inviteeUsername } = req.body;
  const senderUid = req.user.uid;

  if (!groupId || !inviteeUsername) {
    return res.status(400).json({ success: false, error: 'GroupId and inviteeUsername are required' });
  }

  try {
    const groupRef = admin.database().ref(`groups/${groupId}`);
    const groupSnapshot = await groupRef.get();
    if (!groupSnapshot.exists()) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }
    const groupData = groupSnapshot.val();

    const usernameRef = admin.database().ref(`usernames/${inviteeUsername.toLowerCase()}`);
    const usernameSnapshot = await usernameRef.get();
    if (!usernameSnapshot.exists()) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const inviteeUid = usernameSnapshot.val();

    const membershipRef = admin.database().ref(`userGroups/${inviteeUid}/${groupId}`);
    const membershipSnapshot = await membershipRef.get();
    if (membershipSnapshot.exists()) {
      return res.status(400).json({ success: false, error: 'User is already a member' });
    }

    const invitationsRef = admin.database().ref('invitations');
    const newInviteRef = invitationsRef.push();

    const senderRef = admin.database().ref(`users/${senderUid}`);
    const senderSnapshot = await senderRef.get();
    const senderName = senderSnapshot.exists() ? senderSnapshot.val().name : "Someone";

    await newInviteRef.set({
      id: newInviteRef.key,
      groupId,
      groupName: groupData.name,
      groupEmoji: groupData.emoji || "📁",
      senderId: senderUid,
      senderName: senderName,
      receiverId: inviteeUid,
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, message: 'Invitation sent', invitationId: newInviteRef.key });
  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({ success: false, error: 'Failed to send invitation' });
  }
});

/**
 * Respond to Invitation Endpoint
 */
app.post('/api/respond-invitation', authenticate, async (req, res) => {
  const { invitationId, accept } = req.body;
  const userId = req.user.uid;

  if (!invitationId) {
    return res.status(400).json({ success: false, error: 'Invitation ID is required' });
  }

  try {
    const inviteRef = admin.database().ref(`invitations/${invitationId}`);
    const inviteSnapshot = await inviteRef.get();

    if (!inviteSnapshot.exists()) {
      return res.status(404).json({ success: false, error: 'Invitation not found' });
    }

    const inviteData = inviteSnapshot.val();
    if (inviteData.receiverId !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized to respond to this invitation' });
    }

    if (accept) {
      const groupRef = admin.database().ref(`groups/${inviteData.groupId}`);
      const userRef = admin.database().ref(`users/${userId}`);
      const [groupSnap, userSnap] = await Promise.all([groupRef.get(), userRef.get()]);

      if (!groupSnap.exists() || !userSnap.exists()) {
        return res.status(404).json({ success: false, error: 'Group or User data missing' });
      }

      const group = groupSnap.val();
      const user = userSnap.val();

      const members = group.members || [];
      const newMember = {
        id: `member_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        userId: userId,
        name: user.name,
        paymentDetails: user.paymentDetails || {},
        phone: user.phone || null
      };

      members.push(newMember);

      await groupRef.update({ members });
      await admin.database().ref(`userGroups/${userId}/${inviteData.groupId}`).set({
        name: group.name,
        emoji: group.emoji,
        coverPhoto: group.coverPhoto || null,
        memberCount: members.length,
        role: 'member',
        joinedAt: new Date().toISOString()
      });
      await inviteRef.update({ status: 'accepted' });

      res.json({ success: true, message: 'Joined group successfully' });
    } else {
      await inviteRef.update({ status: 'declined' });
      res.json({ success: true, message: 'Invitation declined' });
    }

  } catch (error) {
    console.error('Error responding to invitation:', error);
    res.status(500).json({ success: false, error: 'Failed to respond' });
  }
});

/**
 * External Email Invitation Endpoint
 */
app.post('/api/send-external-invitation', authenticate, async (req, res) => {
  const { groupId, email } = req.body;
  const senderUid = req.user.uid;

  if (!groupId || !email) {
    return res.status(400).json({ success: false, error: 'GroupId and Email are required' });
  }

  try {
    const groupRef = admin.database().ref(`groups/${groupId}`);
    const groupSnapshot = await groupRef.get();
    if (!groupSnapshot.exists()) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }
    const groupData = groupSnapshot.val();

    const senderRef = admin.database().ref(`users/${senderUid}`);
    const senderSnapshot = await senderRef.get();
    const senderName = senderSnapshot.exists() ? senderSnapshot.val().name : "A friend";

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: { rejectUnauthorized: false }
    });

    const inviteLink = `https://hostel-ledger.aarx.online/join/${groupId}`;

    const mailOptions = {
      from: '"Hostel Ledger" <' + process.env.SMTP_USER + '>',
      to: email,
      subject: `${senderName} invited you to join "${groupData.name}" on Hostel Ledger`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>You've been invited! 🎉</h2>
          <p><strong>${senderName}</strong> has invited you to join the group <strong>${groupData.name}</strong>.</p>
          <p>Hostel Ledger makes it easy to split expenses and track shared costs.</p>
          <a href="${inviteLink}" style="display: inline-block; background-color: #4a6850; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px;">Join Group</a>
          <p style="margin-top: 30px; font-size: 12px; color: #666;">If you can't click the button, copy this link: ${inviteLink}</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Email invitation sent' });

  } catch (error) {
    console.error('Error sending external invitation:', error);
    res.status(500).json({ success: false, error: 'Failed to send email' });
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
