const admin = require('firebase-admin');
const logger = require('../utils/logger');
const adminService = require('../services/adminService');

// Map to track user requests in memory
// Key: uid, Value: { count: number, startTime: number }
const requestTracker = new Map();

// Configuration
const WINDOW_MS = 10000; // 10 seconds
const MAX_REQUESTS = 15; // 15 expenses

/**
 * Middleware to detect fraud and abuse.
 * Specifically checks for rapid expense additions (15 expenses in 10 seconds).
 */
const detectFraud = async (req, res, next) => {
    // We only track requests with a valid user context (authenticated)
    if (!req.user || !req.user.uid) {
        return next();
    }

    const uid = req.user.uid;
    const now = Date.now();

    // Sensitive endpoints that we monitor for fraud
    const sensitiveEndpoints = [
        '/api/ai/parse-expense-audio',
        '/api/groups/expense', // Hypothetical, let's check actual endpoints in server.js
        '/api/add-expense',
        '/api/transactions'
    ];

    // Check if current request is to a sensitive endpoint
    const isSensitive = sensitiveEndpoints.some(endpoint => req.originalUrl.includes(endpoint));
    
    if (isSensitive && req.method === 'POST') {
        let userStats = requestTracker.get(uid);

        if (!userStats || (now - userStats.startTime > WINDOW_MS)) {
            // Reset or initialize tracker
            userStats = { count: 1, startTime: now };
        } else {
            userStats.count++;
        }

        requestTracker.set(uid, userStats);

        // Check for abuse
        if (userStats.count > MAX_REQUESTS) {
            logger.warn(`🚨 Fraud Detected! User ${uid} exceeded limit: ${userStats.count} requests in <10s.`);
            
            try {
                // Block the user
                await adminService.updateUserStatus(uid, 'banned');
                logger.info(`🚫 User ${uid} has been automatically banned due to suspicious activity.`);
                
                // Log detailed fraud record in database
                await admin.database().ref(`securityAudit/fraud/${uid}/${Date.now()}`).set({
                    reason: 'Rate limit exceeded (Abuse detection)',
                    requestCount: userStats.count,
                    timeWindow: '10s',
                    endpoint: req.originalUrl,
                    timestamp: admin.database.ServerValue.TIMESTAMP
                });

                return res.status(403).json({
                    error: 'Account suspicious activity detected',
                    message: 'Your account has been temporarily suspended due to suspicious activity. Please contact support.',
                    code: 'USER_BANNED'
                });
            } catch (error) {
                logger.error(`❌ Failed to ban user ${uid} during fraud detection:`, error);
            }
        }
    }

    // Check if user is already banned in the database before proceeding
    try {
        const userSnap = await admin.database().ref(`users/${uid}/accountStatus`).once('value');
        if (userSnap.exists() && userSnap.val() === 'banned') {
            return res.status(403).json({
                error: 'Unauthorized',
                message: 'Your account is banned. Contact support for details.',
                code: 'USER_BANNED'
            });
        }
    } catch (error) {
        logger.error(`❌ Error checking account status for ${uid}:`, error);
    }

    next();
};

module.exports = detectFraud;
