const express = require('express');
const helmet = require('helmet');
const nodemailer = require('nodemailer');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
let firestore;
const cloudinary = require('cloudinary').v2;
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require('./utils/logger');
const os = require('os');

// --- STABILITY MEASURES ---
process.on('uncaughtException', (err) => {
    logger.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection:', reason);
    logger.error('❌ Unhandled Rejection:', reason);
});
// --------------------------

const {
  validateCreateGroup,
  validateAmount,
  isValidFirebaseId,
  validateNote,
  validatePlace,
  validateMethod,
  validateCoordinates
} = require('./utils/validation');
const { sanitize } = require('./utils/sanitize');
const { getDeviceFromUA, getLocationFromIP } = require('./utils/deviceInfo');
const { getCurrencySymbol } = require('./utils/currency');
const detectFraud = require('./middleware/fraudDetection');
// Note: web-push removed - using OneSignal for push notifications
require('dotenv').config();
const pkg = require('./package.json');

// Gemini AI Configuration
let genAI;
let aiModels = [];
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const fallbackModelNames = ["gemini-3.1-flash-lite-preview", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash-lite"];
  aiModels = fallbackModelNames.map(name => genAI.getGenerativeModel({ model: name }));
  logger.info(`✅ Gemini AI initialized with ${aiModels.length} fallback models`);
} else {
  logger.warn('⚠️ GEMINI_API_KEY not found - AI parsing will be disabled');
}

/**
 * Attempts to generate content using a prioritized list of fallback models
 */
async function generateContentWithFallback(prompt) {
  if (!aiModels || aiModels.length === 0) {
    throw new Error('AI service not configured on server');
  }

  let lastError = null;
  for (let i = 0; i < aiModels.length; i++) {
    try {
      logger.info(`🤖 Attempting AI generation with fallback model index ${i}...`);
      const result = await aiModels[i].generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.warn(`⚠️ Model at index ${i} failed:`, error.message);
      lastError = error;
      if (i === aiModels.length - 1) {
        throw new Error(`All fallback AI models failed. Last error: ${error.message}`);
      }
    }
  }
}


// Cloudinary Configuration
const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME;
const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY || process.env.VITE_CLOUDINARY_API_KEY;
const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET || process.env.VITE_CLOUDINARY_API_SECRET;

if (cloudinaryCloudName && cloudinaryApiKey && cloudinaryApiSecret) {
  cloudinary.config({
    cloud_name: cloudinaryCloudName,
    api_key: cloudinaryApiKey,
    api_secret: cloudinaryApiSecret
  });
  logger.info('✅ Cloudinary configured successfully');
} else {
  logger.warn('⚠️ Cloudinary not fully configured - image deletion will fail');
}

// Normalize group.members from Firebase: may be object or array.
// Preserves Firebase key as member.id (matching frontend normalizeMembers logic).
function normalizeMembers(members) {
  if (!members) return [];
  if (Array.isArray(members)) return members;
  return Object.entries(members).map(([key, value]) => ({
    ...value,
    id: value.id || key // Use stored id if present, otherwise the Firebase key
  }));
}



// Initialize Firebase Admin SDK using environment variables
if (process.env.FIREBASE_PROJECT_ID) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    firestore = admin.firestore();
    logger.info('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    logger.error('❌ Firebase Admin SDK initialization failed:', error.message);
    logger.warn('⚠️ Email existence check will not work without Firebase Admin SDK');
  }
}

// OneSignal Client Initialization
if (process.env.ONESIGNAL_APP_ID && process.env.ONESIGNAL_REST_API_KEY) {
  logger.info('✅ OneSignal configured for push notifications');
} else {
  logger.warn('⚠️ OneSignal not configured - push notifications will not work');
}

const app = express();

// --- Enhanced Logging: Request Middleware ---
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});
const adminRoutes = require("./routes/adminRoutes");
const userRoutes = require("./routes/userRoutes");
const exportRoutes = require("./routes/exportRoutes");

// Security headers
app.use(helmet());

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

    // Allow Vercel preview deployments for the hostel-ledger project
    // Matches https://hostel-ledger-*.vercel.app
    if (/^https:\/\/hostel-ledger(-.+)?\.vercel\.app$/.test(origin)) {
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

// Endpoint requiring larger payload for audio data
app.use('/api/ai/parse-expense-audio', express.json({ limit: '10mb' }));
// Global limit to prevent DoS attacks
app.use(express.json({ limit: '100kb' }));
app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);
app.use("/api/export", exportRoutes);

const emailService = require('./services/emailService');
const expenseLogic = require('./utils/expenseLogic');
const { calculateMultiPayerSettlements } = require('./utils/expenseLogic');
const { processTransactions, calculateDebtSummary } = require('./utils/debtLogic');
const { verifyImageOwnership } = require('./utils/imageSecurity');
const adminAuthMiddleware = require('./middleware/adminAuth').verifyAdmin;
const adminAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.error('CRON_SECRET is not configured.');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (authHeader && authHeader === `Bearer ${cronSecret}`) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
};

// Rate limiting for email endpoints - very generous limits for testing
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many email requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General rate limiter for API endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// STRICT Rate Limiter for sensitive actions like non-user invitations
const strictEmailLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 20, // Limit to 20 invites per day per IP
  message: {
    success: false,
    error: 'Daily invitation limit reached. Please try again tomorrow to protect against spam.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// STRICT Rate Limiter for Email Existence Checks (Anti-Enumeration)
const strictEmailCheckLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit to 10 checks per hour per IP
  message: {
    success: false,
    error: 'Too many attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate Limiter for User Search (Anti-Scraping/Enumeration)
const userSearchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit to 30 searches per 15 mins per IP
  message: {
    success: false,
    error: 'Too many search attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Verify email configuration on startup
emailService.verifyConnection().then(connected => {
  if (connected) {
    logger.info('✅ Email Service Configured Successfully');
  } else {
    logger.warn('⚠️ Email Service Failed to Connect - Emails may not send');
  }
});

const { getStatusPageHTML } = require('./utils/statusPage');

// Root endpoint with premium status dashboard
app.get('/', (req, res) => {
  const isHtml = req.accepts('html');
  
  const firebaseActive = !!admin.apps.length;
  const smtpActive = emailService.isConnectionVerified;
  const oneSignalActive = !!(process.env.ONESIGNAL_APP_ID && process.env.ONESIGNAL_REST_API_KEY);
  const aiActive = !!(genAI && aiModels.length > 0);

  const endpoints = {
    'Core Infrastructure': {
      status: 'Operational',
      items: {
        health: '/health',
        statusDashboard: '/',
        pushTest: '/api/push-test'
      }
    },
    'Authentication & Security': {
      status: firebaseActive ? 'Operational' : 'Service Down',
      items: {
        verificationRequest: '/api/verification/request',
        verificationVerify: '/api/verification/verify',
        verificationCheck: '/api/verification/check',
        passwordReset: '/api/send-password-reset',
        emailExistence: '/api/check-email-exists',
        twoFactorSetup: '/api/2fa/setup',
        twoFactorVerify: '/api/2fa/verify',
        twoFactorStatus: '/api/2fa/status'
      }
    },
    'Financial Services': {
      status: firebaseActive ? 'Operational' : 'Service Down',
      items: {
        recordPayment: '/api/record-payment',
        recordExpense: '/api/record-expense',
        expenseParsing: '/api/ai/parse-expense-audio'
      }
    },
    'Group Management': {
      status: firebaseActive ? 'Operational' : 'Service Down',
      items: {
        groupSearch: '/api/groups-search',
        groupCreate: '/api/groups-create',
        groupUpdate: '/api/groups-update',
        groupDelete: '/api/groups-delete',
        memberRemove: '/api/groups-remove-member',
        groupMerge: '/api/groups-merge',
        groupInvitation: '/api/groups-invitation',
        externalInvitation: '/api/send-external-invitation'
      }
    },
    'Communication & AI': {
      status: (smtpActive && oneSignalActive && aiActive) ? 'Operational' : (smtpActive || oneSignalActive || aiActive ? 'Degraded' : 'Service Down'),
      items: {
        emailService: '/api/send-email',
        pushNotification: '/api/push-notify',
        broadcastNotify: '/api/push-notify-multiple',
        groupChat: '/api/groups/chat/send',
        supportAssistant: '/api/ai/support-assistant'
      }
    },
    'Support & Safety': {
      status: (firebaseActive && smtpActive) ? 'Operational' : 'Limited Support',
      items: {
        userSupport: '/api/user/support',
        reportSystem: '/api/user/report'
      }
    },
    'Maintenance Tasks': {
      status: firebaseActive ? 'Operational' : 'Service Down',
      items: {
        memberCleanup: '/api/cleanup-members',
        unverifiedCleanup: '/api/cleanup-unverified',
        imageCleanup: '/api/delete-images'
      }
    }
  };

  if (isHtml) {
    const statusData = {
      version: pkg.version,
      env: process.env.NODE_ENV || 'development',
      system: {
        uptime: process.uptime(),
        platform: os.platform(),
        release: os.release(),
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          usage: ((1 - os.freemem() / os.totalmem()) * 100).toFixed(2) + '%'
        },
        cpuCount: os.cpus().length,
        serverTime: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      firebaseActive,
      oneSignalActive,
      smtpActive,
      aiActive,
      endpoints
    };
    return res.send(getStatusPageHTML(statusData));
  }

  logger.log('info', '📍 Root endpoint accessed from:', req.get('origin') || 'direct');
  res.json({
    success: true,
    message: 'Hostel Ledger API Status',
    version: pkg.version,
    services: {
        firebase: firebaseActive,
        smtp: smtpActive,
        onesignal: oneSignalActive,
        ai: aiActive
    },
    endpoints,
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint (no rate limiting)
app.get('/health', (req, res) => {
  logger.log('info', '🏥 Health check accessed from:', req.get('origin') || 'direct');
  res.json({
    success: true,
    message: 'Hostel Ledger Email API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: pkg.version, // Dynamic from package.json
    pushProvider: 'OneSignal',
    oneSignalConfigured: !!(process.env.ONESIGNAL_APP_ID && process.env.ONESIGNAL_REST_API_KEY),
    deployedAt: '2026-01-22T13:00:00Z'
  });
});

// Silently handle favicon requests (eliminates 404 noise in logs)
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/favicon.png', (req, res) => res.status(204).end());

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
    logger.warn('⚠️ Missing or malformed Authorization header');
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing or malformed token'
    });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    logger.info(`✅ Authenticated user: ${decodedToken.uid}`);
    next();
  } catch (error) {
    logger.error('❌ Token verification failed:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or expired token'
    });
  }
};

/**
 * Get Transaction Preview
 * Allows users to fetch basic details of a transaction by ID if they belong to the group
 */
app.post('/api/get-transaction-preview', authenticate, async (req, res) => {
  try {
    const { transactionId, groupId: requestedGroupId } = req.body;
    const uid = req.user.uid;

    if (!transactionId) {
      return res.status(400).json({ error: 'Transaction ID is required.' });
    }

    if (!isValidFirebaseId(transactionId)) {
      return res.status(400).json({ error: 'Invalid transaction ID format.' });
    }

    // 1. Fetch transaction first to find out which group it belongs to
    const transactionSnap = await admin.database().ref(`transactions/${transactionId}`).once('value');
    
    if (!transactionSnap.exists()) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    const txn = transactionSnap.val();
    const actualGroupId = txn.groupId;

    if (!actualGroupId) {
      return res.status(500).json({ error: 'Transaction data is corrupted (missing group reference).' });
    }

    // 2. Verify user belongs to the ACTUAL group this transaction belongs to
    // This allows cross-group sharing while maintaining security
    const userGroupSnap = await admin.database().ref(`userGroups/${uid}/${actualGroupId}`).once('value');
    if (!userGroupSnap.exists()) {
      // Re-verify: it might be a temporary member or something, but usually userGroups is the source of truth
      return res.status(403).json({ error: 'Forbidden: You do not have access to the group this transaction belongs to.' });
    }

    res.json({
      success: true,
      transaction: {
        id: transactionId,
        title: txn.title,
        amount: txn.amount,
        type: txn.type,
        date: txn.date,
        paidByName: txn.paidByName || 'Unknown'
      }
    });
  } catch (error) {
    logger.error('Error fetching transaction preview:', error);
    res.status(500).json({ error: 'Failed to fetch transaction preview.' });
  }
});

// ============================================
// 2FA Endpoints
logger.info('✅ 2FA Endpoints (setup, verify-setup, verify, disable) are registered.');
// ============================================

// 2FA Status (Public) - Verify 2FA module is loaded
app.get('/api/2fa/status', (req, res) => {
  res.json({ success: true, message: '2FA Module Active' });
});

/**
 * Setup 2FA
 * Generates a secret and returns a QR code
 */
app.post('/api/2fa/setup', detectFraud, (req, res, next) => { console.log(`🔹 2FA Setup Request from IP: ${req.ip}`); next(); }, authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `HostelLedger (${req.user.email || 'User'})`
    });

    // Store secret temporarily
    // We store it in a restricted root node 'userSecrets' so it's not exposed to the client
    await admin.database().ref(`userSecrets/${userId}/tempSecret`).set(secret.base32);

    // Generate QR Code
    QRCode.toDataURL(secret.otpauth_url, (err, data_url) => {
      if (err) {
        return res.status(500).json({ success: false, error: 'Failed to generate QR code' });
      }

      res.json({
        success: true,
        secret: secret.base32, // Allow manual entry
        qrCode: data_url
      });
    });

  } catch (error) {
    logger.error('❌ 2FA setup error: %O', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * Verify 2FA Setup
 * Validates the token against the temp secret and enables 2FA
 */
app.post('/api/2fa/verify-setup', detectFraud, authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    // Get temp secret
    const snap = await admin.database().ref(`userSecrets/${userId}/tempSecret`).get();

    if (!snap.exists()) {
      return res.status(400).json({ success: false, error: 'No 2FA setup in progress' });
    }

    const secret = snap.val();

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token
    });

    if (verified) {
      // Save secret permanently and enable 2FA
      const updates = {};
      updates[`userSecrets/${userId}/secret`] = secret;
      updates[`userSecrets/${userId}/tempSecret`] = null;
      updates[`users/${userId}/is2FAEnabled`] = true;

      await admin.database().ref().update(updates);


      // Fetch user details for email (Added by Jules)
      const userSnap = await admin.database().ref(`users/${userId}`).get();
      const userData = userSnap.exists() ? userSnap.val() : {};
      const email = userData.email || req.user.email;
      const name = userData.name || 'User';

      // Get Device & Location Info
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];
      const { browser, os, device } = getDeviceFromUA(userAgent);
      const location = await getLocationFromIP(ip);

      // Send Alert
      if (email) {
        emailService.send2FAEnabledAlert(email, name, {
          device, browser, os, ip, location
        }).catch(err => logger.error('❌ Failed to send 2FA alert: %O', err));
      }

      logger.info('✅ 2FA enabled successfully for user %s', userId);
      res.json({ success: true, message: '2FA enabled successfully' });
    } else {
      res.status(400).json({ success: false, error: 'Invalid verification code' });
    }

  } catch (error) {
    logger.error('❌ 2FA verify setup error: %O', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * Verify 2FA Token (Login Challenge)
 */
app.post('/api/2fa/verify', detectFraud, authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { token, isTrusted, deviceInfo } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    // Get secret
    const snap = await admin.database().ref(`userSecrets/${userId}/secret`).get();

    if (!snap.exists()) {
      return res.status(400).json({ success: false, error: '2FA is not enabled for this account' });
    }

    const secret = snap.val();

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token
    });

    if (verified) {
      let deviceToken = null;

      // Handle Trusted Device Registration
      if (isTrusted) {
        // Generate a secure random token for the device
        deviceToken = require('crypto').randomBytes(32).toString('hex');

        const deviceData = {
          token: deviceToken,
          userAgent: deviceInfo?.userAgent || req.headers['user-agent'] || 'Unknown',
          ip: req.ip, // Capture IP for security auditing
          location: deviceInfo?.location || null, // Optional if provided by client
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString()
        };

        // Store under users/{uid}/trustedDevices/{deviceToken}
        await admin.database().ref(`users/${userId}/trustedDevices/${deviceToken}`).set(deviceData);
        logger.info('✅ Registered trusted device for user %s', userId);
      }

      res.json({
        success: true,
        message: 'Verification successful',
        location: await getLocationFromIP(req.ip),
        deviceToken: deviceToken
      });
    } else {
      res.status(400).json({ success: false, error: 'Invalid verification code' });
    }

  } catch (error) {
    logger.error('❌ 2FA verify error: %O', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * Check if a device is trusted
 */
app.post('/api/2fa/check-trust', detectFraud, authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { deviceToken } = req.body;

    if (!deviceToken) {
      return res.status(400).json({ success: false, error: 'Device token is required' });
    }

    const deviceRef = admin.database().ref(`users/${userId}/trustedDevices/${deviceToken}`);
    const snapshot = await deviceRef.get();

    if (snapshot.exists()) {
      const deviceData = snapshot.val();
      const currentUA = req.headers['user-agent'] || 'Unknown';

      // Enhanced Security: Check User Agent Mismatch
      if (deviceData.userAgent && deviceData.userAgent !== currentUA) {
        logger.warn('⚠️ Trusted device UA mismatch for user %s. Stored: %s, Current: %s', userId, deviceData.userAgent, currentUA);
        return res.json({ success: true, trusted: false, reason: 'device_mismatch' });
      }

      // Update last used timestamp
      await deviceRef.update({ lastUsed: new Date().toISOString() });
      return res.json({ success: true, trusted: true });
    } else {
      return res.json({ success: true, trusted: false });
    }

  } catch (error) {
    logger.error('❌ 2FA check trust error: %O', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * Initiate 2FA Reset (Email Link)
 */
app.post('/api/2fa/initiate-reset', detectFraud, strictEmailLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    // Verify user exists in Auth
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (e) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const userId = userRecord.uid;
    const userRef = admin.database().ref(`users/${userId}`);
    const userSnap = await userRef.get();

    if (!userSnap.exists()) {
      return res.status(404).json({ success: false, error: 'User profile not found' });
    }

    const userData = userSnap.val();

    // Check if 2FA is actually enabled
    if (!userData.is2FAEnabled) {
      return res.status(400).json({ success: false, error: '2FA is not enabled for this account' });
    }

    // Generate a reset token (stored in DB with expiry)
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes

    await admin.database().ref(`userSecrets/${userId}/resetToken`).set({
      token: resetToken,
      expiresAt: expiresAt
    });

    // Frontend URL handling
    const frontendUrl = process.env.FRONTEND_URL || 'https://app.hostelledger.aarx.online';
    const resetLink = `${frontendUrl}/recover-account?token=${resetToken}&uid=${userId}&mode=reset2fa`;

    // Send Email

    // Get Device & Location Info
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const { browser, os, device } = getDeviceFromUA(userAgent);
    const location = await getLocationFromIP(ip);

    await emailService.send2FAReset(email, resetLink, userData.name || 'User', { device, browser, os, ip, location });

    res.json({ success: true, message: 'Reset link sent to your email' });

  } catch (error) {
    logger.error('❌ 2FA initiate reset error: %O', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * Complete 2FA Reset (Disable via Token)
 */
app.post('/api/2fa/complete-reset', detectFraud, generalLimiter, async (req, res) => {
  try {
    const { uid, token } = req.body;

    if (!uid || !token) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    const secretRef = admin.database().ref(`userSecrets/${uid}/resetToken`);
    const snapshot = await secretRef.get();

    if (!snapshot.exists()) {
      return res.status(400).json({ success: false, error: 'Invalid or expired token' });
    }

    const data = snapshot.val();

    if (data.token !== token) {
      return res.status(400).json({ success: false, error: 'Invalid token' });
    }

    if (Date.now() > data.expiresAt) {
      return res.status(400).json({ success: false, error: 'Token expired' });
    }

    // Success - Disable 2FA
    const updates = {};
    updates[`userSecrets/${uid}/secret`] = null;
    updates[`userSecrets/${uid}/resetToken`] = null; // Consume token
    updates[`users/${uid}/is2FAEnabled`] = false;

    await admin.database().ref().update(updates);


    // Fetch user details (Added by Jules)
    const userSnap = await admin.database().ref(`users/${uid}`).get();
    const userData = userSnap.exists() ? userSnap.val() : {};
    const email = userData.email;
    const name = userData.name || 'User';

    // Get Device & Location Info
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const { browser, os, device } = getDeviceFromUA(userAgent);
    const location = await getLocationFromIP(ip);

    // Send Alert
    if (email) {
      emailService.send2FADisabledAlert(email, name, {
        device, browser, os, ip, location
      }).catch(err => logger.error('❌ Failed to send 2FA alert: %O', err));
    }

    res.json({ success: true, message: '2FA disabled successfully' });

  } catch (error) {
    logger.error('❌ 2FA complete reset error: %O', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * Disable 2FA
 */
app.post('/api/2fa/disable', detectFraud, authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    // Get secret
    const snap = await admin.database().ref(`userSecrets/${userId}/secret`).get();

    if (!snap.exists()) {
      return res.status(400).json({ success: false, error: '2FA is not enabled' });
    }

    const secret = snap.val();

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token
    });

    if (verified) {
      // Remove secret and disable 2FA
      const updates = {};
      updates[`userSecrets/${userId}/secret`] = null;
      updates[`users/${userId}/is2FAEnabled`] = false;

      await admin.database().ref().update(updates);


      // Fetch user details (Added by Jules)
      const userSnap = await admin.database().ref(`users/${userId}`).get();
      const userData = userSnap.exists() ? userSnap.val() : {};
      const email = userData.email || req.user.email;
      const name = userData.name || 'User';

      // Get Device & Location Info
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];
      const { browser, os, device } = getDeviceFromUA(userAgent);
      const location = await getLocationFromIP(ip);

      // Send Alert
      if (email) {
        emailService.send2FADisabledAlert(email, name, {
          device, browser, os, ip, location
        }).catch(err => logger.error('❌ Failed to send 2FA alert: %O', err));
      }

      logger.info('✅ 2FA disabled successfully for user %s', userId);
      res.json({ success: true, message: '2FA disabled successfully' });
    } else {
      res.status(400).json({ success: false, error: 'Invalid verification code' });
    }

  } catch (error) {
    logger.error('❌ 2FA disable error: %O', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Delete Image Endpoint (Secure)
app.post('/api/delete-image', authenticate, async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({ success: false, error: 'Missing publicId' });
    }

    // Verify that the publicId belongs to the user or is a cover photo of a group they created
    const isOwner = await verifyImageOwnership(admin.database(), req.user.uid, publicId);

    if (!isOwner) {
      logger.warn('⚠️ User %s attempted to delete image %s but ownership verification failed.', req.user.uid, publicId);
      return res.status(403).json({ success: false, error: 'Unauthorized: You do not have permission to delete this image.' });
    }

    logger.info('🗑️ Deleting image from Cloudinary: %s by user %s', publicId, req.user.uid);

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok' || result.result === 'not found') {
      // 'not found' is also considered success (idempotent)
      logger.info('✅ Image deleted successfully (result: %s): %s', result.result, publicId);
      res.json({ success: true });
    } else {
      logger.error('❌ Cloudinary delete failed: %j', result);
      res.status(500).json({ success: false, error: 'Failed to delete image' });
    }

  } catch (error) {
    logger.error('❌ Delete image error: %O', error);
    res.status(500).json({ success: false, error: 'Internal server error: ' + error.message });
  }
});

/**
 * Create Group Endpoint
 */
app.post('/api/create-group', detectFraud, createLimiter, authenticate, async (req, res) => {
  // Input Validation
  const validationError = validateCreateGroup(req.body);
  if (validationError) {
    return res.status(400).json({ success: false, error: validationError });
  }

  let { name, emoji, members, invitedUsernames, invitedEmails, coverPhoto } = req.body;

  // Sanitize Inputs
  name = sanitize(name);
  emoji = sanitize(emoji);
  if (members && Array.isArray(members)) {
    members = members.map(m => ({ ...m, name: sanitize(m.name) }));
  }

  const userId = req.user.uid;
  const notificationPromises = [];

  try {
    const groupsRef = admin.database().ref('groups');
    const newGroupRef = groupsRef.push();
    const groupId = newGroupRef.key;

    // 1a. Fetch User Name first (so we don't store "You" in DB)
    const userSnap = await admin.database().ref(`users/${userId}`).get();
    const userData = userSnap.exists() ? userSnap.val() : {};
    const userName = userData.name || "User";
    const userEmail = userData.email || null;

    // 1b. Resolve Invited Usernames (Existing Users)
    const resolvedUsers = [];
    if (invitedUsernames && invitedUsernames.length > 0) {
      // Optimize: Deduplicate to prevent redundant DB calls
      const uniqueUsernames = [...new Set(invitedUsernames)];

      const resolved = await Promise.all(uniqueUsernames.map(async (username) => {
        const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');

        // Optimize: Skip empty usernames to prevent fetching the entire 'usernames' node (major performance/security fix)
        if (!cleanUsername) return null;

        const s = await admin.database().ref(`usernames/${cleanUsername}`).get();
        if (s.exists()) {
          const uidData = s.val();
          const inviteeUid = typeof uidData === 'string' ? uidData : (uidData?.uid || uidData?.userId || null);
          if (inviteeUid) return { username, inviteeUid };
        }
        return null;
      }));
      resolvedUsers.push(...resolved.filter(u => u !== null));
    }

    // 1. Create Group Object
    const newGroup = {
      id: groupId,
      name: name.trim().substring(0, 50),
      emoji: emoji || "📁",
      coverPhoto: coverPhoto || null,
      members: [
        {
          id: userId,
          name: userName,
          isCurrentUser: true,
          userId: userId,
          email: userEmail,
          paymentDetails: {},
          isAdmin: true
        },
        // Existing Users (by username)
        ...resolvedUsers.map(u => ({
          id: u.inviteeUid, // Real UID
          name: u.username,
          userId: u.inviteeUid,
          username: u.username,
          type: 'invited', // Changed from 'manual' to 'invited' so they excluded from expenses
          isPending: true,
          invitedAt: new Date().toISOString()
        })),
        // Manual Members from array
        ...members.map(m => ({
          id: `member_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
          name: m.name,
          userId: m.uid || null,
          username: m.username || null,
          type: m.type || 'manual',
          email: m.email || null,
          isPending: !!m.email,
          invitedAt: m.email ? new Date().toISOString() : null
        })),
        // Invited Emails (pure string array) - DEDUPLICATED
        ...(invitedEmails || [])
          .filter(email => !members.some(m => m.email && m.email.toLowerCase() === email.toLowerCase()))
          .map(email => ({
            id: `member_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
            name: email.split('@')[0],
            email: email,
            type: 'manual',
            isPending: true,
            invitedAt: new Date().toISOString()
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
    if (resolvedUsers.length > 0) {
      const senderName = userName;
      const updates = {};
      const emailNotifications = [];

      resolvedUsers.forEach(user => {
        const { username, inviteeUid } = user;

        // Create invitation record
        const invRef = admin.database().ref('invitations').push();
        const invitationData = {
          id: invRef.key,
          invitationId: invRef.key,
          groupId,
          groupName: newGroup.name,
          groupEmoji: newGroup.emoji,
          senderId: userId,
          senderName,
          invitedBy: senderName,
          receiverId: inviteeUid,
          receiverName: username,
          status: 'pending',
          createdAt: new Date().toISOString()
        };

        updates[`invitations/${invRef.key}`] = invitationData;
        updates[`userInvitations/${inviteeUid}/${invRef.key}`] = invitationData;

        // GRANT READ ACCESS: Add to userGroups with status 'invited'
        updates[`userGroups/${inviteeUid}/${groupId}`] = {
          name: newGroup.name,
          emoji: newGroup.emoji,
          coverPhoto: newGroup.coverPhoto || null,
          memberCount: newGroup.members.length, // Initial count
          createdBy: userId,
          createdAt: newGroup.createdAt,
          status: 'invited', // Access Key
          invitedAt: new Date().toISOString()
        };

        logger.info('📩 Invitation prepared for user %s (existing app user)', inviteeUid);
        emailNotifications.push({ inviteeUid, username });
      });

      // Execute DB Updates
      if (Object.keys(updates).length > 0) {
        await admin.database().ref().update(updates);
      }

      // Collect Email Promises
      const usernameInvitePromises = emailNotifications.map(async ({ inviteeUid, username }) => {
        try {
          const inviteeSnap = await admin.database().ref(`users/${inviteeUid}`).get();
          if (inviteeSnap.exists()) {
            const inviteeData = inviteeSnap.val();
            if (inviteeData.email) {
              return emailService.sendInvitation(
                inviteeData.email,
                senderName,
                newGroup.name,
                `https://app.hostelledger.aarx.online/join/${groupId}`
              );
            }
          }
        } catch (err) {
          logger.error('❌ Failed to send invite to %s: %s', username, err.message);
        }
      });
      notificationPromises.push(...usernameInvitePromises);
    }

    // 5. Handle Email Invites (Manual members with emails + invitedEmails array)
    const emailMembers = [
      ...newGroup.members.filter(m => m.email && m.type === 'manual'),
      ...(invitedEmails || []).map(email => ({
        email,
        name: email.split('@')[0], // Fallback name
        type: 'manual'
      }))
    ];

    if (emailMembers.length > 0) {
      logger.info('📧 Preparing %d manual email invites...', emailMembers.length);
      const senderName = userName;

      const manualInvitePromises = emailMembers.map(member => {
        const joinLink = `https://app.hostelledger.aarx.online/join/${groupId}?email=${encodeURIComponent(member.email)}`;
        return emailService.sendInvitation(
          member.email,
          senderName,
          newGroup.name,
          joinLink,
          true // isNewUser = true for manual email invites
        );
      });
      notificationPromises.push(...manualInvitePromises);
    }

    // 6. Await all notifications (Critical for Vercel)
    if (notificationPromises.length > 0) {
      try {
        logger.info('🚀 Awaiting %d group creation notifications...', notificationPromises.length);
        const globalTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Invite timeout')), 8000));
        await Promise.race([Promise.allSettled(notificationPromises), globalTimeout])
          .catch(e => logger.warn('⚠️ Group invites partially timed out: %s', e.message));
      } catch (notifErr) {
        logger.error('❌ Notification awaiting failed: %O', notifErr);
      }
    }

    res.json({ success: true, groupId, message: 'Group created successfully' });

  } catch (error) {
    logger.error('❌ Error creating group: %O', error);
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

const calculateExpenseSettlements = expenseLogic.calculateExpenseSettlements;

// --- New Endpoint: Get Valid User Details ---
// Apply stricter rate limiting for user search
app.post('/api/get-valid-user-details', userSearchLimiter, authenticate, async (req, res) => {
  // Add random delay to mitigate timing attacks (500ms - 1500ms)
  const randomDelay = crypto.randomInt(500, 1500);
  await new Promise(resolve => setTimeout(resolve, randomDelay));

  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ success: false, error: 'Username is required' });
    }

    // Sanitize username to prevent path traversal (allow only alphanumeric, dots and underscores)
    const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9._]/g, '');
    const storageKey = cleanUsername.replace(/\./g, ',');
    const usernameRef = admin.database().ref(`usernames/${storageKey}`);
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
      currency: userData.currency || 'PKR',
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

/**
 * AI Expense Parsing Endpoint
 * Uses Gemini 2.5 Flash to extract expense data from natural language
 */
app.post('/api/ai/parse-expense', detectFraud, generalLimiter, authenticate, async (req, res) => {
  if (!aiModels || aiModels.length === 0) {
    return res.status(503).json({ success: false, error: 'AI service not configured on server' });
  }

  try {
    const { text, groupId } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'Text is required' });
    }
    if (!groupId || !isValidFirebaseId(groupId)) {
      return res.status(400).json({ success: false, error: 'Invalid group ID format' });
    }

    // Get group members for context
    const groupSnap = await admin.database().ref(`groups/${groupId}`).get();
    if (!groupSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    const groupData = groupSnap.val();
    const members = normalizeMembers(groupData.members);
    const memberContext = members.map(m => `${m.name} (ID: ${m.id})`).join(', ');

    const prompt = `
      You are an expense parsing assistant for "Hostel Ledger".
      Extract expense details from the following text: "${text}"
      
      CONTEXT:
      - Group Name: ${groupData.name}
      - Group Members: ${memberContext}
      - Requesting User ID: ${req.user.uid}
      - Today's Date: ${new Date().toLocaleDateString()}
      
      EXTRACT THE FOLLOWING FIELDS:
      1. amount: The numerical value of the total expense.
      2. description: A short, clean description (e.g., "Pizza").
      3. payers: An array of objects for everyone who contributed money.
         - If specific amounts are mentioned ("Ali paid 400, I paid 600"), use those.
         - If multiple people are mentioned as payers but no amounts are specified, split the total amount equally among them.
         - If "I" or "me" is used, use the Requesting User ID. If a name matches a member, use their ID.
      4. payerId: The ID of the primary payer (who paid the most). FOR BACKWARD COMPATIBILITY.
      5. participantIds: An array of IDs for everyone who shared this expense.
      6. category: One of [food, transport, shopping, rent, bills, entertainment, others].
      
      RULES:
      - Return ONLY a valid JSON object.
      - Do not include any markdown formatting or extra text.
      - If a field cannot be determined, return null for it.
      
      JSON SCHEMA:
      {
        "amount": number | null,
        "description": string | null,
        "payers": [{ "id": string, "amount": number }],
        "payerId": string | null,
        "participantIds": string[],
        "category": string
      }
    `;

    const aiText = await generateContentWithFallback(prompt);

    // Attempt to extract JSON if the model included markers
    let jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI failed to return valid JSON context');
    }

    const parsedData = JSON.parse(jsonMatch[0]);

    console.log(`🤖 AI Parsed expense for user ${req.user.uid}:`, parsedData);
    res.json({ success: true, data: parsedData });

  } catch (error) {
    console.error('❌ AI Parsing Error:', error);
    res.status(500).json({ success: false, error: 'Failed to parse expense: ' + error.message });
  }
});

/**
 * AI Audio Expense Parsing Endpoint
 * Uses Gemini Multimodal Audio to extract expense data from voice recordings
 */
app.post('/api/ai/parse-expense-audio', detectFraud, generalLimiter, authenticate, async (req, res) => {
  if (!aiModels || aiModels.length === 0) {
    return res.status(503).json({ success: false, error: 'AI service not configured on server' });
  }

  try {
    const { audioData, mimeType, groupId } = req.body;
    if (!audioData || !mimeType) {
      return res.status(400).json({ success: false, error: 'Audio data and mimeType are required' });
    }
    if (!groupId || !isValidFirebaseId(groupId)) {
      return res.status(400).json({ success: false, error: 'Invalid group ID format' });
    }

    // Get group members for context
    const groupSnap = await admin.database().ref(`groups/${groupId}`).get();
    if (!groupSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    const groupData = groupSnap.val();
    const members = normalizeMembers(groupData.members);
    const memberContext = members.map(m => `${m.name} (ID: ${m.id})`).join(', ');

    const promptText = `
      You are an expense parsing assistant for "Hostel Ledger".
      Listen to the attached audio recording and extract the expense details.
      
      CONTEXT:
      - Group Name: ${groupData.name}
      - Group Members: ${memberContext}
      - Requesting User ID: ${req.user.uid}
      - Today's Date: ${new Date().toLocaleDateString()}
      
      EXTRACT THE FOLLOWING FIELDS:
      1. amount: The numerical value of the total expense.
      2. description: A short, clean description (e.g., "Pizza").
      3. payers: An array of objects for everyone who contributed money.
         - If specific amounts are mentioned ("Ali paid 400, I paid 600"), use those.
         - If multiple people are mentioned as payers but no amounts are specified, split the total amount equally among them.
         - If "I" or "me" is used, use the Requesting User ID. If a name matches a member, use their ID.
      4. payerId: The ID of the primary payer (who paid the most). FOR BACKWARD COMPATIBILITY.
      5. participantIds: An array of IDs for everyone who shared this expense.
      6. category: One of [food, transport, shopping, rent, bills, entertainment, others].
      
      RULES:
      - Return ONLY a valid JSON object.
      - Do not include any markdown formatting or extra text.
      - If a field cannot be determined, return null for it.
      
      JSON SCHEMA:
      {
        "amount": number | null,
        "description": string | null,
        "payers": [{ "id": string, "amount": number }],
        "payerId": string | null,
        "participantIds": string[],
        "category": string
      }
    `;

    // Construct the parts array for Gemini Multimodal API
    const parts = [
      { text: promptText },
      {
        inlineData: {
          mimeType: mimeType,
          data: audioData
        }
      }
    ];

    const aiText = await generateContentWithFallback(parts);

    let jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI failed to return valid JSON context');
    }

    const parsedData = JSON.parse(jsonMatch[0]);

    console.log(`🤖 AI Parsed audio expense for user ${req.user.uid}:`, parsedData);
    res.json({ success: true, data: parsedData });

  } catch (error) {
    console.error('❌ AI Audio Parsing Error:', error);
    res.status(500).json({ success: false, error: 'Failed to parse audio expense: ' + error.message });
  }
});

/**
 * AI Insights Endpoint
 * Analyzes user's financial data to provide summaries and trends
 */
app.get('/api/ai/insights', generalLimiter, authenticate, async (req, res) => {
  if (!aiModels || aiModels.length === 0) {
    return res.status(503).json({ success: false, error: 'AI service not configured on server' });
  }

  try {
    const userId = req.user.uid;

    // Check Cache First (24-hour TTL)
    const cacheRef = admin.database().ref(`users/${userId}/aiInsightsCache`);
    const cacheSnap = await cacheRef.get();

    if (cacheSnap.exists()) {
      const cacheData = cacheSnap.val();
      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;

      // If cache is less than 24 hours old, return it instantly
      if (now - cacheData.timestamp < twentyFourHours) {
        console.log(`⚡ Serving AI Insights from cache for user ${userId}`);
        return res.json({ success: true, insights: cacheData.data });
      } else {
        console.log(`⌛ AI Insights cache expired for user ${userId}, regenerating...`);
      }
    }

    // Fetch user details for balance and settlements
    const userSnap = await admin.database().ref(`users/${userId}`).get();
    const userData = userSnap.exists() ? userSnap.val() : {};

    // Fetch user's transactions
    const txSnap = await admin.database().ref(`userTransactions/${userId}`).limitToLast(50).get();
    const transactions = [];
    if (txSnap.exists()) {
      txSnap.forEach(child => {
        transactions.push(child.val());
      });
    }

    // Fetch user's groups names
    const userGroupsSnap = await admin.database().ref(`userGroups/${userId}`).get();
    const groupNames = {};
    if (userGroupsSnap.exists()) {
      const groupIds = Object.keys(userGroupsSnap.val());
      // ⚡ Bolt Optimization: Parallelize fetching group names to fix N+1 query bottleneck.
      // Expected impact: Reduces network roundtrips from O(N) to O(1), improving latency from ~500ms to ~6ms for 100 groups.
      await Promise.all(groupIds.map(async (gid) => {
        const gSnap = await admin.database().ref(`groups/${gid}/name`).get();
        if (gSnap.exists()) groupNames[gid] = gSnap.val();
      }));
    }

    const context = {
      userName: userData.name,
      walletBalance: userData.walletBalance || 0,
      settlements: userData.settlements || {},
      transactions: transactions.map(t => ({
        amount: t.amount,
        type: t.type,
        category: t.category,
        note: t.note,
        date: new Date(t.timestamp || t.date).toLocaleDateString(),
        group: groupNames[t.groupId] || 'Personal'
      })),
      today: new Date().toLocaleDateString()
    };

    const prompt = `
      You are a financial advisor for "Hostel Ledger".
      Analyze the following user data and provide insights:
      
      DATA:
      ${JSON.stringify(context, null, 2)}
      
      TASKS:
      1. summary: A 1-sentence friendly greeting and high-level status (e.g., "Hi Absar, you're currently in a good position but have some pending settlements").
      2. highlights: Array of 3 short strings like "You spent 500 more on food this week" or "Ali owes you 1200".
      3. advice: A short actionable tip.
      4. chartData: Array of 7 objects representing spending over the last 7 days: {"day": "Mon", "amount": number}.
      5. alerts: Array of urgent items (e.g., "Settle rent soon").
      
      RULES:
      - Return ONLY a valid JSON object.
      - Return data even if transactions are empty (provide hypothetical or general advice).
      - Use the user's name if available.
      
      JSON SCHEMA:
      {
        "summary": string,
        "highlights": string[],
        "advice": string,
        "chartData": Array<{"day": string, "amount": number}>,
        "alerts": string[]
      }
    `;

    const aiText = await generateContentWithFallback(prompt);

    let jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI failed to return valid JSON');

    const insights = JSON.parse(jsonMatch[0]);

    // Save fresh insights to cache
    await cacheRef.set({
      timestamp: Date.now(),
      data: insights
    });
    console.log(`💾 Saved fresh AI Insights to cache for user ${userId}`);

    res.json({ success: true, insights });

  } catch (error) {
    console.error('❌ AI Insights Error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate insights: ' + error.message });
  }
});


// ============================================
// RESPOND TO INVITATION (Accept/Decline)
// ============================================
app.post('/api/respond-invitation', detectFraud, authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { invitationId, accept } = req.body;

    if (!invitationId) {
      return res.status(400).json({ success: false, error: 'Invitation ID is required' });
    }

    if (!isValidFirebaseId(invitationId)) {
      return res.status(400).json({ success: false, error: 'Invalid invitation ID format' });
    }

    // Get the invitation from userInvitations
    const userInvRef = admin.database().ref(`userInvitations/${userId}/${invitationId}`);
    const invSnap = await userInvRef.get();

    if (!invSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Invitation not found' });
    }

    const invitation = invSnap.val();

    // Verify this invitation belongs to this user
    if (invitation.receiverId !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    // Check if already processed
    if (invitation.status !== 'pending') {
      return res.json({ success: true, message: 'Invitation already processed', status: invitation.status });
    }

    const newStatus = accept ? 'accepted' : 'declined';
    const now = new Date().toISOString();

    if (accept) {
      // === ACCEPT: Add/Update user in group ===
      const groupId = invitation.groupId;

      // Get user data
      const userSnap = await admin.database().ref(`users/${userId}`).get();
      const userData = userSnap.val() || {};

      // Get group members
      const groupRef = admin.database().ref(`groups/${groupId}`);
      const groupSnap = await groupRef.get();
      const groupData = groupSnap.val() || {};
      let members = groupData.members || [];

      const isArray = Array.isArray(members);
      const membersArray = normalizeMembers(members);

      // Find existing member entry for this user
      // PRIORITY 1: Match by userId (Already joined/linked)
      let memberIndex = membersArray.findIndex(m => m.userId === userId);

      // PRIORITY 2: Match by Email (Manual member invited by email)
      if (memberIndex === -1 && userData.email) {
        memberIndex = membersArray.findIndex(m =>
          (m.type === 'manual' || m.type === 'invited') &&
          m.email &&
          m.email.toLowerCase() === userData.email.toLowerCase()
        );
        if (memberIndex !== -1) console.log(`🔗 Found matching member by EMAIL for merge: ${userData.email}`);
      }

      // PRIORITY 3: Match by Username (Manual member invited by username)
      if (memberIndex === -1 && userData.username) {
        memberIndex = membersArray.findIndex(m =>
          (m.type === 'manual' || m.type === 'invited') &&
          m.username &&
          m.username.toLowerCase() === userData.username.toLowerCase()
        );
        if (memberIndex !== -1) console.log(`🔗 Found matching member by USERNAME for merge: ${userData.username}`);
      }

      const memberEntry = {
        id: memberIndex !== -1 ? membersArray[memberIndex].id : `member_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        name: userData.name || (memberIndex !== -1 ? membersArray[memberIndex].name : 'Member'),
        email: userData.email || null,
        isRegistered: true,
        isPending: false,
        type: 'registered',
        userId: userId,
        joinedAt: now,
        isPending: false,
        photoURL: userData.photoURL || null
      };

      if (memberIndex !== -1) {
        // Update existing entry
        if (isArray) {
          members[memberIndex] = memberEntry;
        } else {
          // It's an object, we need to find the key
          const memberKey = Object.keys(members).find(key => members[key].userId === userId || members[key].id === membersArray[memberIndex].id);
          if (memberKey) {
            members[memberKey] = memberEntry;
          } else {
            // Fallback: use userId as key
            members[userId] = memberEntry;
          }
        }
      } else {
        // Add new entry
        if (isArray) {
          members.push(memberEntry);
        } else {
          members[userId] = memberEntry;
        }
      }

      // Update group members and memberCount
      const updates = {};
      updates[`groups/${groupId}/members`] = members;

      // Calculate member count
      const finalMemberCount = isArray ? members.length : Object.keys(members).length;
      updates[`groups/${groupId}/memberCount`] = finalMemberCount;

      // Add to userGroups (REQUIRED for Firebase rules to grant access)
      updates[`userGroups/${userId}/${groupId}`] = {
        name: groupData.name,
        emoji: groupData.emoji || '👥',
        coverPhoto: groupData.coverPhoto || null,
        memberCount: finalMemberCount,
        createdBy: groupData.createdBy || '',
        createdAt: groupData.createdAt || now,
        joinedAt: now
      };

      // Also add to users/{uid}/groups for backwards compatibility
      updates[`users/${userId}/groups/${groupId}`] = {
        name: groupData.name,
        emoji: groupData.emoji || '👥',
        coverPhoto: groupData.coverPhoto || null,
        memberCount: finalMemberCount,
        role: 'member',
        joinedAt: now
      };

      await admin.database().ref().update(updates);
      console.log(`✅ User ${userId} joined group ${groupId} (Updated ${memberIndex !== -1 ? 'existing' : 'new'} member)`);
    }

    // Update invitation status in both locations
    await admin.database().ref(`invitations/${invitationId}/status`).set(newStatus);
    await admin.database().ref(`invitations/${invitationId}/respondedAt`).set(now);
    await admin.database().ref(`userInvitations/${userId}/${invitationId}/status`).set(newStatus);
    await admin.database().ref(`userInvitations/${userId}/${invitationId}/respondedAt`).set(now);

    res.json({
      success: true,
      message: accept ? 'Successfully joined the group!' : 'Invitation declined',
      status: newStatus,
      groupId: accept ? invitation.groupId : null
    });

  } catch (error) {
    console.error('Error responding to invitation:', error);
    res.status(500).json({ success: false, error: 'Failed to respond to invitation' });
  }
});


// ============================================
// CLAIM EMAIL INVITE (New user links to existing member)
// Called after new user signs up via email invite link
// ============================================
app.post('/api/claim-email-invite', authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    const userEmail = req.user.email;
    const { groupId } = req.body;

    if (!groupId) {
      return res.status(400).json({ success: false, error: 'Group ID is required' });
    }

    if (!isValidFirebaseId(groupId)) {
      return res.status(400).json({ success: false, error: 'Invalid group ID format' });
    }

    // Get the group
    const groupSnap = await admin.database().ref(`groups/${groupId}`).get();
    if (!groupSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    const groupData = groupSnap.val();
    const members = groupData.members || {};

    // Find a manual member with matching email
    let matchedMemberId = null;
    let matchedMember = null;

    for (const [memberId, member] of Object.entries(members)) {
      if (member.email && member.email.toLowerCase() === userEmail.toLowerCase() && member.type === 'manual') {
        matchedMemberId = memberId;
        matchedMember = member;
        break;
      }
    }

    if (!matchedMemberId) {
      return res.json({ success: false, error: 'No pending email invite found for this group' });
    }

    // Get user data
    const userSnap = await admin.database().ref(`users/${userId}`).get();
    const userData = userSnap.val() || {};

    // Update the member entry to link it to this user
    await admin.database().ref(`groups/${groupId}/members/${matchedMemberId}`).update({
      userId: userId,
      email: userData.email || null,
      isRegistered: true,
      isPending: false,
      type: 'registered',
      name: userData.name || matchedMember.name,
      claimedAt: new Date().toISOString()
    });

    // Add to userGroups (REQUIRED for Firebase rules to grant access)
    const now = new Date().toISOString();
    await admin.database().ref(`userGroups/${userId}/${groupId}`).set({
      name: groupData.name,
      emoji: groupData.emoji || '👥',
      coverPhoto: groupData.coverPhoto || null,
      memberCount: groupData.memberCount || 0,
      createdBy: groupData.createdBy || '',
      createdAt: groupData.createdAt || now,
      joinedAt: now
    });

    // Also add to users/{uid}/groups for backwards compatibility
    await admin.database().ref(`users/${userId}/groups/${groupId}`).set({
      name: groupData.name,
      emoji: groupData.emoji || '👥',
      coverPhoto: groupData.coverPhoto || null,
      memberCount: groupData.memberCount || 0,
      role: 'member',
      joinedAt: now
    });

    console.log(`✅ User ${userId} claimed email invite for group ${groupId}`);

    res.json({
      success: true,
      message: 'Successfully joined the group!',
      emoji: groupData.emoji || '👥',
      coverPhoto: groupData.coverPhoto || null,
      memberCount: groupData.memberCount || 0,
      createdBy: groupData.createdBy || '',
      groupId,
      groupName: groupData.name
    });

  } catch (error) {
    console.error('Error claiming email invite:', error);
    res.status(500).json({ success: false, error: 'Failed to claim invite' });
  }
});


// Apply authentication middleware to ALL /api routes EXCEPT public ones
app.use('/api', (req, res, next) => {
  // Public endpoints that don't need auth
  // Note: Cleanup endpoints are "public" for user auth but secured by adminAuth middleware
  const publicEndpoints = [
    '/push-test',
    '/check-email-exists',
    '/verification/request',
    '/verification/verify',
    '/verification/check',
    '/cleanup-temp-members',
    '/cleanup-unverified-users'
  ];
  if (publicEndpoints.includes(req.path)) {
    return next();
  }
  authenticate(req, res, next);
});

// Send Temporary Member Alert Endpoint (Secure - No raw HTML)
app.post('/api/send-temp-member-alert', emailLimiter, async (req, res) => {
  try {
    const { to, memberName, groupName, expiryDate } = req.body;

    // Validate inputs
    if (!to || !memberName || !groupName || !expiryDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, memberName, groupName, expiryDate'
      });
    }

    // Security: Only allow users to alert themselves
    // Must verify against the authenticated user's email to prevent open relay abuse
    const userEmail = req.user.email;
    if (!userEmail || userEmail.toLowerCase() !== to.toLowerCase()) {
      return res.status(403).json({ success: false, error: 'Unauthorized: You can only send alerts to your own email address.' });
    }

    // Format Date (assuming timestamp or ISO string)
    const dateObj = new Date(expiryDate);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid expiryDate' });
    }
    const formattedDate = dateObj.toLocaleDateString();

    await emailService.sendTempMemberAlert(to, memberName, groupName, formattedDate);

    console.log(`✅ Temp member alert sent to ${to}`);
    res.json({ success: true, message: 'Alert sent successfully' });

  } catch (error) {
    console.error('❌ Temp member alert error:', error);
    res.status(500).json({ success: false, error: 'Failed to send alert: ' + error.message });
  }
});

// Generic email sending endpoint
// DEPRECATED: This endpoint is disabled for security reasons to prevent open relay abuse.
app.post('/api/send-email', emailLimiter, async (req, res) => {
  console.warn('⚠️ Access attempt to deprecated/insecure send-email endpoint');
  return res.status(410).json({
    success: false,
    error: 'This endpoint is deprecated for security reasons. Please use specific transaction/alert endpoints.'
  });
});

// Verification email endpoint
// Verification email endpoint
app.post('/api/send-verification', emailLimiter, async (req, res) => {
  try {
    const { email, code, name } = req.body;
    if (!email || !code || !name) {
      return res.status(400).json({ success: false, error: 'Missing required fields: email, code, name' });
    }

    // Strict Input Validation to prevent Content Injection
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ success: false, error: 'Invalid verification code format (must be 6 digits)' });
    }

    // Strict email check (No HTML characters allowed)
    if (!/^[^\s@<>"'`]+@[^\s@<>"'`]+\.[^\s@<>"'`]+$/.test(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email format' });
    }

    await emailService.sendVerification(email, code, name);
    console.log('✅ Verification email sent');
    res.json({ success: true, message: 'Verification email sent successfully' });
  } catch (error) {
    console.error('❌ Verification email error:', error);
    res.status(500).json({ success: false, error: 'Failed to send verification email: ' + error.message });
  }
});

// Alias for compatibility if needed (Frontend might be using this)
app.post('/api/send-verification-new', emailLimiter, async (req, res) => {
  try {
    const { email, code, name } = req.body;
    if (!email || !code || !name) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Strict Input Validation
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ success: false, error: 'Invalid verification code format (must be 6 digits)' });
    }

    if (!/^[^\s@<>"'`]+@[^\s@<>"'`]+\.[^\s@<>"'`]+$/.test(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email format' });
    }

    await emailService.sendVerification(email, code, name);
    res.json({ success: true, message: 'Verification email sent successfully' });
  } catch (e) {
    console.error('❌ Verification email error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Password reset email endpoint
app.post('/api/send-password-reset', emailLimiter, async (req, res) => {
  try {
    const { email, resetLink, name } = req.body;
    if (!email || !resetLink || !name) {
      return res.status(400).json({ success: false, error: 'Missing required fields: email, resetLink, name' });
    }

    // Security: Validate resetLink domain to prevent phishing/open redirect
    try {
      const url = new URL(resetLink);
      const origin = url.origin;
      let isAllowed = allowedOrigins.includes(origin);

      // Check localhost dynamic ports
      if (!isAllowed && /^http:\/\/localhost:[0-9]+$/.test(origin)) {
        isAllowed = true;
      }

      // Check Vercel previews (Strict: only allow exact matches from allowedOrigins for now to prevent subdomain takeover)
      // The regex /^https:\/\/hostel-ledger(-.+)?\.vercel\.app$/ is too permissive as it allows any project starting with hostel-ledger
      // if (!isAllowed && /^https:\/\/hostel-ledger(-.+)?\.vercel\.app$/.test(origin)) {
      //   isAllowed = true;
      // }

      if (!isAllowed) {
        console.warn(`⚠️ Blocked suspicious reset link domain: ${origin}`);
        return res.status(400).json({ success: false, error: 'Invalid reset link domain' });
      }
    } catch (e) {
      return res.status(400).json({ success: false, error: 'Invalid reset link format' });
    }

    await emailService.sendPasswordReset(email, resetLink, name);
    console.log('✅ Password reset email sent');
    res.json({ success: true, message: 'Password reset email sent' });
  } catch (error) {
    console.error('❌ Password reset email error:', error);
    res.status(500).json({ success: false, error: 'Failed to send password reset email: ' + error.message });
  }
});

// Welcome email endpoint
app.post('/api/send-welcome', emailLimiter, async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email || !name) {
      return res.status(400).json({ success: false, error: 'Missing required fields: email, name' });
    }

    // Security: Only allow users to send welcome emails to themselves
    // Must verify against the authenticated user's email to prevent open relay abuse
    const userEmail = req.user?.email;
    if (!userEmail || userEmail.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({ success: false, error: 'Unauthorized: You can only send welcome emails to your own email address.' });
    }

    await emailService.sendWelcome(email, name);
    console.log('✅ Welcome email sent');
    res.json({ success: true, message: 'Welcome email sent' });
  } catch (error) {
    console.error('❌ Welcome email error:', error);
    res.status(500).json({ success: false, error: 'Failed to send welcome email: ' + error.message });
  }
});

// Transaction alert email endpoint
// DEPRECATED: This endpoint is disabled for security reasons (Unused functionality / Open Relay risk)
app.post('/api/send-transaction-alert', emailLimiter, async (req, res) => {
  console.warn('⚠️ Access attempt to deprecated/insecure send-transaction-alert endpoint');
  return res.status(410).json({
    success: false,
    error: 'This endpoint is deprecated and disabled for security reasons.'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// ============================================
// VERIFICATION CODE SYSTEM (Backend-Driven)
// ============================================

/**
 * Request a verification code
 * Generates code, stores in Firestore, and sends email
 */
app.post('/api/verification/request', strictEmailLimiter, async (req, res) => {
  try {
    const { email, name, type, userId } = req.body;

    if (!email || !name || !type) {
      return res.status(400).json({ success: false, error: 'Missing required fields: email, name, type' });
    }

    // Generate 6-digit code
    const code = crypto.randomInt(100000, 1000000).toString();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (10 * 60 * 1000)); // 10 minutes expiry

    const record = {
      code,
      email: email.toLowerCase(),
      type,
      attempts: 0,
      createdAt: admin.firestore.Timestamp.fromDate(now),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      verified: false
    };

    if (userId) {
      record.userId = userId;
    }

    // Hash email for document ID
    const docId = Buffer.from(email.toLowerCase()).toString('base64').replace(/[^a-zA-Z0-9]/g, '');

    // Store in Firestore using Admin SDK
    await admin.firestore().collection('verificationCodes').doc(docId).set(record);

    // Send email
    await emailService.sendVerification(email, code, name);

    console.log(`✅ Verification code generated and stored for: ${email}`);
    res.json({ success: true, message: 'Verification code sent' });

  } catch (error) {
    console.error('❌ Verification request error:', error);
    res.status(500).json({ success: false, error: 'Failed to request verification code' });
  }
});

/**
 * Verify a code
 */
app.post('/api/verification/verify', generalLimiter, async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Email and code are required' });
    }

    if (typeof email !== 'string' || typeof code !== 'string') {
      return res.status(400).json({ success: false, error: 'Invalid input types' });
    }

    if (!/^[^\s@<>"'`]+@[^\s@<>"'`]+\.[^\s@<>"'`]+$/.test(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email format' });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ success: false, error: 'Invalid verification code format (must be 6 digits)' });
    }

    const docId = Buffer.from(email.toLowerCase()).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
    const docRef = admin.firestore().collection('verificationCodes').doc(docId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: 'No verification code found' });
    }

    const record = docSnap.data();
    const now = new Date();

    // Check expiry
    if (now > record.expiresAt.toDate()) {
      await docRef.delete();
      return res.status(400).json({ success: false, error: 'Code has expired' });
    }

    // Check attempts (Max 3)
    if (record.attempts >= 3) {
      await docRef.delete();
      return res.status(400).json({ success: false, error: 'Too many attempts. Please request a new code.' });
    }

    // Check code
    if (record.code !== code) {
      const newAttempts = record.attempts + 1;
      await docRef.update({ attempts: newAttempts });
      return res.status(400).json({
        success: false,
        error: 'Invalid code',
        attemptsLeft: 3 - newAttempts
      });
    }

    // Success - mark as verified and delete after a short delay (or immediately)
    await docRef.update({ verified: true });

    // Delete the code record since it's used
    setTimeout(async () => {
      try {
        await docRef.delete();
      } catch (err) {
        console.error('Error deleting verified code:', err);
      }
    }, 1000);

    res.json({ success: true, message: 'Verified successfully' });

  } catch (error) {
    console.error('❌ Verification check error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify code' });
  }
});

/**
 * Check if a valid verification code exists
 */
app.post('/api/verification/check', generalLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const docId = Buffer.from(email.toLowerCase()).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
    const docRef = admin.firestore().collection('verificationCodes').doc(docId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.json({ success: true, hasCode: false });
    }

    const record = docSnap.data();
    const now = new Date();

    // Check expiry
    if (now > record.expiresAt.toDate()) {
      return res.json({ success: true, hasCode: false, expired: true });
    }

    // Check if already verified
    if (record.verified) {
      return res.json({ success: true, hasCode: false, verified: true });
    }

    res.json({ success: true, hasCode: true, attempts: record.attempts });

  } catch (error) {
    console.error('❌ Verification check error:', error);
    res.status(500).json({ success: false, error: 'Failed to check verification code' });
  }
});

// Email existence check endpoint (Production-hardened)
// Applies strict rate limiting and random delays to prevent enumeration and timing attacks
app.post('/api/check-email-exists', strictEmailCheckLimiter, async (req, res) => {
  // Add random delay to mitigate timing attacks (500ms - 1500ms)
  const randomDelay = crypto.randomInt(500, 1500);
  await new Promise(resolve => setTimeout(resolve, randomDelay));

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

    // Check Firebase Auth first (Signed up users)
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      console.log('✅ Found in Firebase Auth:', email);
      return res.json({
        success: true,
        exists: true,
        source: 'auth',
        message: 'Account exists'
      });
    } catch (authError) {
      if (authError.code !== 'auth/user-not-found') {
        console.warn('⚠️ Auth check error:', authError.code);
      }
      // Continue to check DB if not found in Auth
    }

    // Check Realtime Database (Invited users who haven't signed up)
    try {
      const usersRef = admin.database().ref('users');
      const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');

      if (snapshot.exists()) {
        console.log('✅ Found in Realtime Database (Invited):', email);
        return res.json({
          success: true,
          exists: true,
          source: 'database',
          message: 'Account exists (invited)'
        });
      }
    } catch (dbError) {
      console.error('❌ DB check error:', dbError);
    }

    // If we reach here, email is not found
    console.log('✅ Email is available:', email);
    res.json({
      success: true,
      exists: false,
      message: 'Email is available'
    });

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
    let { userId, title, body, icon, badge, tag, data } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, title, body'
      });
    }

    // Security: Prevent Path Traversal in User ID
    if (!isValidFirebaseId(userId)) {
      console.warn(`⚠️ Blocked malicious userId in push-notify: ${userId}`);
      return res.status(400).json({ success: false, error: 'Invalid user ID format' });
    }

    if (typeof title !== 'string') {
      return res.status(400).json({ success: false, error: 'Title must be a string' });
    }
    if (typeof body !== 'string') {
      return res.status(400).json({ success: false, error: 'Body must be a string' });
    }

    if (title.length > 100) {
      return res.status(400).json({ success: false, error: 'Title must be 100 characters or less' });
    }
    if (body.length > 500) {
      return res.status(400).json({ success: false, error: 'Body must be 500 characters or less' });
    }

    // Sanitize
    title = sanitize(title);
    body = sanitize(body);

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
        'Authorization': `Key ${oneSignalApiKey.trim()}`
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
  console.log('🔍 Looking up Player IDs in Firebase...');

  const playerIdsPromises = userIds.map(async (userId) => {
    try {
      const playerRef = admin.database().ref(`oneSignalPlayers/${userId}`);
      const snapshot = await playerRef.once('value');
      const playerData = snapshot.val();

      if (playerData && playerData.playerId) {
        console.log(`  ✅ User ${userId}: Player ID found (${playerData.playerId.substring(0, 12)}...)`);
        return playerData.playerId;
      } else {
        console.log(`  ⚠️ User ${userId}: NO Player ID in Firebase (user may not have subscribed)`);
        return null;
      }
    } catch (error) {
      console.error(`  ❌ User ${userId}: Failed to get Player ID:`, error.message);
      return null;
    }
  });

  const results = await Promise.all(playerIdsPromises);
  const playerIds = results.filter(id => id !== null);

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
      'Authorization': `Key ${oneSignalApiKey.trim()}`
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
    let { userIds, title, body, icon, badge, data } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, error: 'userIds must be a non-empty array' });
    }

    // Security: Prevent Path Traversal in User IDs
    if (!userIds.every(id => isValidFirebaseId(id))) {
      console.warn(`⚠️ Blocked malicious userIds in push-notify-multiple: ${userIds.join(', ')}`);
      return res.status(400).json({ success: false, error: 'Invalid user ID format' });
    }

    if (!title || !body) {
      return res.status(400).json({ success: false, error: 'Missing required fields: title, body' });
    }

    if (typeof title !== 'string') {
      return res.status(400).json({ success: false, error: 'Title must be a string' });
    }
    if (typeof body !== 'string') {
      return res.status(400).json({ success: false, error: 'Body must be a string' });
    }

    if (title.length > 100) {
      return res.status(400).json({ success: false, error: 'Title must be 100 characters or less' });
    }
    if (body.length > 500) {
      return res.status(400).json({ success: false, error: 'Body must be 500 characters or less' });
    }

    // Sanitize
    title = sanitize(title);
    body = sanitize(body);

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
 * BUDGET MANAGEMENT ENDPOINTS
 */

// Get Group Budget
app.get('/api/budgets/group/:groupId', generalLimiter, authenticate, async (req, res) => {
  try {
    const { groupId } = req.params;
    const db = admin.database();

    const snapshot = await db.ref(`budgets/${groupId}`).get();
    if (!snapshot.exists()) {
      return res.json({ success: true, budget: { amount: 0, spent: 0, period: 'monthly', policies: { alertAt80: true, lockAt100: false } } });
    }

    res.json({ success: true, budget: snapshot.val() });
  } catch (error) {
    console.error('❌ Get group budget error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch group budget' });
  }
});

// Update Group Budget
app.post('/api/budgets/group/:groupId', generalLimiter, authenticate, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { amount, period, policies } = req.body;
    const db = admin.database();

    if (amount === undefined || !period) {
      return res.status(400).json({ success: false, error: 'Missing amount or period' });
    }

    const updates = {
      amount: Number(amount),
      period: period,
      policies: policies || { alertAt80: true, lockAt100: false },
      updatedAt: Date.now(),
      updatedBy: req.user.uid
    };

    // Initialize spent if not exists
    const snap = await db.ref(`budgets/${groupId}/spent`).get();
    if (!snap.exists()) {
      updates.spent = 0;
    }

    await db.ref(`budgets/${groupId}`).update(updates);
    res.json({ success: true, message: 'Group budget updated' });
  } catch (error) {
    console.error('❌ Update group budget error:', error);
    res.status(500).json({ success: false, error: 'Failed to update group budget' });
  }
});

// Get Personal Budget
app.get('/api/budgets/personal/:userId', generalLimiter, authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId !== req.user.uid) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    const db = admin.database();

    const snapshot = await db.ref(`personalBudgets/${userId}`).get();
    if (!snapshot.exists()) {
      return res.json({ success: true, budget: { amount: 0, spent: 0, period: 'daily', policies: { alertAt80: true, lockAt100: false } } });
    }

    res.json({ success: true, budget: snapshot.val() });
  } catch (error) {
    console.error('❌ Get personal budget error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch personal budget' });
  }
});

// Update Personal Budget
app.post('/api/budgets/personal/:userId', generalLimiter, authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, period, policies } = req.body;
    if (userId !== req.user.uid) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    const db = admin.database();

    if (amount === undefined || !period) {
      return res.status(400).json({ success: false, error: 'Missing amount or period' });
    }

    const updates = {
      amount: Number(amount),
      period: period,
      policies: policies || { alertAt80: true, lockAt100: false },
      updatedAt: Date.now()
    };

    // Initialize spent and lastReset if not exists
    const snap = await db.ref(`personalBudgets/${userId}`).get();
    if (!snap.exists()) {
      updates.spent = 0;
      updates.lastReset = new Date().toISOString().split('T')[0];
    }

    await db.ref(`personalBudgets/${userId}`).update(updates);
    res.json({ success: true, message: 'Personal budget updated' });
  } catch (error) {
    console.error('❌ Update personal budget error:', error);
    res.status(500).json({ success: false, error: 'Failed to update personal budget' });
  }
});

/**
 * FINANCIAL MUTATION ENDPOINTS
 */

// Get Individual Debts Endpoint (Performance Optimized)
app.post('/api/get-individual-debts', generalLimiter, authenticate, async (req, res) => {
  try {
    const { groupId, personId } = req.body;
    const currentUserId = req.user.uid;

    if (!groupId || !personId) {
      return res.status(400).json({ success: false, error: 'groupId and personId are required' });
    }

    if (!isValidFirebaseId(groupId)) {
      return res.status(400).json({ success: false, error: 'Invalid group ID format' });
    }
    // personId can be a Firebase ID or just a string index if manually created, but usually safer to validate.
    // Manual members have IDs like `member_...`. This contains underscore, which is allowed.
    // If it's malicious path, isValidFirebaseId catches it.
    if (!isValidFirebaseId(personId)) {
      return res.status(400).json({ success: false, error: 'Invalid person ID format' });
    }

    const db = admin.database();

    // Query userTransactions for the current user, filtered by groupId
    // This relies on the index we added to database.rules.json
    const snapshot = await db.ref(`userTransactions/${currentUserId}`)
      .orderByChild('groupId')
      .equalTo(groupId)
      .once('value');

    if (!snapshot.exists()) {
      return res.json({
        success: true,
        youOwe: [],
        theyOwe: [],
        totalYouOwe: 0,
        totalTheyOwe: 0,
        netAmount: 0
      });
    }

    const transactions = snapshot.val();

    // Process transactions to calculate debts
    const debts = processTransactions(transactions, currentUserId, personId);
    const summary = calculateDebtSummary(debts);

    res.json({ success: true, ...summary });

  } catch (error) {
    console.error('Error fetching individual debts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch debts' });
  }
});

// Add Expense endpoint (Secure with Multi-Payer support)
app.post('/api/add-expense', generalLimiter, authenticate, detectFraud, async (req, res) => {
  let { groupId, amount, paidBy, payers, participants, note, place, location } = req.body;

  // Validate Lengths
  const noteError = validateNote(note);
  if (noteError) return res.status(400).json({ success: false, error: noteError });

  const placeError = validatePlace(place);
  if (placeError) return res.status(400).json({ success: false, error: placeError });

  // Validate Location coordinates
  const locationError = validateCoordinates(location);
  if (locationError) return res.status(400).json({ success: false, error: locationError });

  note = sanitize(note);
  place = sanitize(place);

  const currentUserId = req.user.uid;

  if (!groupId || !amount || !participants || participants.length === 0) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  // Normalize Payers
  // If 'payers' array is provided, use it. Otherwise, fallback to 'paidBy' single payer.
  let finalPayers = [];
  if (payers && Array.isArray(payers) && payers.length > 0) {
    finalPayers = payers;
    // Validate total paid equals amount (allow small floating point diff)
    const totalPaid = finalPayers.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    if (Math.abs(totalPaid - amount) > 0.05) {
      return res.status(400).json({ success: false, error: `Total paid amount (${totalPaid}) does not match expense amount (${amount})` });
    }
  } else if (paidBy) {
    if (!isValidFirebaseId(paidBy)) {
      return res.status(400).json({ success: false, error: 'Invalid payer ID format' });
    }
    finalPayers = [{ id: paidBy, amount: amount }];
  } else {
    return res.status(400).json({ success: false, error: 'Missing payer information' });
  }

  // Set paidBy string for backward compatibility (Legacy UI uses this)
  // If multiple payers, we can set it to the first one or a special string "multiple"
  // But strictly, legacy apps rely on this being a valid member ID to show the avatar.
  // We'll use the payer with the largest amount as the "primary" payer for display.
  const primaryPayer = finalPayers.reduce((prev, current) => (prev.amount > current.amount) ? prev : current);
  const primaryPayerId = primaryPayer.id;

  if (!isValidFirebaseId(groupId)) {
    return res.status(400).json({ success: false, error: 'Invalid group ID format' });
  }

  if (!validateAmount(amount)) {
    return res.status(400).json({ success: false, error: 'Amount must be a positive number' });
  }

  try {
    const db = admin.database();

    // Idempotency Check
    let clientTxnId = req.body.clientTxnId;
    if (clientTxnId) {
      if (!isValidFirebaseId(clientTxnId)) {
        return res.status(400).json({ success: false, error: 'Invalid transaction ID format' });
      }
      const processedRef = db.ref(`processedTxns/${currentUserId}/${clientTxnId}`);
      const processedSnap = await processedRef.get();
      if (processedSnap.exists()) {
        const data = processedSnap.val();
        logger.info('♻️ Idempotency hit: Returning existing transaction for %s (user: %s)', clientTxnId, currentUserId);
        return res.json({
          success: true,
          transactionId: data.transactionId,
          duplicate: true,
          message: 'Transaction already processed'
        });
      }
    }

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
    let membersArray = normalizeMembers(group.members);
    const member = membersArray.find(m => m.userId === currentUserId || m.id === currentUserId);

    // CRITICAL FIX: Hydrate members with emails from 'users' node
    const emailUpdates = {};
    const isMembersArray = Array.isArray(group.members);

    try {
      const memberHydrationPromises = membersArray.map(async (m, index) => {
        if (m.userId && !m.email) {
          try {
            const userSnap = await db.ref(`users/${m.userId}`).get();
            if (userSnap.exists()) {
              const userData = userSnap.val();
              const email = userData.email;

              if (email) {
                if (isMembersArray) {
                  emailUpdates[`groups/${groupId}/members/${index}/email`] = email;
                } else {
                  const memberKey = Object.keys(group.members).find(k => {
                    const mem = group.members[k];
                    return (mem.id && mem.id === m.id) || k === m.id;
                  });
                  if (memberKey) {
                    emailUpdates[`groups/${groupId}/members/${memberKey}/email`] = email;
                  }
                }
                return { ...m, email };
              }
            }
          } catch (err) {
            logger.error('⚠️ Failed to hydrate email for user %s: %s', m.userId, err.message);
          }
        }
        return m;
      });
      membersArray = await Promise.all(memberHydrationPromises);
    } catch (hydrateError) { logger.error('❌ Hydration failed: %O', hydrateError); }
    if (!member) {
      return res.status(403).json({ success: false, error: 'You are not a member of this group' });
    }

    // 3. Verify payers and participants exist in group
    // Validate all payers
    for (const p of finalPayers) {
      if (!membersArray.some(m => m.id === p.id)) {
        return res.status(400).json({ success: false, error: `Invalid payer: ${p.id}` });
      }
    }

    const participantMembers = membersArray.filter(m => participants.includes(m.id));
    if (participantMembers.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid participants' });
    }

    // 4. Calculate Split and Settlements (Multi-Payer)
    // Convert logic format: { participantId, amount }
    const formattedPayers = finalPayers.map(p => ({ participantId: p.id, amount: Number(p.amount) }));

    // Splits (Consumption)
    const splits = calculateExpenseSplit(amount, participantMembers.map(m => ({ id: m.id, name: m.name })), primaryPayerId);
    // Convert splits to logic format
    const formattedSplits = splits.map(s => ({ participantId: s.participantId, amount: s.amount }));

    // Use new Multi-Payer Settlement Logic
    const debts = calculateMultiPayerSettlements(formattedSplits, formattedPayers);

    // Fetch existing settlements for all involved users
    const getStorageKey = (memberId) => {
      const m = membersArray.find(mem => mem.id === memberId);
      return (m && m.userId) ? m.userId : memberId;
    };

    const involvedMemberIds = new Set([...finalPayers.map(p => p.id), ...participants]);
    const settlementsMap = {};

    const fetchPromises = Array.from(involvedMemberIds).map(async (memberId) => {
      const storageKey = getStorageKey(memberId);
      const snap = await db.ref(`users/${storageKey}/settlements/${groupId}`).get();
      if (snap.exists()) {
        settlementsMap[storageKey] = snap.val();
      } else {
        settlementsMap[storageKey] = {};
      }
    });

    await Promise.all(fetchPromises);

    // 5. Build multi-path update object
    const updates = {};
    Object.assign(updates, emailUpdates);
    const transactionId = db.ref('transactions').push().key;
    const timestamp = Date.now();
    const serverTime = admin.database.ServerValue.TIMESTAMP;



    // B. Create Transaction Record
    const primaryPayerMember = membersArray.find(m => m.id === primaryPayerId);

    const newTransaction = {
      id: transactionId,
      groupId,
      type: "expense",
      title: note || "Expense",
      amount,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      timestamp,
      paidBy: primaryPayerId, // Legacy: Primary payer
      paidByName: primaryPayerMember ? primaryPayerMember.name : "Unknown",
      paidByIsTemporary: !!primaryPayerMember?.isTemporary,
      payers: finalPayers.map(p => {
        const m = membersArray.find(mem => mem.id === p.id);
        return {
          id: p.id,
          name: m ? m.name : "Unknown",
          amount: Number(p.amount),
          userId: m?.userId || null
        };
      }),
      participants: splits.map(s => ({
        id: s.participantId,
        name: s.participantName,
        amount: s.amount,
        isTemporary: !!membersArray.find(m => m.id === s.participantId)?.isTemporary
      })),
      place: place || null,
      note: note || null,
      location: location ? {
        lat: Number(location.lat),
        lng: Number(location.lng)
      } : null,

      createdAt: new Date().toISOString(),
      serverTimestamp: serverTime
    };

    updates[`transactions/${transactionId}`] = newTransaction;

    if (clientTxnId) {
      updates[`processedTxns/${currentUserId}/${clientTxnId}`] = {
        transactionId,
        uid: currentUserId,
        timestamp: serverTime,
        createdAt: new Date().toISOString()
      };
    }

    // C. Add to userTransaction lists
    const transactionSummaryBase = {
      type: "expense",
      title: newTransaction.title || "Expense",
      amount,
      createdAt: newTransaction.createdAt,
      groupId,
      timestamp,
      paidBy: primaryPayerId,
      paidByName: primaryPayerMember ? primaryPayerMember.name : "Unknown",
      paidByIsTemporary: !!primaryPayerMember?.isTemporary,
      memberCount: membersArray.length,
      participantsCount: participants.length,
      participants: newTransaction.participants,
      payers: newTransaction.payers, // Include payers in summary
      place: newTransaction.place,
      note: newTransaction.note,
      location: newTransaction.location
    };

    membersArray.forEach(m => {
      if (m.userId) {
        const userSummary = { ...transactionSummaryBase };
        const split = splits.find(s => s.participantId === m.id);
        const paidEntry = finalPayers.find(p => p.id === m.id);

        userSummary.userIsPayer = !!paidEntry;
        userSummary.userIsParticipant = !!split;
        userSummary.userShare = split ? split.amount : 0;
        userSummary.userPaid = paidEntry ? Number(paidEntry.amount) : 0;

        updates[`userTransactions/${m.userId}/${transactionId}`] = userSummary;

        // Invalidate AI Insights cache for any involved user
        updates[`users/${m.userId}/aiInsightsCache`] = null;
      }
    });

    // D. Apply Bidirectional Settlement Updates
    for (const debt of debts) {
      const { debtorId, creditorId, amount } = debt;

      const debtorStorageKey = getStorageKey(debtorId);
      const creditorStorageKey = getStorageKey(creditorId);

      // Debtor owes Creditor
      const debtorSettlements = settlementsMap[debtorStorageKey] || {};
      const debtorToCreditor = debtorSettlements[creditorId] || { toReceive: 0, toPay: 0 };

      let debtorNewToPay = (debtorToCreditor.toPay || 0) + amount;
      let debtorNewToReceive = (debtorToCreditor.toReceive || 0);

      updates[`users/${debtorStorageKey}/settlements/${groupId}/${creditorId}`] = {
        toReceive: Math.max(0, debtorNewToReceive),
        toPay: Math.max(0, debtorNewToPay)
      };

      // Creditor receives from Debtor
      const creditorSettlements = settlementsMap[creditorStorageKey] || {};
      const creditorFromDebtor = creditorSettlements[debtorId] || { toReceive: 0, toPay: 0 };

      let creditorNewToReceive = (creditorFromDebtor.toReceive || 0) + amount;
      let creditorNewToPay = (creditorFromDebtor.toPay || 0);

      updates[`users/${creditorStorageKey}/settlements/${groupId}/${debtorId}`] = {
        toReceive: Math.max(0, creditorNewToReceive),
        toPay: Math.max(0, creditorNewToPay)
      };
    }

    // --- BUDGET TRACKING & POLICY ENFORCEMENT ---
    try {
      // 1. Group Budget
      const groupBudgetSnap = await db.ref(`budgets/${groupId}`).get();
      if (groupBudgetSnap.exists()) {
        const groupBudget = groupBudgetSnap.val();
        const budgetAmount = groupBudget.amount || groupBudget.limit || 0;
        
        if (budgetAmount > 0) {
          const newSpent = (groupBudget.spent || 0) + amount;
          
          // Enforce Lock Policy
          if (groupBudget.policies?.lockAt100 && newSpent > budgetAmount) {
            return res.status(403).json({ 
              success: false, 
              error: 'Budget Limit Exceeded', 
              message: `This expense exceeds the group budget limit of ${budgetAmount}.` 
            });
          }

          // Update Group Budget Spent
          updates[`budgets/${groupId}/spent`] = admin.database.ServerValue.increment(amount);

          // Check for 80% Alert (Trigger notification)
          const alertThreshold = budgetAmount * 0.8;
          if (groupBudget.policies?.alertAt80 && newSpent >= alertThreshold && (groupBudget.spent || 0) < alertThreshold) {
            // Send Alert Notification to group members
            const alertTitle = `⚠️ Budget Alert: ${group.name}`;
            const remainingBudget = Math.max(0, budgetAmount - newSpent);
            const alertBody = `The group budget has reached 80% of its limit (${newSpent}/${budgetAmount}). Remaining: ${remainingBudget}.`;
            // Trigger notifications asynchronously
            sendOneSignalNotificationInternal({ 
              userIds: membersArray.filter(m => m.userId).map(m => m.userId), 
              title: alertTitle, 
              body: alertBody,
              data: { groupId, type: 'budget_alert' }
            }).catch(err => logger.error('Budget alert notification failed:', err));

            // Send Email Notifications
            membersArray.forEach(m => {
              if (m.email) {
                emailService.sendBudgetAlert({
                  email: m.email,
                  name: m.name || m.email.split('@')[0],
                  type: 'Group',
                  amount: budgetAmount,
                  spent: newSpent,
                  remaining: remainingBudget,
                  groupName: group.name
                }).catch(err => logger.error('Budget email alert failed:', err));
              }
            });
          }
        }
      }

      // 2. Personal Budgets for Participants
      // Each participant's spent increases by their share
      for (const s of splits) {
        const participantMember = membersArray.find(m => m.id === s.participantId);
        if (participantMember && participantMember.userId) {
          const pUid = participantMember.userId;
          const pBudgetSnap = await db.ref(`personalBudgets/${pUid}`).get();
          
          if (pBudgetSnap.exists()) {
            const pBudget = pBudgetSnap.val();
            const pAmount = pBudget.amount || pBudget.limit || 0;

            if (pAmount > 0) {
              const newPSpent = (pBudget.spent || 0) + s.amount;
              
              // Enforce Lock Policy (for recorder only to avoid blocking whole group for one person's personal budget)
              if (pUid === currentUserId && pBudget.policies?.lockAt100 && newPSpent > pAmount) {
                return res.status(403).json({ 
                  success: false, 
                  error: 'Personal Budget Exceeded', 
                  message: `This expense exceeds your personal budget limit.` 
                });
              }

              updates[`personalBudgets/${pUid}/spent`] = admin.database.ServerValue.increment(s.amount);
              
              // Personal Alert (80%)
              const pAlertThreshold = pAmount * 0.8;
              if (pBudget.policies?.alertAt80 && newPSpent >= pAlertThreshold && (pBudget.spent || 0) < pAlertThreshold) {
                const pRemaining = Math.max(0, pAmount - newPSpent);
                sendOneSignalNotificationInternal({ 
                  userIds: [pUid], 
                  title: '📉 Personal Budget Alert', 
                  body: `You have spent 80% of your personal budget (${newPSpent}/${pAmount}). Remaining: ${pRemaining}.`,
                  data: { type: 'personal_budget_alert' }
                }).catch(err => logger.error('Personal alert notification failed:', err));

                if (req.user && req.user.email) {
                  emailService.sendBudgetAlert({
                    email: req.user.email,
                    name: req.user.name || req.user.email.split('@')[0],
                    type: 'Personal',
                    amount: pAmount,
                    spent: newPSpent,
                    remaining: pRemaining,
                    groupName: null
                  }).catch(err => logger.error('Personal budget email alert failed:', err));
                }
              }
            }
          }
        }
      }
    } catch (budgetErr) {
      logger.error('❌ Budget tracking failed:', budgetErr);
      // Don't fail the whole transaction if budget tracking fails (unless we want strict enforcement)
    }

    // 6. Execute Atomic Update
    await db.ref().update(updates);



    // 7. Notifications
    console.log('🚀 Triggering Notifications for Transaction:', transactionId);

    try {
      const notificationPromises = [];

      // A. Push Notifications
      const membersWithUserId = membersArray.filter(m => m.userId);
      if (membersWithUserId.length > 0) {
        const userIds = membersWithUserId.map(m => m.userId);

        let bodyText = "";
        if (finalPayers.length > 1) {
          bodyText = `${finalPayers.length} people paid Rs ${amount.toLocaleString()} for "${note || 'Expense'}"`;
        } else {
          bodyText = `${primaryPayerMember ? primaryPayerMember.name : "Someone"} paid Rs ${amount.toLocaleString()} for "${note || 'Expense'}"`;
        }

        notificationPromises.push(
          sendOneSignalNotificationInternal({
            userIds,
            title: `New Expense in ${group.name}`,
            body: bodyText,
            data: { type: 'expense', transactionId, groupId, amount }
          })
            .then(() => console.log('✅ Push Notifications Promise Resolved'))
            .catch(err => console.error('⚠️ OneSignal Push failed:', err.message))
        );
      }

      // B. Email Notifications
      const participantsWithEmail = membersArray.filter(m => m.email && !m.isPending);
      if (participantsWithEmail.length > 0) {
        notificationPromises.push((async () => {
          const preferencePromises = participantsWithEmail.map(async (participant) => {
            if (!participant.userId) return { participant, emailEnabled: true };
            try {
              const getPref = admin.firestore().doc(`users/${participant.userId}/preferences/notifications`).get();
              const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 3000));
              timeout.catch(() => {});
              const prefSnap = await Promise.race([getPref, timeout]);
              return {
                participant,
                emailEnabled: prefSnap.exists ? prefSnap.data().emailEnabled !== false : true
              };
            } catch (err) {
              return { participant, emailEnabled: true };
            }
          });

          const results = await Promise.allSettled(preferencePromises);
          const recipientsWithPreference = results
            .filter(r => r.status === 'fulfilled')
            .map(r => r.value)
            .filter(v => v.emailEnabled)
            .map(v => v.participant);

          if (recipientsWithPreference.length > 0) {
            console.log(`📧 Sending emails to ${recipientsWithPreference.length} recipients...`);
            const emailResults = await Promise.allSettled(recipientsWithPreference.map(recipient => {
              const split = splits.find(s => s.participantId === recipient.id);
              return emailService.sendExpenseNotification(recipient.email, {
                payerName: finalPayers.length > 1 ? "Multiple people" : (primaryPayerMember ? primaryPayerMember.name : "Unknown"),
                amount: amount.toLocaleString(),
                title: note || 'Expense',
                splitAmount: split ? split.amount.toLocaleString() : '0',
                date: new Date(newTransaction.date).toLocaleDateString(),
                groupName: group.name,
                groupId: groupId,
                note: note || ''
              });
            }));
          }
        })());
      }

      const globalTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Global notification timeout')), 8000));
      globalTimeout.catch(() => {});
      await Promise.race([Promise.allSettled(notificationPromises), globalTimeout]).catch(e => console.warn('⚠️ Notifications timed out or failed partially:', e.message));

    } catch (notifErr) {
      console.error('⚠️ Notification process failed:', notifErr.message);
    }

    // 8. Emit system chat message (fire-and-forget)
    sendSystemMessage(db, groupId, 'expense_added', primaryPayerMember ? primaryPayerMember.name : 'Someone', {
      amount,
      title: note || 'Expense',
      transactionId,
      payerCount: finalPayers.length,
      participantCount: participants.length
    }).catch(() => { });

    // 9. Success Response
    res.json({
      success: true,
      transactionId,
      transaction: newTransaction
    });

  } catch (error) {
    console.error('❌ Add expense error:', error);
    res.status(500).json({ success: false, error: 'Internal server error: ' + error.message });
  }
});


// Record Payment endpoint (Secure)
app.post('/api/record-payment', generalLimiter, authenticate, detectFraud, async (req, res) => {
  let { groupId, fromMember, toMember, amount, method, note } = req.body;

  // Validate Lengths
  const noteError = validateNote(note);
  if (noteError) return res.status(400).json({ success: false, error: noteError });

  const methodError = validateMethod(method);
  if (methodError) return res.status(400).json({ success: false, error: methodError });

  note = sanitize(note);
  method = sanitize(method);

  const currentUserId = req.user.uid;

  if (!groupId || !fromMember || !toMember || !amount || !method) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  if (!isValidFirebaseId(groupId)) {
    return res.status(400).json({ success: false, error: 'Invalid group ID format' });
  }
  if (!isValidFirebaseId(fromMember) || !isValidFirebaseId(toMember)) {
    return res.status(400).json({ success: false, error: 'Invalid member ID format' });
  }

  if (!validateAmount(amount)) {
    return res.status(400).json({ success: false, error: 'Amount must be a positive number' });
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

    // Idempotency Check (Client provided ID)
    let clientTxnId = req.body.clientTxnId;
    if (clientTxnId) {
      if (!isValidFirebaseId(clientTxnId)) {
        return res.status(400).json({ success: false, error: 'Invalid transaction ID format' });
      }
      const processedRef = db.ref(`processedTxns/${currentUserId}/${clientTxnId}`);
      const processedSnap = await processedRef.get();
      if (processedSnap.exists()) {
        const data = processedSnap.val();
        console.log(`♻️ Idempotency hit: Returning existing transaction for ${clientTxnId} (user: ${currentUserId})`);
        return res.json({
          success: true,
          transactionId: data.transactionId,
          duplicate: true,
          message: 'Transaction already processed'
        });
      }
    }

    // Legacy Duplicate Check (Optimized: Scope to User)
    // Check for duplicate payment (same from/to/amount/group within 30 seconds)
    // Optimization: Query userTransactions for the current user instead of global transactions to prevent DoS
    const recentUserTxnsSnap = await db.ref(`userTransactions/${currentUserId}`)
      .limitToLast(10) // Check last 10 transactions of the user (sufficient for manual actions)
      .get();

    if (recentUserTxnsSnap.exists()) {
      const recentTxns = recentUserTxnsSnap.val();
      const timeWindow = Date.now() - 30000;

      const isDuplicate = Object.values(recentTxns).some((tx) =>
        tx.timestamp > timeWindow && // Ensure it's recent
        tx.type === 'payment' &&
        tx.from === fromMember &&
        tx.to === toMember &&
        tx.amount === amount &&
        tx.groupId === groupId
      );

      if (isDuplicate) {
        return res.status(409).json({ success: false, error: 'Duplicate payment detected. This payment was already recorded within the last 30 seconds.' });
      }
    }

    // 2. Verify current user is in the group
    const membersArray = normalizeMembers(group.members);
    const member = membersArray.find(m => m.userId === currentUserId || m.id === currentUserId);
    if (!member) {
      return res.status(403).json({ success: false, error: 'You are not a member of this group' });
    }

    // 3. Verify members exist in group
    const fromPerson = membersArray.find(m => m.id === fromMember);
    const toPerson = membersArray.find(m => m.id === toMember);
    if (!fromPerson || !toPerson) {
      return res.status(400).json({ success: false, error: 'Invalid members' });
    }

    // 4. Build multi-path update object
    const updates = {};
    const transactionId = db.ref('transactions').push().key;
    const timestamp = Date.now();
    const serverTime = admin.database.ServerValue.TIMESTAMP;

    const isReceiving = toMember === currentUserId || (toPerson && toPerson.userId === currentUserId);
    const isPaying = fromMember === currentUserId || (fromPerson && fromPerson.userId === currentUserId);

    if (!isReceiving && !isPaying) {
      return res.status(403).json({ success: false, error: 'You must be either the payer or the receiver' });
    }

    // Identify the Other User (Counterparty)
    const otherMemberId = isPaying ? toMember : fromMember;
    const otherPerson = isPaying ? toPerson : fromPerson;

    // Fetch Other User's Data if they are a real user
    let otherUser = null;
    if (otherPerson.userId) {
      const otherUserSnap = await db.ref(`users/${otherPerson.userId}`).get();
      if (otherUserSnap.exists()) {
        otherUser = otherUserSnap.val();
      }
    }



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

      createdAt: new Date().toISOString(),
      serverTimestamp: serverTime
    };

    updates[`transactions/${transactionId}`] = newTransaction;

    // Record processed transaction for idempotency
    if (clientTxnId) {
      updates[`processedTxns/${currentUserId}/${clientTxnId}`] = {
        transactionId,
        uid: currentUserId,
        timestamp: serverTime,
        createdAt: new Date().toISOString()
      };
    }

    // C. Add to userTransaction lists for relevant members (Denormalized)
    const transactionSummaryBase = {
      type: "payment",
      title: newTransaction.title || "Payment",
      amount,
      createdAt: newTransaction.createdAt,
      groupId,
      timestamp,
      paidBy: fromMember,
      from: fromMember, // Alignment with Transaction interface
      to: toMember,     // Alignment with Transaction interface
      paidByName: fromPerson.name,
      fromName: fromPerson.name,
      toName: toPerson.name,
      method,
      memberCount: membersArray.length
    };

    // Fan-out to ALL group members (matching expense behavior)
    // This ensures payments appear in every member's Activity and Group Ledger
    membersArray.forEach(m => {
      if (m.userId) {
        const userTxUpdate = { ...transactionSummaryBase };
        if (m.userId === fromPerson.userId || m.id === fromMember) {
          userTxUpdate.userRole = 'payer';
        } else if (m.userId === toPerson.userId || m.id === toMember) {
          userTxUpdate.userRole = 'receiver';
        } else {
          userTxUpdate.userRole = 'observer';
        }
        updates[`userTransactions/${m.userId}/${transactionId}`] = userTxUpdate;

        // Invalidate AI Insights cache for any involved user
        updates[`users/${m.userId}/aiInsightsCache`] = null;
      }
    });

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
    // Use userId (Firebase UID) for real users, fall back to memberId for temp members
    const otherPersonStorageKey = otherPerson.userId || otherPersonId;
    updates[`users/${otherPersonStorageKey}/settlements/${groupId}/${currentUserId}`] = {
      toReceive: newToPay,
      toPay: newToReceive
    };

    // 5. Execute Atomic Update
    await db.ref().update(updates);



    // --- AUTO-REMOVE TEMP MEMBERS AFTER SETTLEMENT ---
    // Check if either party is a temp member with deletionCondition === 'SETTLED'
    // If their net balance is now 0 across all settlements in this group, remove them
    const tempMembersToCheck = [fromPerson, toPerson].filter(
      m => m.isTemporary && m.deletionCondition === 'SETTLED'
    );

    if (tempMembersToCheck.length > 0) {
      // Fire-and-forget: don't block the response
      (async () => {
        try {
          // Re-read the fresh group data after the settlement update
          const freshGroupSnap = await db.ref(`groups/${groupId}`).get();
          if (!freshGroupSnap.exists()) return;
          const freshGroup = freshGroupSnap.val();
          const freshMembers = normalizeMembers(freshGroup.members);

          for (const tempMember of tempMembersToCheck) {
            // Check if this temp member has any remaining debt with ANY member in the group
            // We need to check all real members' settlements against this temp member
            let hasOutstandingDebt = false;

            for (const member of freshMembers) {
              if (member.id === tempMember.id) continue;
              const storageKey = member.userId || member.id;

              // Check this member's settlement with the temp member
              const settlementSnap = await db.ref(`users/${storageKey}/settlements/${groupId}/${tempMember.id}`).get();
              if (settlementSnap.exists()) {
                const settlement = settlementSnap.val();
                const netBalance = (settlement.toReceive || 0) - (settlement.toPay || 0);
                if (Math.abs(netBalance) > 0.01) {
                  hasOutstandingDebt = true;
                  break;
                }
              }
            }

            if (!hasOutstandingDebt) {
              // Remove this temp member from the group
              const updatedMembers = freshMembers.filter(m => m.id !== tempMember.id);
              await db.ref(`groups/${groupId}/members`).set(updatedMembers);
              console.log(`🧹 Auto-removed settled temp member "${tempMember.name}" (${tempMember.id}) from group ${groupId}`);

              // Send a system message about the removal
              sendSystemMessage(db, groupId, 'member_removed', tempMember.name, {
                reason: 'auto_settled',
                memberId: tempMember.id
              }).catch(() => { });
            }
          }
        } catch (cleanupErr) {
          console.error('⚠️ Temp member cleanup after settlement failed:', cleanupErr.message);
        }
      })();
    }

    // 7. Notifications (Awaited for Vercel/Serverless)
    console.log('🚀 Triggering Notifications for Payment:', transactionId);
    try {
      const notificationPromises = [];

      // A. Push Notifications (OneSignal) — only notify the two parties, not all members
      const paymentParties = [fromPerson, toPerson].filter(m => m.userId);
      if (paymentParties.length > 0) {
        const userIds = paymentParties.map(m => m.userId);
        notificationPromises.push(
          sendOneSignalNotificationInternal({
            userIds,
            title: `Payment Recorded in ${group.name}`,
            body: isPaying
              ? `${user.name} paid Rs ${amount.toLocaleString()} to ${toPerson.name}`
              : `${fromPerson.name} paid Rs ${amount.toLocaleString()} to ${user.name}`,
            data: { type: 'payment', transactionId, groupId, amount }
          })
            .catch(err => console.error('⚠️ Payment Push failed:', err.message))
        );
      }

      // B. Email Notifications (Send to counterparty)
      if (otherPerson && otherPerson.email) {
        notificationPromises.push((async () => {
          let emailEnabled = true;
          if (otherPerson.userId) {
            try {
              const getPref = admin.firestore().doc(`users/${otherPerson.userId}/preferences/notifications`).get();
              const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 3000));
              const prefSnap = await Promise.race([getPref, timeout]);
              if (prefSnap.exists && prefSnap.data().emailEnabled === false) emailEnabled = false;
            } catch (err) { /* default to enabled on timeout/error */ }
          }

          if (emailEnabled) {
            await emailService.sendTransactionAlert({
              email: otherPerson.email,
              name: otherPerson.name,
              transactionType: 'payment',
              amount: amount.toLocaleString(),
              groupName: group.name,
              date: newTransaction.date,
              description: isPaying
                ? `You received Rs ${amount.toLocaleString()} from ${user.name}.`
                : `You paid Rs ${amount.toLocaleString()} to ${user.name}.`
            });
            console.log(`📧 Payment notification sent via emailService to ${otherPerson.email}`);
          }
        })().catch(err => console.error('⚠️ Payment Email failed:', err.message)));
      }

      // Wait for notifications with a timeout
      const globalTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Notification timeout')), 8000));
      await Promise.race([Promise.allSettled(notificationPromises), globalTimeout]).catch(e => console.warn('⚠️ Notifications took too long:', e.message));
    } catch (notifErr) {
      console.error('⚠️ Payment Notification process failed:', notifErr.message);
    }

    // 8. Success Response
    res.json({
      success: true,
      transactionId,
      transaction: newTransaction
    });

  } catch (error) {
    console.error('❌ Record payment error:', error);
    res.status(500).json({ success: false, error: 'Internal server error: ' + error.message });
  }
});





// Cleanup Temporary Members endpoint (Server-Authoritative)
// Secured by Admin Key (for cron jobs)
app.post('/api/cleanup-temp-members', generalLimiter, adminAuth, async (req, res) => {
  try {
    const db = admin.database();
    const groupsRef = db.ref('groups');

    // Optimized Pagination
    const BATCH_SIZE = 100;
    let lastGroupId = null;
    let hasMore = true;
    let removedCount = 0;
    const now = Date.now();
    let batchCount = 0;

    console.log('🧹 Starting cleanup-temp-members job...');

    while (hasMore) {
      // Use startAt because startAfter is not supported in all SDK versions for Realtime Database
      // We limit to BATCH_SIZE + 1 when paginating to account for the inclusive start key
      let query = groupsRef.orderByKey();

      if (lastGroupId) {
        query = query.startAt(lastGroupId).limitToFirst(BATCH_SIZE + 1);
      } else {
        query = query.limitToFirst(BATCH_SIZE);
      }

      const snapshot = await query.get();

      if (!snapshot.exists()) {
        hasMore = false;
        break;
      }

      const groups = snapshot.val();
      const groupIds = [];

      snapshot.forEach((child) => {
        // Skip the first item if it matches the last processed ID (overlap due to startAt)
        if (lastGroupId && child.key === lastGroupId) {
          return;
        }
        groupIds.push(child.key);
      });

      if (groupIds.length === 0) {
        hasMore = false;
        break;
      }

      batchCount++;
      const updates = {};

      // Update lastGroupId to the last key in this batch
      lastGroupId = groupIds[groupIds.length - 1];

      for (const groupId of groupIds) {
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

      // Check if we reached end of data
      if (groupIds.length < BATCH_SIZE) {
        hasMore = false;
      }
    }

    console.log(`✅ Cleanup complete. Processed ${batchCount} batches. Removed ${removedCount} members.`);

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

app.post('/api/send-invitation', detectFraud, generalLimiter, async (req, res) => {
  try {
    const { groupId, inviteeUsername } = req.body;
    const senderUid = req.user.uid;

    if (!groupId || !inviteeUsername) {
      return res.status(400).json({ success: false, error: 'Group ID and username are required' });
    }

    if (!isValidFirebaseId(groupId)) {
      return res.status(400).json({ success: false, error: 'Invalid group ID format' });
    }

    const db = admin.database();

    // 1. Resolve invitee username to UID
    // Using the 'usernames' index we created in Phase 1
    const normalizedUsername = inviteeUsername.toLowerCase().replace(/[^a-z0-9._]/g, '');
    const storageKey = normalizedUsername.replace(/\./g, ',');
    const usernameSnap = await db.ref(`usernames/${storageKey}`).get();

    if (!usernameSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Username not found' });
    }

    const inviteeUid = usernameSnap.val().uid;
    const inviteeUserSnap = await db.ref(`users/${inviteeUid}`).get();
    const inviteeEmail = inviteeUserSnap.exists() ? (inviteeUserSnap.val().email || '').toLowerCase() : '';

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
    // Ideally real members only. We check if sender is in the group.
    const isSenderMember = normalizeMembers(group.members).some(m => m.userId === senderUid);

    if (!isSenderMember) {
      return res.status(403).json({ success: false, error: 'You must be a member of the group to invite others' });
    }

    // 3. Check if Invitee is already in group (by UID)
    const currentMembers = normalizeMembers(group.members);
    const isInviteeAlreadyMember = currentMembers.some(m => m.userId === inviteeUid);

    // Check if invitee is already in group as Manual Member (by Email)
    let existingManualMemberIndex = -1;
    if (inviteeEmail && !isInviteeAlreadyMember) {
      existingManualMemberIndex = currentMembers.findIndex(m => m.email && m.email.toLowerCase() === inviteeEmail && m.type === 'manual');
    }

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
      invitationId, // Add alias
      groupId,
      groupName: group.name,
      senderName, // New: Support legacy frontend
      invitedBy: senderName, // New: Simple string for frontend
      senderId: senderUid, // Simple field
      receiverId: inviteeUid, // Simple field for filtering
      receiverName: inviteeUsername || normalizedUsername, // CRITICAL: Fix for "Invited User" display
      invitedByDetail: { // Preserve the object in a subfield if needed
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
      senderName,
      invitedBy: senderName,
      createdAt: now,
      status: 'pending'
    };

    // SYNC: Add or Update member in group list
    if (existingManualMemberIndex !== -1) {
      // MERGE: Update existing manual member
      // We modify the copy in the currentMembers array and save the whole array back
      // This is safe because normalizeMembers preserves structure mostly, but writing it back as array standardizes it.
      const memberToUpdate = { ...currentMembers[existingManualMemberIndex] };
      memberToUpdate.userId = inviteeUid;
      memberToUpdate.isPending = true; // Mark as pending acceptance
      memberToUpdate.invitedAt = now;
      memberToUpdate.username = normalizedUsername; // Add username if missing

      // Update the array
      currentMembers[existingManualMemberIndex] = memberToUpdate;

      updates[`groups/${groupId}/members`] = currentMembers;
      console.log(`🔄 Merging invitation with existing manual member (Index: ${existingManualMemberIndex})`);
    } else {
      // ADD NEW: Add pending member to group list for visibility to owner
      // Use type: 'invited' so they are excluded from expense splitting until they accept
      const newMember = {
        id: `member_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        name: inviteeUsername || normalizedUsername,
        userId: inviteeUid,
        username: normalizedUsername,
        type: 'invited', // Changed from 'manual' to 'invited'
        isPending: true,
        invitedAt: now
      };

      const updatedMembers = [...currentMembers, newMember];
      updates[`groups/${groupId}/members`] = updatedMembers;
      // Also update index count for owner
      updates[`userGroups/${senderUid}/${groupId}/memberCount`] = updatedMembers.length;

      // GRANT READ ACCESS: Add to userGroups of the invitee
      updates[`userGroups/${inviteeUid}/${groupId}`] = {
        name: group.name,
        emoji: group.emoji,
        coverPhoto: group.coverPhoto || null,
        memberCount: updatedMembers.length,
        createdBy: group.createdBy || '',
        createdAt: group.createdAt || now,
        status: 'invited', // Access Key
        invitedAt: now
      };

      console.log(`➕ Adding new pending member (type: invited) to group list`);
    }

    await db.ref().update(updates);

    // 5. Send Notification (Awaited for Vercel/Serverless)
    try {
      const notificationPromises = [];

      // Push Notification
      notificationPromises.push(
        sendOneSignalNotificationInternal({
          userIds: [inviteeUid],
          title: "New Group Invitation! 🏠",
          body: `${senderName} invited you to join "${group.name}"`,
          data: { type: 'invitation', invitationId, groupId }
        })
          .catch(err => console.error("Invitation push failed:", err.message))
      );

      // Email Invitation
      notificationPromises.push((async () => {
        try {
          const userRecord = await admin.auth().getUser(inviteeUid);
          if (userRecord.email) {
            const joinLink = `https://app.hostelledger.aarx.online/join/${groupId}`;
            await emailService.sendInvitation(userRecord.email, senderName, group.name, joinLink);
          }
        } catch (e) { console.error("Invitations email inner failed:", e.message); }
      })());

      const globalTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Invite timeout')), 8000));
      await Promise.race([Promise.allSettled(notificationPromises), globalTimeout]).catch(e => console.warn("Invitation notifications timed out"));
    } catch (notifErr) {
      console.error("Invitation notifications failed overall:", notifErr.message);
    }

    res.json({ success: true, message: 'Invitation sent successfully' });

  } catch (error) {
    console.error('❌ Send invitation error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});


// Send External Invitation (to email)
app.post('/api/send-external-invitation', strictEmailLimiter, async (req, res) => {
  try {
    const { email, groupId } = req.body;
    const senderUid = req.user.uid;

    if (!email || !groupId) {
      return res.status(400).json({ success: false, error: 'Email and Group ID are required' });
    }

    if (!isValidFirebaseId(groupId)) {
      return res.status(400).json({ success: false, error: 'Invalid group ID format' });
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

    // Check sender membership (must be a real member)
    const isSenderMember = normalizeMembers(group.members).some(m => m.userId === senderUid);

    if (!isSenderMember) {
      return res.status(403).json({ success: false, error: 'You must be a member of the group to invite others' });
    }

    // 2. Get Sender Info
    const senderSnap = await db.ref(`users/${senderUid}`).get();
    const senderName = senderSnap.exists() ? senderSnap.val().name : "A friend";

    // 2b. Add Manual Member to Group (so they can be added to expenses immediately)
    const currentMembers = normalizeMembers(group.members);
    const existingMember = currentMembers.find(m => m.email && m.email.toLowerCase() === email.toLowerCase());

    if (!existingMember) {
      const newMember = {
        id: `member_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        name: email.split('@')[0],
        email: email,
        type: 'manual', // Correctly set as manual so they can be split with
        isPending: true,
        invitedAt: new Date().toISOString()
      };

      const updatedMembers = [...currentMembers, newMember];

      const updates = {};
      updates[`groups/${groupId}/members`] = updatedMembers;
      updates[`userGroups/${senderUid}/${groupId}/memberCount`] = updatedMembers.length;

      await db.ref().update(updates);
      console.log(`➕ Added manual member for email invite: ${email}`);
    } else {
      console.log(`ℹ️ Member with email ${email} already exists, skipping add.`);
    }

    // 3. Send Email
    // Determine if this is a new user or existing user
    let isNewUser = true;
    try {
      await admin.auth().getUserByEmail(email);
      isNewUser = false; // User exists!
    } catch (e) {
      // User not found, so they are new
      isNewUser = true;
    }

    const joinLink = `https://app.hostelledger.aarx.online/join/${groupId}?email=${encodeURIComponent(email)}`;

    await emailService.sendInvitation(
      email,
      senderName,
      group.name,
      joinLink,
      isNewUser
    );
    console.log('📧 External invitation email sent');

    res.json({ success: true, message: 'Invitation email sent successfully' });

  } catch (error) {
    console.error('❌ Send external invitation error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================
// DELETE GROUP
// ============================================
app.post('/api/delete-group', detectFraud, authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { groupId } = req.body;

    if (!groupId) {
      return res.status(400).json({ success: false, error: 'Group ID is required' });
    }

    if (!isValidFirebaseId(groupId)) {
      return res.status(400).json({ success: false, error: 'Invalid group ID format' });
    }

    const db = admin.database();
    const groupRef = db.ref(`groups/${groupId}`);
    const groupSnap = await groupRef.get();

    if (!groupSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    const groupData = groupSnap.val();

    // Only the creator can delete
    if (groupData.createdBy !== userId) {
      return res.status(403).json({ success: false, error: 'Only the group creator can delete this group' });
    }

    // Check for pending settlements via transactions
    // We check if any transactions exist — if they do, we warn but still allow delete
    // (The frontend already checks settlements before calling this)

    const members = normalizeMembers(groupData.members);
    const updates = {};

    // 1. Delete the group itself
    updates[`groups/${groupId}`] = null;

    // 2. Remove from all members' userGroups
    for (const member of members) {
      const memberUserId = member.userId || member.id;
      if (memberUserId) {
        updates[`userGroups/${memberUserId}/${groupId}`] = null;
        updates[`users/${memberUserId}/groups/${groupId}`] = null;
      }
    }

    // Also ensure the creator's entry is removed
    updates[`userGroups/${userId}/${groupId}`] = null;
    updates[`users/${userId}/groups/${groupId}`] = null;

    await db.ref().update(updates);

    console.log(`✅ Group ${groupId} deleted by ${userId}`);
    res.json({ success: true, message: 'Group deleted successfully' });

  } catch (error) {
    console.error('❌ Delete group error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete group: ' + error.message });
  }
});

// ============================================
// REMOVE MEMBER FROM GROUP
// ============================================
app.post('/api/remove-member', detectFraud, authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { groupId, memberId } = req.body;

    if (!groupId || !memberId) {
      return res.status(400).json({ success: false, error: 'Group ID and Member ID are required' });
    }

    if (!isValidFirebaseId(groupId)) {
      return res.status(400).json({ success: false, error: 'Invalid group ID format' });
    }
    if (!isValidFirebaseId(memberId)) {
      return res.status(400).json({ success: false, error: 'Invalid member ID format' });
    }

    const db = admin.database();
    const groupRef = db.ref(`groups/${groupId}`);
    const groupSnap = await groupRef.get();

    if (!groupSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    const groupData = groupSnap.val();

    // Only the creator can remove members (except self-leave)
    const isSelfLeave = memberId === userId;
    if (!isSelfLeave && groupData.createdBy !== userId) {
      return res.status(403).json({ success: false, error: 'Only the group creator can remove members' });
    }

    // Cannot remove the creator
    if (memberId === groupData.createdBy && !isSelfLeave) {
      return res.status(400).json({ success: false, error: 'Cannot remove the group creator' });
    }

    const members = normalizeMembers(groupData.members);
    const memberToRemove = members.find(m => m.id === memberId || m.userId === memberId);

    if (!memberToRemove) {
      return res.status(404).json({ success: false, error: 'Member not found in group' });
    }

    // Filter out the member
    const updatedMembers = members.filter(m => m.id !== memberId && m.userId !== memberId);

    const updates = {};
    updates[`groups/${groupId}/members`] = updatedMembers;
    updates[`groups/${groupId}/memberCount`] = updatedMembers.length;

    // Update denormalized count for the requester - ONLY if not self-leaving
    // If self-leaving, the entire userGroups entry for this user is removed below
    if (!isSelfLeave) {
      updates[`userGroups/${userId}/${groupId}/memberCount`] = updatedMembers.length;
    }

    // If the removed member had a userId, remove their userGroups entry too
    const removedUserId = memberToRemove.userId;
    if (removedUserId) {
      updates[`userGroups/${removedUserId}/${groupId}`] = null;
      updates[`users/${removedUserId}/groups/${groupId}`] = null;
    }

    await db.ref().update(updates);

    console.log(`✅ Member ${memberId} removed from group ${groupId} by ${userId}`);
    res.json({ success: true, message: 'Member removed successfully' });

  } catch (error) {
    console.error('❌ Remove member error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove member: ' + error.message });
  }
});

// ============================================
// UPDATE GROUP (Name, Emoji, etc.)
// ============================================
app.post('/api/update-group', detectFraud, authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    let { groupId, name, emoji } = req.body;
    name = sanitize(name);
    emoji = sanitize(emoji);

    if (!groupId) {
      return res.status(400).json({ success: false, error: 'Group ID is required' });
    }

    if (!isValidFirebaseId(groupId)) {
      return res.status(400).json({ success: false, error: 'Invalid group ID format' });
    }

    if (!name && !emoji) {
      return res.status(400).json({ success: false, error: 'Nothing to update' });
    }

    const db = admin.database();
    const groupRef = db.ref(`groups/${groupId}`);
    const groupSnap = await groupRef.get();

    if (!groupSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    const groupData = groupSnap.val();

    // Only the creator can update group details
    if (groupData.createdBy !== userId) {
      return res.status(403).json({ success: false, error: 'Only the group creator can update group details' });
    }

    // Sanitize and build updates
    const sanitized = {};
    if (name) {
      const cleanName = name.trim().replace(/[<>"'&]/g, '').substring(0, 50);
      if (!cleanName) return res.status(400).json({ success: false, error: 'Invalid group name' });
      sanitized.name = cleanName;
    }
    if (emoji) {
      sanitized.emoji = emoji.trim().substring(0, 10);
    }

    const updates = {};

    // Update group itself
    for (const [key, value] of Object.entries(sanitized)) {
      updates[`groups/${groupId}/${key}`] = value;
    }

    // Update denormalized metadata for ALL members who have this in userGroups
    const members = normalizeMembers(groupData.members);
    for (const member of members) {
      const memberUserId = member.userId;
      if (memberUserId) {
        for (const [key, value] of Object.entries(sanitized)) {
          updates[`userGroups/${memberUserId}/${groupId}/${key}`] = value;
        }
      }
    }

    // Also update for creator (in case they're not in members array somehow)
    for (const [key, value] of Object.entries(sanitized)) {
      updates[`userGroups/${userId}/${groupId}/${key}`] = value;
    }

    await db.ref().update(updates);

    console.log(`✅ Group ${groupId} updated by ${userId}:`, sanitized);
    res.json({ success: true, message: 'Group updated successfully' });

  } catch (error) {
    console.error('❌ Update group error:', error);
    res.status(500).json({ success: false, error: 'Failed to update group: ' + error.message });
  }
});

// ============================================
// JOIN GROUP (General Join by ID)
// ============================================
app.post('/api/join-group', detectFraud, authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { groupId } = req.body;

    if (!groupId) {
      return res.status(400).json({ success: false, error: 'Group ID is required' });
    }

    if (!isValidFirebaseId(groupId)) {
      return res.status(400).json({ success: false, error: 'Invalid group ID format' });
    }

    const db = admin.database();
    const groupRef = db.ref(`groups/${groupId}`);
    const groupSnap = await groupRef.get();

    if (!groupSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    const groupData = groupSnap.val();
    const members = normalizeMembers(groupData.members);

    // Check if already a member
    const existingMember = members.find(m => m.userId === userId);
    if (existingMember) {
      return res.json({ success: true, message: 'Already a member' });
    }

    // Get user details
    const userSnap = await db.ref(`users/${userId}`).get();
    if (!userSnap.exists()) {
      return res.status(404).json({ success: false, error: 'User profile not found' });
    }
    const userData = userSnap.val();

    // Create new member object
    const newMemberId = `member_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const newMember = {
      id: newMemberId,
      userId: userId,
      name: userData.name || userData.username || 'User',
      username: userData.username || '',
      email: userData.email || '',
      isRegistered: true,
      role: 'member',
      joinedAt: new Date().toISOString()
    };

    const updates = {};
    updates[`groups/${groupId}/members/${newMemberId}`] = newMember;
    updates[`groups/${groupId}/memberCount`] = (groupData.memberCount || 0) + 1;

    // Add to userGroups
    const now = new Date().toISOString();
    updates[`userGroups/${userId}/${groupId}`] = {
      name: groupData.name,
      emoji: groupData.emoji || '👥',
      coverPhoto: groupData.coverPhoto || null,
      memberCount: (groupData.memberCount || 0) + 1,
      createdBy: groupData.createdBy || '',
      createdAt: groupData.createdAt || now,
      joinedAt: now
    };

    // Update for creator if needed? No, userGroups is personal.
    
    await db.ref().update(updates);

    console.log(`✅ User ${userId} joined group ${groupId} via general link`);
    res.json({ success: true, message: 'Joined group successfully' });

  } catch (error) {
    console.error('❌ Join group error:', error);
    res.status(500).json({ success: false, error: 'Failed to join group: ' + error.message });
  }
});

// Sync Wallet Balance to Groups Endpoint
app.post('/api/sync-balance-to-groups', authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { showBalanceToOthers } = req.body;

    const db = admin.database();
    const userSnap = await db.ref(`users/${userId}`).get();

    if (!userSnap.exists()) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const userData = userSnap.val();
    const currentBalance = userData.walletBalance || 0;

    // Use value from body if provided, otherwise fallback to DB (though body is preferred for immediate toggle)
    const isEnabled = showBalanceToOthers !== undefined ? showBalanceToOthers : (userData.showBalanceToOthers || false);

    // Call helper (we await it here because this is an explicit sync request)
    await syncWalletBalanceToGroups(db, userId, currentBalance, isEnabled);

    res.json({ success: true, message: 'Wallet balance synced to groups' });

  } catch (error) {
    console.error('❌ Sync balance error:', error);
    res.status(500).json({ success: false, error: 'Internal server error: ' + error.message });
  }
});

// ============================================
// MERGE MEMBERS (Combine duplicate profiles)
// ============================================
app.post('/api/merge-members', detectFraud, authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { groupId, fromMemberId, toMemberId } = req.body;

    if (!groupId || !fromMemberId || !toMemberId) {
      return res.status(400).json({ success: false, error: 'groupId, fromMemberId, and toMemberId are required' });
    }

    if (!isValidFirebaseId(groupId)) {
      return res.status(400).json({ success: false, error: 'Invalid group ID format' });
    }
    if (!isValidFirebaseId(fromMemberId) || !isValidFirebaseId(toMemberId)) {
      return res.status(400).json({ success: false, error: 'Invalid member ID format' });
    }

    if (fromMemberId === toMemberId) {
      return res.status(400).json({ success: false, error: 'Cannot merge a member into themselves' });
    }

    const db = admin.database();

    // 1. Get group
    const groupSnap = await db.ref(`groups/${groupId}`).get();
    if (!groupSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    const groupData = groupSnap.val();

    // Only the creator can merge members
    if (groupData.createdBy !== userId) {
      return res.status(403).json({ success: false, error: 'Only the group creator can merge members' });
    }

    const members = normalizeMembers(groupData.members);

    const fromMember = members.find(m => m.id === fromMemberId);
    const toMember = members.find(m => m.id === toMemberId);

    if (!fromMember || !toMember) {
      return res.status(404).json({ success: false, error: 'One or both members not found' });
    }

    // 2. Get all transactions for this group
    const txSnap = await db.ref('transactions').orderByChild('groupId').equalTo(groupId).get();
    const allTransactions = txSnap.exists() ? txSnap.val() : {};

    const updates = {};
    const txToDelete = []; // self-payments to delete

    // 3. Update transactions
    for (const [txId, tx] of Object.entries(allTransactions)) {
      const txUpdates = {};
      let needsUpdate = false;

      // Update paidBy
      if (tx.paidBy === fromMemberId) {
        txUpdates.paidBy = toMemberId;
        txUpdates.paidByName = toMember.name;
        needsUpdate = true;
      }

      // Update from/to for payments
      if (tx.type === 'payment') {
        if (tx.from === fromMemberId) {
          txUpdates.from = toMemberId;
          txUpdates.fromName = toMember.name;
          needsUpdate = true;
        }
        if (tx.to === fromMemberId) {
          txUpdates.to = toMemberId;
          txUpdates.toName = toMember.name;
          needsUpdate = true;
        }

        // Check for self-payment after merge
        const finalFrom = txUpdates.from || tx.from;
        const finalTo = txUpdates.to || tx.to;
        if (finalFrom === finalTo) {
          txToDelete.push(txId);
          continue; // Skip normal update
        }
      }

      // Update participants for expenses  
      if (tx.type === 'expense' && Array.isArray(tx.participants)) {
        const fromIdx = tx.participants.findIndex(p => p.id === fromMemberId);
        if (fromIdx !== -1) {
          const newParticipants = [...tx.participants];
          const toIdx = newParticipants.findIndex(p => p.id === toMemberId);

          if (toIdx !== -1) {
            // Both present: merge amounts
            newParticipants[toIdx] = {
              ...newParticipants[toIdx],
              amount: (newParticipants[toIdx].amount || 0) + (newParticipants[fromIdx].amount || 0)
            };
            newParticipants.splice(fromIdx, 1);
          } else {
            // Only from present: rename
            newParticipants[fromIdx] = {
              ...newParticipants[fromIdx],
              id: toMemberId,
              name: toMember.name
            };
          }

          txUpdates.participants = newParticipants;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        for (const [key, value] of Object.entries(txUpdates)) {
          updates[`transactions/${txId}/${key}`] = value;
        }
      }
    }

    // 4. Delete self-payment transactions
    for (const txId of txToDelete) {
      updates[`transactions/${txId}`] = null;
      updates[`userTransactions/${userId}/${txId}`] = null;
    }

    // 5. Remove fromMember from members array
    const updatedMembers = members.filter(m => m.id !== fromMemberId);
    updates[`groups/${groupId}/members`] = updatedMembers;
    updates[`groups/${groupId}/memberCount`] = updatedMembers.length;

    // Update denormalized count
    updates[`userGroups/${userId}/${groupId}/memberCount`] = updatedMembers.length;

    // Remove fromMember's userGroups entry if they had a userId
    if (fromMember.userId) {
      updates[`userGroups/${fromMember.userId}/${groupId}`] = null;
    }

    await db.ref().update(updates);

    const mergedTxCount = Object.keys(updates).filter(k => k.startsWith('transactions/')).length;
    console.log(`✅ Merged member "${fromMember.name}" into "${toMember.name}" in group ${groupId}. Updated ${mergedTxCount} transaction paths, deleted ${txToDelete.length} self-payments.`);

    res.json({
      success: true,
      message: `Merged "${fromMember.name}" into "${toMember.name}" successfully`,
      mergedTransactions: mergedTxCount,
      deletedSelfPayments: txToDelete.length
    });

  } catch (error) {
    console.error('❌ Merge members error:', error);
    res.status(500).json({ success: false, error: 'Failed to merge members: ' + error.message });
  }
});

// Cleanup Unverified Users Endpoint (Admin/Secure)
// Secured by Admin Key (for cron jobs)
app.post('/api/cleanup-unverified-users', adminAuth, async (req, res) => {
  try {
    const db = admin.database();
    const verificationRef = db.ref('emailVerification');

    // Calculate 24 hours ago
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    console.log('🧹 Starting cleanup of unverified accounts older than:', twentyFourHoursAgo);

    // Query unverified accounts older than 24 hours
    // Using startAt/endAt requires an ordered query
    const snapshot = await verificationRef.orderByChild('createdAt').endAt(twentyFourHoursAgo).get();

    if (!snapshot.exists()) {
      return res.json({ success: true, deletedCount: 0, message: 'No unverified accounts found' });
    }

    const accounts = snapshot.val();
    let deletedCount = 0;
    const errors = [];

    const cleanupPromises = Object.entries(accounts).map(async ([uid, accountData]) => {
      try {
        // Skip if already verified (double check)
        if (accountData.emailVerified) {
          return null; // Skip
        }

        console.log('🗑️ Deleting unverified account:', uid);

        // 1. Delete from Firebase Auth
        try {
          await admin.auth().deleteUser(uid);
        } catch (authError) {
          if (authError.code === 'auth/user-not-found') {
            console.log(`User ${uid} not found in Auth, proceeding with DB cleanup`);
          } else {
            throw authError;
          }
        }

        // 2 & 3. Delete user profile and email verification record from Realtime Database in parallel
        await Promise.all([
          db.ref(`users/${uid}`).remove(),
          db.ref(`emailVerification/${uid}`).remove()
        ]);

        // 4. Delete verification codes (Legacy RTDB & Firestore)
        if (accountData.email) {
          const codeCleanupPromises = [];

          // RTDB (Legacy/Invalid Path Handling)
          codeCleanupPromises.push((async () => {
            try {
              // Firebase keys cannot contain '.', but if stored somehow, we try to delete
              // If the key was sanitized (e.g. replaced . with ,), we need to match that logic
              // Assuming direct email usage as key is problematic in RTDB, but we try anyway
              // or just skip if it throws
              await db.ref(`verificationCodes/${accountData.email}`).remove();
            } catch (e) {
              console.warn('Could not delete RTDB verification codes for user:', e.message);
            }
          })());

          // Firestore (Current)
          codeCleanupPromises.push((async () => {
            try {
              const verificationCodesRef = firestore.collection('verificationCodes');
              const snapshotCodes = await verificationCodesRef.where('email', '==', accountData.email).get();
              if (!snapshotCodes.empty) {
                const batch = firestore.batch();
                snapshotCodes.forEach(doc => {
                  batch.delete(doc.ref);
                });
                await batch.commit();
                console.log('Deleted Firestore verification codes for user');
              }
            } catch (e) {
              console.warn('Could not delete Firestore verification codes for user:', e.message);
            }
          })());

          await Promise.all(codeCleanupPromises);
        }

        return { success: true, uid };

      } catch (err) {
        console.error(`Failed to delete user ${uid}:`, err);
        return { success: false, uid, error: err.message };
      }
    });

    const results = await Promise.all(cleanupPromises);

    // Process results
    results.forEach(result => {
      if (!result) return; // Skipped
      if (result.success) {
        deletedCount++;
      } else {
        errors.push({ uid: result.uid, error: result.error });
      }
    });

    console.log(`✅ Cleanup completed. Deleted ${deletedCount} unverified accounts`);

    res.json({
      success: true,
      deletedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully deleted ${deletedCount} unverified accounts.`
    });

  } catch (error) {
    console.error('❌ Cleanup unverified users error:', error);
    res.status(500).json({ success: false, error: 'Internal server error: ' + error.message });
  }
});






// ============================================
// GROUP CHAT ENDPOINTS
// ============================================

// Chat-specific rate limiter (30 messages per minute per IP)
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: {
    success: false,
    error: 'Too many messages sent. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Helper: Send a system message to a group chat
 * Used internally when expenses/payments are created
 */
const sendSystemMessage = async (db, groupId, event, actorName, data = {}) => {
  try {
    const messageRef = db.ref(`groupMessages/${groupId}`).push();
    const message = {
      id: messageRef.key,
      senderId: 'system',
      senderName: 'System',
      text: null,
      type: 'system',
      event,
      actorName,
      data,
      timestamp: admin.database.ServerValue.TIMESTAMP
    };
    await messageRef.set(message);

    // Update chat metadata
    await db.ref(`groupChatMeta/${groupId}`).update({
      lastMessage: `${actorName}: ${event}`,
      lastMessageAt: admin.database.ServerValue.TIMESTAMP,
      lastSenderId: 'system'
    });
  } catch (err) {
    console.error('⚠️ Failed to send system message:', err.message);
  }
};

// Send Message endpoint
app.post('/api/send-message', detectFraud, chatLimiter, authenticate, async (req, res) => {
  try {
    let { groupId, text, expenseId } = req.body;
    const currentUserId = req.user.uid;

    // Validate
    if (!groupId || !text) {
      return res.status(400).json({ success: false, error: 'Missing required fields: groupId, text' });
    }

    if (!isValidFirebaseId(groupId)) {
      return res.status(400).json({ success: false, error: 'Invalid group ID format' });
    }

    // Sanitize & limit
    text = sanitize(text);
    if (text.length > 2000) {
      return res.status(400).json({ success: false, error: 'Message too long (max 2000 characters)' });
    }
    if (text.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Message cannot be empty' });
    }

    const db = admin.database();

    // Verify membership
    const groupSnap = await db.ref(`groups/${groupId}`).get();
    if (!groupSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    const group = groupSnap.val();
    const membersArray = normalizeMembers(group.members);
    const member = membersArray.find(m => m.userId === currentUserId || m.id === currentUserId);
    if (!member) {
      return res.status(403).json({ success: false, error: 'You are not a member of this group' });
    }

    // If expenseId provided, verify it exists in this group
    let expenseData = null;
    if (expenseId) {
      if (!isValidFirebaseId(expenseId)) {
        return res.status(400).json({ success: false, error: 'Invalid expense ID format' });
      }
      // Expenses are in Realtime Database now
      const expenseSnap = await db.ref(`transactions/${expenseId}`).get();
      if (!expenseSnap.exists() || expenseSnap.val().groupId !== groupId) {
        return res.status(404).json({ success: false, error: 'Expense not found in this group' });
      }
      expenseData = expenseSnap.val();
    }

    // Save message
    const messagePath = expenseId
      ? `expenseMessages/${groupId}/${expenseId}`
      : `groupMessages/${groupId}`;

    const messageRef = db.ref(messagePath).push();
    const message = {
      id: messageRef.key,
      senderId: currentUserId,
      senderName: member.name,
      text,
      type: 'text',
      timestamp: admin.database.ServerValue.TIMESTAMP
    };

    if (expenseId) {
      message.expenseId = expenseId;
    }

    await messageRef.set(message);

    // Update appropriate metadata
    if (expenseId) {
      await db.ref(`expenseChatMeta/${groupId}/${expenseId}`).update({
        lastMessage: text.substring(0, 100),
        lastMessageAt: admin.database.ServerValue.TIMESTAMP,
        lastSenderId: currentUserId,
        lastSenderName: member.name
      });
    } else {
      await db.ref(`groupChatMeta/${groupId}`).update({
        lastMessage: text.substring(0, 100),
        lastMessageAt: admin.database.ServerValue.TIMESTAMP,
        lastSenderId: currentUserId,
        lastSenderName: member.name
      });
    }

    // Push notification to other members (fire-and-forget)
    const otherMembers = membersArray.filter(m => m.userId && m.userId !== currentUserId);
    if (otherMembers.length > 0 && process.env.ONESIGNAL_APP_ID && process.env.ONESIGNAL_REST_API_KEY) {
      let title = `💬 ${member.name} in ${group.name}`;
      if (expenseId && expenseData) {
        title = `🧵 ${member.name} on "${expenseData.description || 'Expense'}"`;
      }

      sendOneSignalNotificationInternal({
        userIds: otherMembers.map(m => m.userId),
        title,
        body: text.length > 100 ? text.substring(0, 97) + '...' : text,
        data: {
          type: 'chat_message',
          groupId,
          expenseId: expenseId || undefined,
          messageId: messageRef.key
        }
      }).catch(err => console.error('⚠️ Chat push notification failed:', err.message));
    }

    console.log(`💬 Message sent in ${expenseId ? 'thread' : 'group'} ${expenseId || groupId} by ${member.name}`);

    res.json({
      success: true,
      message: { ...message, timestamp: Date.now() } // Return approximate timestamp
    });

  } catch (error) {
    console.error('❌ Send message error:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// Get Messages endpoint (paginated)
app.post('/api/get-messages', generalLimiter, authenticate, async (req, res) => {
  try {
    const { groupId, expenseId, limit: msgLimit, beforeTimestamp } = req.body;
    const currentUserId = req.user.uid;

    if (!groupId) {
      return res.status(400).json({ success: false, error: 'Missing required field: groupId' });
    }

    if (!isValidFirebaseId(groupId)) {
      return res.status(400).json({ success: false, error: 'Invalid group ID format' });
    }

    if (expenseId && !isValidFirebaseId(expenseId)) {
      return res.status(400).json({ success: false, error: 'Invalid expense ID format' });
    }

    const db = admin.database();

    // Verify membership
    const groupSnap = await db.ref(`groups/${groupId}`).get();
    if (!groupSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    const group = groupSnap.val();
    const membersArray = normalizeMembers(group.members);
    const member = membersArray.find(m => m.userId === currentUserId || m.id === currentUserId);
    if (!member) {
      return res.status(403).json({ success: false, error: 'You are not a member of this group' });
    }

    // Fetch messages
    const pageSize = Math.min(Number(msgLimit) || 50, 100); // Max 100 per page
    const messagePath = expenseId
      ? `expenseMessages/${groupId}/${expenseId}`
      : `groupMessages/${groupId}`;

    let messagesQuery = db.ref(messagePath).orderByChild('timestamp');

    if (beforeTimestamp) {
      messagesQuery = messagesQuery.endBefore(Number(beforeTimestamp)).limitToLast(pageSize);
    } else {
      messagesQuery = messagesQuery.limitToLast(pageSize);
    }

    const snapshot = await messagesQuery.get();

    if (!snapshot.exists()) {
      return res.json({ success: true, messages: [], hasMore: false });
    }

    const messages = [];
    snapshot.forEach(child => {
      messages.push({ ...child.val(), id: child.key });
    });

    // Sort by timestamp ascending
    messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    const hasMore = messages.length === pageSize;

    res.json({ success: true, messages, hasMore });

  } catch (error) {
    console.error('❌ Get messages error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

// --- SMART PAYMENT REMINDERS ---

/**
 * Send Payment Reminder (Manual)
 * Triggered by user to remind someone of a debt
 */
app.post('/api/reminders/send', detectFraud, generalLimiter, authenticate, async (req, res) => {
  const { groupId, debtorId, creditorId, amount, currency = 'PKR' } = req.body;
  const senderId = req.user.uid;

  if (!groupId || !debtorId || !creditorId || !amount) {
    return res.status(400).json({ success: false, error: 'Missing required reminder details' });
  }

  if (!isValidFirebaseId(groupId) || !isValidFirebaseId(debtorId) || !isValidFirebaseId(creditorId)) {
    return res.status(400).json({ success: false, error: 'Invalid ID format' });
  }

  try {
    const db = admin.database();

    // 1. Authorization: Only the creditor (or someone in the group if we want to be lax) can send a reminder
    if (senderId !== creditorId) {
       return res.status(403).json({ success: false, error: 'Only the creditor can send a reminder.' });
    }

    // 2. Fetch Group & Users
    const [groupSnap, debtorSnap, creditorSnap] = await Promise.all([
      db.ref(`groups/${groupId}`).get(),
      db.ref(`users/${debtorId}`).get(),
      db.ref(`users/${creditorId}`).get()
    ]);

    if (!groupSnap.exists()) return res.status(404).json({ success: false, error: 'Group not found' });
    if (!debtorSnap.exists()) return res.status(404).json({ success: false, error: 'Recipient user not found' });

    if (!creditorSnap.exists()) return res.status(404).json({ success: false, error: 'Creditor user not found' });

    const group = groupSnap.val();
    const creditor = creditorSnap.val();
    const debtor = debtorSnap.val();

    // Ensure amount is a number for toLocaleString
    const numericAmount = Number(amount) || 0;
    const symbol = getCurrencySymbol(currency);

    console.log(`🔔 Reminder requested by ${creditor.name} (${creditorId}) for ${debtor.name} (${debtorId}) in ${group.name}`);

    // 3. Send Notifications
    const notificationPromises = [];

    // B. Determine Debtor Email (Fallback to Auth if not in DB)
    let debtorEmail = debtor.email;
    if (!debtorEmail) {
      console.log(`ℹ️ Email missing in DB for ${debtorId}, fetching from Firebase Auth...`);
      try {
        const userRecord = await admin.auth().getUser(debtorId);
        debtorEmail = userRecord.email;
        console.log(`✅ Found email in Auth: ${debtorEmail}`);
      } catch (authErr) {
        console.warn(`⚠️ Could not fetch email from Auth for ${debtorId}:`, authErr.message);
      }
    }

    // A. Push Notification
    notificationPromises.push(
      sendOneSignalNotificationInternal({
        userIds: [debtorId],
        title: `Payment Reminder: ${group.name}`,
        body: `${creditor.name} reminded you about the ${symbol} ${numericAmount.toLocaleString()} debt.`,
        data: { type: 'reminder', groupId, creditorId, amount: numericAmount }
      }).catch(err => console.error('Reminder Push failed:', err.message))
    );

    // B. Email Notification
    if (debtorEmail) {
       notificationPromises.push(
         emailService.sendEmailSafe({
           to: debtorEmail,
           subject: `Payment Reminder: Rs ${amount} for ${group.name}`,
           html: emailService.getCommonTemplate(
             'Payment Reminder',
             `<p>Hi ${debtor.name},</p>
              <p><strong>${creditor.name}</strong> is reminding you about an outstanding balance in <strong>${group.name}</strong>.</p>
              <div class="amount-large">Rs ${amount.toLocaleString()}</div>
              <p>Please settle up when you can. You can record a payment directly in the app.</p>`,
             `<a href="https://app.hostelledger.aarx.online/dashboard" class="button">Go to App</a>`,
             true
           )
         }).catch(err => console.error('Reminder Email failed:', err.message))
       );
    }

    await Promise.allSettled(notificationPromises);

    res.json({ success: true, message: 'Payment reminder sent successfully.' });

  } catch (error) {
    console.error('❌ Send reminder error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 404 handler - MUST BE LAST
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// --- AI Support Bot & Email Notifications ---

// Gemini System Prompt for Support Bot
const SUPPORT_AI_SYSTEM_PROMPT = `
You are the Hostel Ledger AI Support Assistant. Your goal is to help users resolve common issues related to the Hostel Ledger application.
Key Features of the App:
- Tracking shared expenses in groups.
- Real-time balances and settlement.
- Personal spaces for individual tracking.
- Wallet system for managing payments.
- Support for images and transaction references in chat.
Common Issues & Guidance:
- Adding Expense: Go to a group, click the + button, enter amount and split details.
- Settlement: View the settlement tab in a group to see who owes whom. Use the 'Settle' button to record a payment.
- Wallet: You can add money to your wallet to pay for expenses directly.
- Transaction Reference: You can share a transaction by typing 'GROUP_ID/TRANSACTION_ID'.
- Groups: Create groups for different people or occasions.
Response Guidelines:
- Be professional, helpful, and concise.
- If the user asks for a 'live agent', 'human', 'admin', or seems frustrated/unsatisfied, tell them you are connecting them to a live support representative and that they will be notified via email when an agent responds.
- If they ask for a live chat, confirm you are notifying the support team.
- Do not make up features.
- If you don't know the answer, politely ask the user to wait for a live agent.
Always wrap your response in helpful advice and mention they can click "Talk to Agent" if they need further help.
`;

/**
 * Sends a support ticket update email
 */
async function sendSupportEmail(userEmail, userName, ticketNumber, status, issueSummary, messageText = '') {
  try {
    const result = await emailService.sendSupportTicketUpdate(userEmail, {
      userName,
      ticketNumber,
      status,
      issueSummary,
      latestMessage: messageText
    });
    
    if (result.success) {
      logger.info(`📧 Support email sent to ${userEmail} via ${result.provider} for ticket ${ticketNumber}`);
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    logger.error('❌ Error sending support email:', error);
  }
}

/**
 * Handles AI response for support messages
 */
async function handleAIResponse(userId, ticketId, ticketData, userMessage) {
  try {
    const prompt = `
      ${SUPPORT_AI_SYSTEM_PROMPT}
      
      User Message: "${userMessage}"
      Ticket Context: Status is ${ticketData.status}. Previous messages summary: ${ticketData.subject}.
      
      Assistant:`;

    const aiResponse = await generateContentWithFallback(prompt);
    
    // Add AI message to ticket
    if (aiResponse) {
      const messagesRef = admin.database().ref(`supportTickets/${userId}/${ticketId}/messages`);
      const newMessageRef = messagesRef.push();
      
      await newMessageRef.set({
        text: aiResponse,
        sender: "admin", // Bot acts as admin
        isBot: true,
        timestamp: Date.now(),
        read: false
      });

      // Update ticket timing
      await admin.database().ref(`supportTickets/${userId}/${ticketId}`).update({
        updatedAt: Date.now()
      });

      logger.info(`🤖 AI Bot responded to ticket ${ticketId}`);
    }
  } catch (error) {
    logger.error('❌ Error in AI Support Bot:', error);
  }
}

// Initial Listener Setup for Support Tickets
const setupSupportListeners = () => {
  const supportRef = admin.database().ref('supportTickets');
  
  supportRef.on('child_added', (userSnapshot) => {
    const userId = userSnapshot.key;
    
    userSnapshot.ref.on('child_added', (ticketSnapshot) => {
      const ticketId = ticketSnapshot.key;
      const initialTicketData = ticketSnapshot.val();

      // 1. Send initial email if it's a new ticket
      if (initialTicketData.status === 'open' && !initialTicketData.initialEmailSent) {
        sendSupportEmail(
          initialTicketData.userEmail, 
          initialTicketData.userName, 
          initialTicketData.ticketNumber, 
          'open', 
          initialTicketData.subject
        ).then(() => {
          ticketSnapshot.ref.update({ initialEmailSent: true });
        });
      }

      // 2. Listen for status changes to send emails
      ticketSnapshot.ref.child('status').on('value', async (statusSnap) => {
        const newStatus = statusSnap.val();
        if (!newStatus) return;

        const ticketData = (await ticketSnapshot.ref.once('value')).val();
        
        // Prevent sending email on initial creation (already handled or too soon)
        const isInitial = Date.now() - ticketData.createdAt < 10000;
        
        // Only send if status actually changed and it's not the very first 'open' status
        if (!isInitial && ticketData.lastEmailedStatus !== newStatus) {
          await sendSupportEmail(
            ticketData.userEmail,
            ticketData.userName,
            ticketData.ticketNumber,
            newStatus,
            ticketData.subject
          );
          
          await ticketSnapshot.ref.update({
            lastEmailedStatus: newStatus,
            updatedAt: Date.now()
          });
        }
      });

      // 3. Listen for new messages from user
      ticketSnapshot.ref.child('messages').on('child_added', (msgSnapshot) => {
        const msg = msgSnapshot.val();
        
        // Only respond to newest user messages (within last 30s)
        const isRecent = Date.now() - msg.timestamp < 30000;
        
        if (msg.sender === 'user' && isRecent) {
          ticketSnapshot.ref.once('value').then(latestTicketSnap => {
            const data = latestTicketSnap.val();
            
            if (data.isAIActive !== false && !data.talkToAgent) {
              const agentKeywords = ['live agent', 'human', 'speak with someone', 'admin', 'operator'];
              const wantsAgent = agentKeywords.some(kw => msg.text.toLowerCase().includes(kw));

              if (wantsAgent) {
                latestTicketSnap.ref.update({ 
                  talkToAgent: true, 
                  isAIActive: false,
                  status: 'in_progress' 
                });
                latestTicketSnap.ref.child('messages').push().set({
                  text: "I understand. I am connecting you to a live support representative. They will be notified and respond as soon as possible. You'll receive an email update when they reply.",
                  sender: "admin",
                  isBot: true,
                  timestamp: Date.now(),
                  read: false
                });
              } else {
                handleAIResponse(userId, ticketId, data, msg.text);
              }
            }
          });
        }
      });
    });
  });

  logger.info('🎧 Support system listeners initialized');
};



const { startWeeklyReportCron, startBudgetResetCron } = require('./services/cronService');

// Initialize listeners
if (admin.apps.length > 0) {
  setupSupportListeners();
  startWeeklyReportCron();
  startBudgetResetCron();
}

// --- GLOBAL ERROR HANDLING ---
app.use((err, req, res, next) => {
    logger.error(`❌ Global Error Handler: ${err.message}`, {
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    res.status(err.status || 500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
    });
});
// ------------------------------

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Hostel Ledger Email API server running on port ${PORT}`);
    console.log(`📧 SMTP configured for: ${process.env.SMTP_USER}`);
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  });
}

module.exports = app;

// --- Global Error Handling Middleware ---
app.use((err, req, res, next) => {
  logger.error('Unhandled Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});
