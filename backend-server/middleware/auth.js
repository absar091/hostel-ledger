const admin = require('../config/firebase');

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

module.exports = authenticate;
