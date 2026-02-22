/**
 * Admin Authentication Middleware
 * Verifies that the request contains a valid x-admin-key header.
 */
const crypto = require('crypto');

module.exports = (req, res, next) => {
  const adminKeysEnv = process.env.ADMIN_API_KEY;
  const requestKey = req.headers['x-admin-key'];

  if (!adminKeysEnv) {
    console.error('❌ ADMIN_API_KEY not configured in environment variables');
    return res.status(500).json({
      success: false,
      error: 'Server configuration error'
    });
  }

  // Support multiple keys (comma separated) for rotation
  const validKeys = adminKeysEnv.split(',').map(key => key.trim()).filter(key => key.length > 0);

  if (validKeys.length === 0) {
    console.error('❌ No valid ADMIN_API_KEY found in environment variables');
    return res.status(500).json({
      success: false,
      error: 'Server configuration error'
    });
  }

  if (!requestKey) {
    console.warn(`⚠️ Unauthorized admin access attempt from ${req.ip} (Missing Header)`);
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or missing admin key'
    });
  }

  // Constant-time comparison using SHA-256 hashing
  // This prevents timing attacks and safely handles keys of different lengths
  const hash = (str) => crypto.createHash('sha256').update(str).digest();

  const requestKeyHash = hash(requestKey);
  const isValid = validKeys.some(key => {
    const validKeyHash = hash(key);
    // crypto.timingSafeEqual throws if lengths differ, but SHA-256 hashes are always 32 bytes
    return crypto.timingSafeEqual(requestKeyHash, validKeyHash);
  });

  if (!isValid) {
    console.warn(`⚠️ Unauthorized admin access attempt from ${req.ip} (Invalid Key)`);
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or missing admin key'
    });
  }

  next();
};
