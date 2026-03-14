const admin = require('firebase-admin');
const logger = require('../utils/logger');
const adminService = require('../services/adminService');
const securityAudit = require('../utils/securityAudit');
const { getDeviceInfo } = require('../utils/deviceInfo');

// Map to track user behavioral score and status in memory
// Key: uid, Value: { score: number, lastAction: number, actions: [], fingerprint: string }
const fraudTracker = new Map();

// Configuration
const WINDOW_MS = 10000; // 10 seconds
const CRITICAL_SCORE = 100;

/**
 * Enterprise Fraud & Abuse Detection Middleware
 */
const detectFraud = async (req, res, next) => {
    // Only track authenticated requests
    if (!req.user || !req.user.uid) return next();

    const uid = req.user.uid;
    const now = Date.now();
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'unknown';

    // 1. Pre-check: Is user already banned?
    try {
        const userSnap = await admin.database().ref(`users/${uid}/accountStatus`).once('value');
        if (userSnap.exists() && userSnap.val() === 'banned') {
            return res.status(403).json({
                error: 'Unauthorized',
                message: 'Your account is banned due to suspicious activity. Contact support@aarx.online.',
                code: 'USER_BANNED'
            });
        }
    } catch (error) {
        logger.error(`❌ Error checking account status for ${uid}:`, error);
    }

    // 2. Identify Sensitive Operations
    const sensitiveEndpoints = [
        '/api/add-expense',
        '/api/record-payment',
        '/api/send-money',
        '/api/reminders/send',
        '/api/send-message',
        '/api/2fa/setup',
        '/api/support'
    ];

    const isSensitive = sensitiveEndpoints.some(endpoint => req.originalUrl.includes(endpoint));
    if (!isSensitive || req.method !== 'POST') return next();

    // 3. Behavioral Analysis & Scoring
    let state = fraudTracker.get(uid) || { score: 0, actions: [], fingerprint: `${ip}-${userAgent}` };
    
    // Clean old actions
    state.actions = state.actions.filter(a => now - a.timestamp < WINDOW_MS);
    
    let deltaScore = 0;
    const currentAction = { timestamp: now, endpoint: req.originalUrl, body: JSON.stringify(req.body) };

    // Factor A: Velocity (40pts if > 15 actions in 10s)
    if (state.actions.length >= 15) {
        deltaScore += 40;
        logger.debug(`[FRAUD] High velocity for ${uid}: ${state.actions.length} actions/10s`);
    }

    // Factor B: Identical Spam Pattern (30pts)
    const recentIdentical = state.actions.filter(a => a.body === currentAction.body);
    if (recentIdentical.length >= 3) {
        deltaScore += 30;
        logger.debug(`[FRAUD] Repeated pattern for ${uid}`);
    }

    // Factor C: Fingerprint Mismatch (20pts) - basic check
    const currentFingerprint = `${ip}-${userAgent}`;
    if (state.fingerprint && state.fingerprint !== currentFingerprint) {
        deltaScore += 20;
        // Update fingerprint to current but penalize the switch
        state.fingerprint = currentFingerprint;
    }

    state.score += deltaScore;
    state.actions.push(currentAction);
    
    // Decay score slowly if no bad behavior
    if (deltaScore === 0 && state.score > 0) {
        state.score = Math.max(0, state.score - 5);
    }

    fraudTracker.set(uid, state);

    // 4. Automated Enforcement
    if (state.score >= CRITICAL_SCORE) {
        const reason = `Automated ban: Security score ${state.score} exceeded critical threshold. Evidence: High velocity and repeated patterns.`;
        
        logger.warn(`🚨 CRITICAL FRAUD: User ${uid} score: ${state.score}. Banning...`);
        
        try {
            // Log to high-fidelity audit
            await securityAudit.logEvent('automated_ban', {
                uid,
                score: state.score,
                reason,
                ip,
                userAgent,
                severity: 'critical'
            });

            // Execute Ban
            await adminService.updateUserStatus(uid, 'banned', reason);
            
            return res.status(403).json({
                error: 'Security Breach Protocol',
                message: 'Your account has been suspended by our automated security system. An email has been sent with details.',
                code: 'USER_BANNED'
            });
        } catch (error) {
            logger.error(`❌ Failed enforced action on ${uid}:`, error);
        }
    }

    next();
};

module.exports = detectFraud;
