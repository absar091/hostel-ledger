/**
 * Admin Authentication Middleware
 * Verifies that the request contains a valid x-admin-key header.
 */
module.exports = (req, res, next) => {
  const adminKey = process.env.ADMIN_API_KEY;
  const requestKey = req.headers['x-admin-key'];

  if (!adminKey) {
    console.error('❌ ADMIN_API_KEY not configured in environment variables');
    return res.status(500).json({
      success: false,
      error: 'Server configuration error'
    });
  }

  if (!requestKey || requestKey !== adminKey) {
    console.warn(`⚠️ Unauthorized admin access attempt from ${req.ip}`);
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or missing admin key'
    });
  }

  next();
};
