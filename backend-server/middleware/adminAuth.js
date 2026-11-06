const admin = require('firebase-admin');

// Generic function to verify API key
const verifyApiKey = (req, res) => {
  const envKeys = process.env.ADMIN_API_KEY;

  if (!envKeys) {
    console.error('CRITICAL: ADMIN_API_KEY is not set in environment variables');
    res.status(500).json({ error: 'Server configuration error' });
    return false;
  }

  const providedKey = req.headers['x-admin-key'];
  if (!providedKey) {
    console.warn('Admin API access attempted without x-admin-key header');
    res.status(401).json({ error: 'Unauthorized: Invalid or missing admin key' });
    return false;
  }

  const validKeys = envKeys.split(',').map(k => k.trim());
  if (!validKeys.includes(providedKey)) {
    console.warn('Admin API access attempted with invalid x-admin-key');
    res.status(401).json({ error: 'Unauthorized: Invalid or missing admin key' });
    return false;
  }

  return true;
};

// Middleware to verify the user has the 'admin' or 'superadmin' role
const verifyAdmin = async (req, res, next) => {
  try {
    if (!verifyApiKey(req, res)) return;

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    const db = admin.database();
    const userSnapshot = await db.ref(`users/${uid}`).once('value');

    if (!userSnapshot.exists()) {
      return res.status(403).json({ error: 'Forbidden: User not found in database' });
    }

    const userData = userSnapshot.val();
    const role = userData.role;

    if (role !== 'admin' && role !== 'superadmin') {
      return res.status(403).json({ error: 'Forbidden: Requires admin privileges' });
    }

    req.user = decodedToken;
    req.adminRole = role; // Attach the role so endpoints can differentiate between admin/superadmin
    next();
  } catch (error) {
    console.error('Error verifying admin token:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// Middleware specifically for 'superadmin' only
const verifySuperAdmin = async (req, res, next) => {
  try {
    if (!verifyApiKey(req, res)) return;

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    const db = admin.database();
    const userSnapshot = await db.ref(`users/${uid}`).once('value');

    if (!userSnapshot.exists()) {
      return res.status(403).json({ error: 'Forbidden: User not found in database' });
    }

    const userData = userSnapshot.val();
    const role = userData.role;

    if (role !== 'superadmin') {
      return res.status(403).json({ error: 'Forbidden: Requires superadmin privileges' });
    }

    req.user = decodedToken;
    req.adminRole = role;
    next();
  } catch (error) {
    console.error('Error verifying superadmin token:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

module.exports = {
  verifyAdmin,
  verifySuperAdmin,
  verifyApiKey // Expose for testing if needed
};
