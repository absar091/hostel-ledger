const admin = require('firebase-admin');

// Middleware to verify the user has the 'admin' or 'superadmin' role
const verifyAdmin = async (req, res, next) => {
  try {
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
  verifySuperAdmin
};
