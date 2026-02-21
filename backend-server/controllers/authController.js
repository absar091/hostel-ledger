const admin = require('../config/firebase');
const emailService = require('../services/emailService');

// Request a verification code
const requestVerification = async (req, res) => {
  try {
    const { email, name, type, userId } = req.body;

    if (!email || !name || !type) {
      return res.status(400).json({ success: false, error: 'Missing required fields: email, name, type' });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
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
};

// Verify a code
const verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Email and code are required' });
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
};

// Check if a valid verification code exists
const checkVerification = async (req, res) => {
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
};

// Email existence check endpoint
const checkEmailExists = async (req, res) => {
  // Add random delay to mitigate timing attacks (500ms - 1500ms)
  const randomDelay = Math.floor(Math.random() * 1000) + 500;
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
};

module.exports = {
  requestVerification,
  verifyCode,
  checkVerification,
  checkEmailExists
};
