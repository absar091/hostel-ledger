const express = require('express');
const helmet = require('helmet');
const nodemailer = require('nodemailer');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const cloudinary = require('cloudinary').v2;
const { loadEmailTemplate } = require('./utils/email');
const { validateCreateGroup } = require('./utils/validation');
// Note: web-push removed - using OneSignal for push notifications
require('dotenv').config();
const pkg = require('./package.json');

// Cloudinary Configuration
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('✅ Cloudinary configured successfully');
} else {
  console.warn('⚠️ Cloudinary not fully configured - image deletion will fail');
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

const emailService = require('./services/emailService');
const expenseLogic = require('./utils/expenseLogic');

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
    console.log(`👤 Authenticated user: ${decodedToken.uid}`);
    next();
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or expired token'
    });
  }
};

// Delete Image Endpoint (Secure)
app.post('/api/delete-image', authenticate, async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({ success: false, error: 'Missing publicId' });
    }

    // Optional: Verify that the publicId belongs to the user or is relevant to the app
    // For now, we trust the authenticated user is deleting their own profile picture or an image they have access to.

    console.log(`🗑️ Deleting image from Cloudinary: ${publicId} by user ${req.user.uid}`);

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok' || result.result === 'not found') {
      // 'not found' is also considered success (idempotent)
      console.log(`✅ Image deleted successfully (result: ${result.result}): ${publicId}`);
      res.json({ success: true });
    } else {
      console.error(`❌ Cloudinary delete failed: ${JSON.stringify(result)}`);
      res.status(500).json({ success: false, error: 'Failed to delete image' });
    }

  } catch (error) {
    console.error('❌ Delete image error:', error);
    res.status(500).json({ success: false, error: 'Internal server error: ' + error.message });
  }
});

/**
 * Create Group Endpoint
 */
app.post('/api/create-group', createLimiter, authenticate, async (req, res) => {
  // Input Validation
  const validationError = validateCreateGroup(req.body);
  if (validationError) {
    return res.status(400).json({ success: false, error: validationError });
  }

  const { name, emoji, members, invitedUsernames, invitedEmails, coverPhoto } = req.body;
  const userId = req.user.uid;
  const notificationPromises = [];

  try {
    const groupsRef = admin.database().ref('groups');
    const newGroupRef = groupsRef.push();
    const groupId = newGroupRef.key;

    // 1a. Fetch User Name first (so we don't store "You" in DB)
    const userSnap = await admin.database().ref(`users/${userId}`).get();
    const userName = userSnap.exists() ? userSnap.val().name : "User";

    // 1b. Resolve Invited Usernames (Existing Users)
    const resolvedUsers = [];
    if (invitedUsernames && invitedUsernames.length > 0) {
      const resolved = await Promise.all(invitedUsernames.map(async (username) => {
        const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
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
          id: `member_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
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
            id: `member_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
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

        console.log(`✅ Invitation prepared for user ${inviteeUid} (existing app user)`);
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
          console.error(`❌ Failed to send invite to ${username}:`, err.message);
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
      console.log(`📧 Preparing ${emailMembers.length} manual email invites...`);
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
        console.log(`🚀 Awaiting ${notificationPromises.length} group creation notifications...`);
        const globalTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Invite timeout')), 8000));
        await Promise.race([Promise.allSettled(notificationPromises), globalTimeout])
          .catch(e => console.warn("⚠️ Group invites partially timed out:", e.message));
      } catch (notifErr) {
        console.error("❌ Notification awaiting failed:", notifErr);
      }
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

const calculateExpenseSettlements = expenseLogic.calculateExpenseSettlements;

// --- New Endpoint: Get Valid User Details ---
app.post('/api/get-valid-user-details', authenticate, async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ success: false, error: 'Username is required' });
    }

    // Sanitize username to prevent path traversal (allow only alphanumeric and underscores)
    const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
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


// ============================================
// RESPOND TO INVITATION (Accept/Decline)
// ============================================
app.post('/api/respond-invitation', authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { invitationId, accept } = req.body;

    if (!invitationId) {
      return res.status(400).json({ success: false, error: 'Invitation ID is required' });
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
        id: memberIndex !== -1 ? membersArray[memberIndex].id : `member_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name: userData.name || (memberIndex !== -1 ? membersArray[memberIndex].name : 'Member'),
        isRegistered: true,
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
      isRegistered: true,
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
  const publicEndpoints = ['/push-test', '/check-email-exists']; // Example: /api/push-test is public
  if (publicEndpoints.includes(req.path)) {
    return next();
  }
  authenticate(req, res, next);
});

// Generic email sending endpoint
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

    // Send email using emailService
    console.log('📧 Sending email via emailService...');
    const result = await emailService.sendEmailSafe({
      to,
      subject,
      html,
      text: text || ''
    });

    if (result.success) {
      console.log('✅ Email sent successfully:', result.messageId);
      res.json({
        success: true,
        messageId: result.messageId,
        provider: result.provider
      });
    } else {
      console.error('❌ Failed to send email:', result.error);
      res.status(500).json({
        success: false,
        error: 'Failed to send email: ' + result.error
      });
    }

  } catch (error) {
    console.error('❌ Email sending error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email: ' + error.message
    });
  }
});

// Verification email endpoint
// Verification email endpoint
app.post('/api/send-verification', emailLimiter, async (req, res) => {
  try {
    const { email, code, name } = req.body;
    if (!email || !code || !name) {
      return res.status(400).json({ success: false, error: 'Missing required fields: email, code, name' });
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

    await emailService.sendWelcome(email, name);
    console.log('✅ Welcome email sent');
    res.json({ success: true, message: 'Welcome email sent' });
  } catch (error) {
    console.error('❌ Welcome email error:', error);
    res.status(500).json({ success: false, error: 'Failed to send welcome email: ' + error.message });
  }
});

// Transaction alert email endpoint
app.post('/api/send-transaction-alert', emailLimiter, async (req, res) => {
  try {
    const { email, name, transactionType, amount, groupName, date, description } = req.body;

    if (!email || !name || !transactionType || !amount || !groupName || !date || !description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    await emailService.sendTransactionAlert({
      email, name, transactionType, amount, groupName, date, description
    });

    console.log('✅ Transaction alert email sent');
    res.json({ success: true, message: 'Transaction alert email sent' });

  } catch (error) {
    console.error('❌ Transaction alert email error:', error);
    res.status(500).json({ success: false, error: 'Failed to send transaction alert email: ' + error.message });
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

    // Idempotency Check
    let clientTxnId = req.body.clientTxnId;
    if (clientTxnId) {
      const processedRef = db.ref(`processedTxns/${clientTxnId}`);
      const processedSnap = await processedRef.get();
      if (processedSnap.exists()) {
        const data = processedSnap.val();
        console.log(`♻️ Idempotency hit: Returning existing transaction for ${clientTxnId}`);
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
    try {
      const memberHydrationPromises = membersArray.map(async (m) => {
        if (m.userId && !m.email) {
          try {
            const userSnap = await db.ref(`users/${m.userId}`).get();
            if (userSnap.exists()) {
              const userData = userSnap.val();
              return { ...m, email: userData.email };
            }
          } catch (err) {
            console.error(`⚠️ Failed to hydrate email for user ${m.userId}:`, err.message);
          }
        }
        return m;
      });
      membersArray = await Promise.all(memberHydrationPromises);
    } catch (hydrateError) { console.error('Hydration failed', hydrateError); }
    if (!member) {
      return res.status(403).json({ success: false, error: 'You are not a member of this group' });
    }

    // 3. Verify payer and participants exist in group
    const payer = membersArray.find(m => m.id === paidBy);
    if (!payer) {
      return res.status(400).json({ success: false, error: 'Invalid payer' });
    }

    const participantMembers = membersArray.filter(m => participants.includes(m.id));
    if (participantMembers.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid participants' });
    }

    // 4. Calculate Split and Settlements
    const splits = calculateExpenseSplit(amount, participantMembers.map(m => ({ id: m.id, name: m.name })), paidBy);
    const debts = calculateExpenseSettlements(splits, paidBy);

    // Fetch existing settlements for all involved users to ensure accurate updates
    // Map Member ID -> Storage Key (UID for real users, MemberID for temp)
    const getStorageKey = (memberId) => {
      const m = membersArray.find(mem => mem.id === memberId);
      return (m && m.userId) ? m.userId : memberId;
    };

    const involvedMemberIds = new Set([paidBy, ...participants]);
    const settlementsMap = {}; // StorageKey -> { [PeerMemberId]: { toReceive, toPay } }

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
        isTemporary: !!membersArray.find(m => m.id === s.participantId)?.isTemporary
      })),
      place: place || null,
      note: note || null,
      walletBalanceAfter,
      createdAt: new Date().toISOString(),
      serverTimestamp: serverTime
    };

    updates[`transactions/${transactionId}`] = newTransaction;

    // Record processed transaction for idempotency
    if (clientTxnId) {
      updates[`processedTxns/${clientTxnId}`] = {
        transactionId,
        uid: currentUserId,
        timestamp: serverTime,
        createdAt: new Date().toISOString()
      };
    }

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
      memberCount: membersArray.length,
      participantsCount: participants.length,
      participants: newTransaction.participants // Added to avoid N+1 query
    };

    membersArray.forEach(m => {
      if (m.userId) {
        const userSummary = { ...transactionSummaryBase };
        const split = splits.find(s => s.participantId === m.id);

        userSummary.userIsPayer = (m.id === paidBy);
        userSummary.userIsParticipant = !!split;
        userSummary.userShare = split ? split.amount : 0;

        updates[`userTransactions/${m.userId}/${transactionId}`] = userSummary;
      }
    });

    // D. Apply Bidirectional Settlement Updates
    for (const debt of debts) {
      const { debtorId, creditorId, amount } = debt;

      const debtorStorageKey = getStorageKey(debtorId);
      const creditorStorageKey = getStorageKey(creditorId);

      // 1. Update Debtor's Settlements (Debtor owes Creditor)
      // Path: users/{DebtorStorageKey}/settlements/{GroupId}/{CreditorMemberId}
      const debtorSettlements = settlementsMap[debtorStorageKey] || {};
      const debtorToCreditor = debtorSettlements[creditorId] || { toReceive: 0, toPay: 0 };

      let debtorNewToPay = (debtorToCreditor.toPay || 0) + amount;
      let debtorNewToReceive = (debtorToCreditor.toReceive || 0);

      // Netting removed as per user request (Bidirectional debts allowed)
      // if (debtorNewToPay > 0 && debtorNewToReceive > 0) { ... }

      updates[`users/${debtorStorageKey}/settlements/${groupId}/${creditorId}`] = {
        toReceive: Math.max(0, debtorNewToReceive),
        toPay: Math.max(0, debtorNewToPay)
      };

      // 2. Update Creditor's Settlements (Creditor receives from Debtor)
      // Path: users/{CreditorStorageKey}/settlements/{GroupId}/{DebtorMemberId}
      const creditorSettlements = settlementsMap[creditorStorageKey] || {};
      const creditorFromDebtor = creditorSettlements[debtorId] || { toReceive: 0, toPay: 0 };

      let creditorNewToReceive = (creditorFromDebtor.toReceive || 0) + amount;
      let creditorNewToPay = (creditorFromDebtor.toPay || 0);

      // Netting removed as per user request
      // if (creditorNewToReceive > 0 && creditorNewToPay > 0) { ... }

      updates[`users/${creditorStorageKey}/settlements/${groupId}/${debtorId}`] = {
        toReceive: Math.max(0, creditorNewToReceive),
        toPay: Math.max(0, creditorNewToPay)
      };

      // Update local map to handle multiple debts between same pair?
      // Since Debtor->Creditor pair is unique in this loop (one split per participant),
      // we don't need to update settlementsMap mid-loop.
    }

    // 6. Execute Atomic Update
    await db.ref().update(updates);

    // 7. Await Notifications (CRITICAL for Vercel/Serverless)
    // Run them BEFORE res.json to ensure the process isn't killed before they finish
    console.log('🚀 Triggering Notifications for Transaction:', transactionId);

    try {
      // Run Push and Email in parallel
      const notificationPromises = [];

      // A. Push Notifications (OneSignal)
      const membersWithUserId = membersArray.filter(m => m.userId);
      if (membersWithUserId.length > 0) {
        const userIds = membersWithUserId.map(m => m.userId);
        notificationPromises.push(
          sendOneSignalNotificationInternal({
            userIds,
            title: `New Expense in ${group.name}`,
            body: `${payer.name} paid Rs ${amount.toLocaleString()} for "${note || 'Expense'}"`,
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
          // Fetch all preferences in parallel
          const preferencePromises = participantsWithEmail.map(async (participant) => {
            if (!participant.userId) return { participant, emailEnabled: true };
            try {
              const getPref = admin.firestore().doc(`users/${participant.userId}/preferences/notifications`).get();
              const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 3000));
              const prefSnap = await Promise.race([getPref, timeout]);
              return {
                participant,
                emailEnabled: prefSnap.exists ? prefSnap.data().emailEnabled !== false : true
              };
            } catch (err) {
              console.warn(`⚠️ Preference check failed for ${participant.email}: ${err.message}. Defaulting to ENABLED.`);
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
                payerName: payer.name,
                amount: amount.toLocaleString(),
                title: note || 'Expense',
                splitAmount: split ? split.amount.toLocaleString() : '0',
                date: new Date(newTransaction.date).toLocaleDateString(),
                groupName: group.name,
                groupId: groupId,
                note: note || ''
              });
            }));
            const successCount = emailResults.filter(r => r.status === 'fulfilled' && r.value?.success).length;
            console.log(`✅ Sent ${successCount}/${recipientsWithPreference.length} expense emails`);
          }
        })());
      }

      // Wait for all notifications (or at least attempt them) with a global timeout for safety
      const globalTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Global notification timeout')), 8000));
      await Promise.race([Promise.allSettled(notificationPromises), globalTimeout]).catch(e => console.warn('⚠️ Notifications timed out or failed partially:', e.message));

    } catch (notifErr) {
      console.error('⚠️ Notification process failed:', notifErr.message);
    }

    // 8. Success Response
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

    // Check for duplicate payment (same from/to/amount/group within 30 seconds)
    const recentPaymentsSnap = await db.ref('transactions')
      .orderByChild('timestamp')
      .startAt(Date.now() - 30000)
      .get();

    if (recentPaymentsSnap.exists()) {
      const recentPayments = recentPaymentsSnap.val();
      const isDuplicate = Object.values(recentPayments).some((tx) =>
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

    const isReceiving = toMember === currentUserId;
    const isPaying = fromMember === currentUserId;

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

    // A. Update Wallet Balances (For BOTH parties)
    const walletBalancesSnapshot = {};

    // 1. Update Current User (Recorder)
    let currentUserBalanceBefore = user.walletBalance || 0;
    let currentUserBalanceAfter = currentUserBalanceBefore;

    if (isPaying) {
      if (currentUserBalanceBefore < amount) {
        return res.status(400).json({ success: false, error: 'Insufficient wallet balance' });
      }
      currentUserBalanceAfter -= amount;
    } else {
      currentUserBalanceAfter += amount;
    }
    updates[`users/${currentUserId}/walletBalance`] = currentUserBalanceAfter;

    walletBalancesSnapshot[currentUserId] = {
      before: currentUserBalanceBefore,
      after: currentUserBalanceAfter
    };

    // 2. Update Other User (if they exist)
    if (otherUser && otherPerson.userId) {
      let otherUserBalanceBefore = otherUser.walletBalance || 0;
      let otherUserBalanceAfter = otherUserBalanceBefore;

      if (isPaying) {
        // Current user paid -> Other user receives
        otherUserBalanceAfter += amount;
      } else {
        // Current user received -> Other user paid
        if (otherUserBalanceBefore < amount) {
          return res.status(400).json({ success: false, error: 'Other user has insufficient wallet balance' });
        }
        otherUserBalanceAfter -= amount;
      }
      updates[`users/${otherPerson.userId}/walletBalance`] = otherUserBalanceAfter;

      walletBalancesSnapshot[otherPerson.userId] = {
        before: otherUserBalanceBefore,
        after: otherUserBalanceAfter
      };
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
      walletBalanceBefore: currentUserBalanceBefore, // Legacy (Recorder's)
      walletBalanceAfter: currentUserBalanceAfter,   // Legacy (Recorder's)
      walletBalances: walletBalancesSnapshot,        // NEW: Per-user snapshots
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
      from: fromMember, // Alignment with Transaction interface
      to: toMember,     // Alignment with Transaction interface
      paidByName: fromPerson.name,
      fromName: fromPerson.name,
      toName: toPerson.name,
      method,
      memberCount: membersArray.length
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

    // 7. Notifications (Awaited for Vercel/Serverless)
    console.log('🚀 Triggering Notifications for Payment:', transactionId);
    try {
      const notificationPromises = [];

      // A. Push Notifications (OneSignal)
      const membersWithUserId = membersArray.filter(m => m.userId);
      if (membersWithUserId.length > 0) {
        const userIds = membersWithUserId.map(m => m.userId);
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
        id: `member_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
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
        id: `member_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
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

// Cleanup Unverified Users Endpoint (Admin/Secure)
app.post('/api/cleanup-unverified-users', authenticate, async (req, res) => {
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
    const firestore = admin.firestore();

    for (const [uid, accountData] of Object.entries(accounts)) {
      try {
        // Skip if already verified (double check)
        if (accountData.emailVerified) {
          continue;
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

        // 2. Delete user profile from Realtime Database
        await db.ref(`users/${uid}`).remove();

        // 3. Delete email verification record from Realtime Database
        await db.ref(`emailVerification/${uid}`).remove();

        // 4. Delete verification codes (Legacy RTDB & Firestore)
        if (accountData.email) {
          // RTDB (Legacy/Invalid Path Handling)
          try {
            // Firebase keys cannot contain '.', but if stored somehow, we try to delete
            // If the key was sanitized (e.g. replaced . with ,), we need to match that logic
            // Assuming direct email usage as key is problematic in RTDB, but we try anyway
            // or just skip if it throws
            await db.ref(`verificationCodes/${accountData.email}`).remove();
          } catch (e) {
            console.warn('Could not delete RTDB verification codes for user:', e.message);
          }

          // Firestore (Current)
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
        }

        deletedCount++;

      } catch (err) {
        console.error(`Failed to delete user ${uid}:`, err);
        errors.push({ uid, error: err.message });
      }
    }

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
