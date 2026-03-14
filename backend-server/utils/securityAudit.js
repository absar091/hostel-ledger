const admin = require('firebase-admin');

/**
 * High-fidelity security logging system
 */
const securityAudit = {
    /**
     * Log a security-related event
     * @param {string} type - Event type (e.g., 'fraud_detection', 'auth_bypass_attempt', 'automated_ban')
     * @param {Object} data - Detailed event data
     */
    logEvent: async (type, data) => {
        try {
            const db = admin.database();
            const auditRef = db.ref('securityAudit').push();
            
            const event = {
                type,
                timestamp: admin.database.ServerValue.TIMESTAMP,
                ...data,
                serverTime: new Date().toISOString()
            };

            await auditRef.set(event);
            
            console.log(`[SECURITY AUDIT] ${type}:`, JSON.stringify(data));
            
            // If it's a critical event (like a ban), we might want to log to a specific high-priority node too
            if (data.severity === 'critical') {
                await db.ref('alerts/critical').push(event);
            }
        } catch (error) {
            console.error('[SECURITY AUDIT ERROR]:', error);
        }
    }
};

module.exports = securityAudit;
