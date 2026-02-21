const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// 1. Initialize Configuration (Side effects)
const admin = require('./config/firebase');
require('./config/cloudinary'); // Initializes Cloudinary
require('dotenv').config();

const pkg = require('./package.json');
const emailService = require('./services/emailService');
const apiRoutes = require('./routes/index');

// OneSignal Configuration Check
if (process.env.ONESIGNAL_APP_ID && process.env.ONESIGNAL_REST_API_KEY) {
  console.log('✅ OneSignal configured for push notifications');
} else {
  console.warn('⚠️ OneSignal not configured - push notifications will not work');
}

const app = express();

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

app.use(express.json());

// Verify email configuration on startup
emailService.verifyConnection().then(connected => {
  if (connected) {
    console.log('✅ Email Service Configured Successfully');
  } else {
    console.warn('⚠️ Email Service Failed to Connect - Emails may not send');
  }
});

// Root endpoint
app.get('/', (req, res) => {
  console.log('📍 Root endpoint accessed from:', req.get('origin') || 'direct');
  res.json({
    success: true,
    message: 'Hostel Ledger Email API',
    version: pkg.version,
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
    version: pkg.version, // Dynamic from package.json
    pushProvider: 'OneSignal',
    oneSignalConfigured: !!(process.env.ONESIGNAL_APP_ID && process.env.ONESIGNAL_REST_API_KEY),
    deployedAt: '2026-01-22T13:00:00Z'
  });
});

// Silently handle favicon requests (eliminates 404 noise in logs)
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/favicon.png', (req, res) => res.status(204).end());

// Mount API Routes
app.use('/api', apiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
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
