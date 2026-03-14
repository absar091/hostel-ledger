const admin = require('firebase-admin');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;

      // Pre-check account status for every authenticated request
      const statusSnap = await admin.database().ref(`users/${decodedToken.uid}/accountStatus`).once('value');
      if (statusSnap.exists() && statusSnap.val() === 'banned') {
        return res.status(403).json({
          error: 'Account Suspended',
          message: 'Your account has been suspended due to suspicious activity. If this is a mistake, please contact support@aarx.online.',
          code: 'USER_BANNED'
        });
      }

      next();
    } catch (tokenError) {
      // If token verification fails, check if the user is banned (revoked token scenario)
      if (tokenError.code === 'auth/id-token-revoked' || tokenError.code === 'auth/user-disabled') {
        // Try to extract UID from the token payload (without verification)
        try {
          const base64Payload = token.split('.')[1];
          const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
          const uid = payload.sub || payload.user_id;
          if (uid) {
            const statusSnap = await admin.database().ref(`users/${uid}/accountStatus`).once('value');
            if (statusSnap.exists() && statusSnap.val() === 'banned') {
              return res.status(403).json({
                error: 'Account Suspended',
                message: 'Your account has been suspended due to suspicious activity. If this is a mistake, please contact support@aarx.online.',
                code: 'USER_BANNED'
              });
            }
          }
        } catch (e) { /* ignore decode errors */ }
      }
      console.error('Error verifying auth token:', tokenError.code || tokenError.message);
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  } catch (error) {
    console.error('Authenticate middleware error:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

module.exports = authenticate;
