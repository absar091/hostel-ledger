const nodemailer = require('nodemailer');
const { loadEmailTemplate } = require('../utils/email');

// Environment variables should be checked at startup
const SMTP_CONFIG = {
    primary: { // Zoho (Best for Auth/OTP)
        host: (process.env.SMTP_HOST || 'smtp.zoho.in').trim(),
        port: parseInt(process.env.SMTP_PORT) || 465,
        secure: process.env.SMTP_SECURE === 'false' ? false : true, // Support explict false
        auth: {
            user: (process.env.SMTP_USER || '').trim(),
            pass: (process.env.SMTP_PASS || '').replace(/\s+/g, '')
        },
        tls: {
            rejectUnauthorized: false // Often needed for proxies/various environments
        },
        connectionTimeout: 15000,
        greetingTimeout: 10000
    },
    transactional: { // SendPulse (Best for Notifications)
        host: (process.env.SENDPULSE_SMTP_HOST || 'smtp-pulse.com').trim(),
        port: parseInt(process.env.SENDPULSE_SMTP_PORT) || 2525,
        secure: (parseInt(process.env.SENDPULSE_SMTP_PORT) === 465),
        auth: {
            user: (process.env.SENDPULSE_SMTP_USER || '').trim(),
            pass: (process.env.SENDPULSE_SMTP_PASS || '').replace(/\s+/g, '')
        },
        tls: {
            rejectUnauthorized: false
        },
        connectionTimeout: 20000,
        greetingTimeout: 15000
    },
    fallback: { // Gmail (Universal Backup)
        host: (process.env.FALLBACK_SMTP_HOST || 'smtp.gmail.com').trim(),
        port: parseInt(process.env.FALLBACK_SMTP_PORT) || 465,
        secure: true,
        auth: {
            user: (process.env.FALLBACK_SMTP_USER || '').trim(),
            pass: (process.env.FALLBACK_SMTP_PASS || '').replace(/\s+/g, '')
        },
        tls: {
            rejectUnauthorized: false
        },
        connectionTimeout: 20000
    }
};

// Singleton transporters
let primaryTransporter = null;
let transactionalTransporter = null;
let fallbackTransporter = null;

const createTransporter = (config) => {
    return nodemailer.createTransport(config);
};

const getPrimaryTransporter = () => { // Zoho
    if (!primaryTransporter) {
        console.log('📧 Initializing Primary Transporter (Zoho)...');
        primaryTransporter = createTransporter(SMTP_CONFIG.primary);
    }
    return primaryTransporter;
};

const getTransactionalTransporter = () => { // SendPulse
    if (!transactionalTransporter) {
        console.log('📧 Initializing Transactional Transporter (SendPulse)...');
        transactionalTransporter = createTransporter(SMTP_CONFIG.transactional);
    }
    return transactionalTransporter;
};

const getFallbackTransporter = () => { // Gmail
    if (!fallbackTransporter) {
        console.log('📧 Initializing Fallback Transporter (Gmail)...');
        fallbackTransporter = createTransporter(SMTP_CONFIG.fallback);
    }
    return fallbackTransporter;
};

/**
 * Sends an email with automatic fallback and retry logic.
 */
const sendWithTimeout = async (transporter, options, timeoutMs = 15000, providerName = 'Unknown') => {
    return Promise.race([
        transporter.sendMail(options),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`${providerName} sending timed out after ${timeoutMs}ms`)), timeoutMs)
        )
    ]);
};

/**
 * Validates config before attempting connection
 */
const isConfigValid = (config) => {
    return config && config.host && config.auth.user && config.auth.pass;
}

/**
 * Smart Routing Email Sender
 * type: 'auth' | 'transactional'
 */
const sendEmailByType = async (type, mailOptions) => {
    // 1. Determine Primary Provider based on Type
    let primaryProvider = 'primary'; // Default to Zoho
    let primaryGetFn = getPrimaryTransporter;
    let fromAddress = `Hostel Ledger <${SMTP_CONFIG.primary.auth.user}>`;

    if (type === 'transactional' && isConfigValid(SMTP_CONFIG.transactional)) {
        primaryProvider = 'transactional';
        primaryGetFn = getTransactionalTransporter;
        // Use verified sender address from env (e.g. hostelledger@aarx.online) instead of login email
        fromAddress = process.env.EMAIL_FROM || 'Hostel Ledger <hostelledger@aarx.online>';
    }

    // Prepare Options
    const finalMailOptions = {
        ...mailOptions,
        from: fromAddress, // Set correct FROM address for the provider
        headers: {
            ...mailOptions.headers,
            // Add List-Unsubscribe header (RFC 2369)
            // Including both mailto and https increases chance of Gmail/Outlook showing the button
            ...(type === 'transactional' ? {
                'List-Unsubscribe': '<mailto:hostelledger@aarx.online?subject=Unsubscribe>, <https://app.hostelledger.aarx.online/settings>'
            } : {})
        }
    };

    try {
        console.log(`📨 Sending (${type}) to ${finalMailOptions.to} via ${primaryProvider.toUpperCase()}...`);
        const transporter = primaryGetFn();

        // 5 second shorter timeout for Auth to allow quicker fallback
        const timeout = type === 'auth' ? 10000 : 15000;

        const info = await sendWithTimeout(transporter, finalMailOptions, timeout, primaryProvider);
        console.log(`✅ Sent via ${primaryProvider.toUpperCase()}: ${info.messageId}`);
        return { success: true, message: `Sent via ${primaryProvider}`, provider: primaryProvider, messageId: info.messageId };

    } catch (primaryError) {
        console.warn(`⚠️ ${primaryProvider.toUpperCase()} Failed: ${primaryError.message}`);

        // 2. Fallback Logic
        // If Primary (Zoho) failed -> Try Fallback (Gmail)
        // If Transactional (SendPulse) failed -> Try Primary (Zoho) -> Then Fallback (Gmail)

        if (primaryProvider === 'transactional') {
            try {
                console.log(`🔄 Failing over to ZOHO (Backup for Transactional)...`);
                const zoho = getPrimaryTransporter();
                const zohoOptions = { ...finalMailOptions, from: `Hostel Ledger <${SMTP_CONFIG.primary.auth.user}>` };

                const info = await sendWithTimeout(zoho, zohoOptions, 15000, 'Zoho');
                console.log(`✅ Sent via ZOHO (Fallback): ${info.messageId}`);
                return { success: true, message: 'Sent via Zoho (Fallback)', provider: 'primary', messageId: info.messageId };
            } catch (zohoError) {
                console.warn(`⚠️ Zoho Fallback Failed: ${zohoError.message}`);
                // Continue to Gmail fallback below...
            }
        }

        // 3. Ultimate Fallback: Gmail
        try {
            console.log(`🚨 Failing over to GMAIL (Ultimate Backup)...`);
            const gmail = getFallbackTransporter();
            const gmailOptions = { ...finalMailOptions, from: `Hostel Ledger <${SMTP_CONFIG.fallback.auth.user}>` };

            const info = await sendWithTimeout(gmail, gmailOptions, 20000, 'Gmail');
            console.log(`✅ Sent via GMAIL: ${info.messageId}`);
            return { success: true, message: 'Sent via Gmail (Fallback)', provider: 'fallback', messageId: info.messageId };
        } catch (gmailError) {
            console.error(`❌ ALL transports failed for ${finalMailOptions.to}`);
            return { success: false, error: gmailError.message };
        }
    }
};

const sendEmailSafe = async (mailOptions) => {
    return sendEmailByType('transactional', mailOptions); // Default to transactional if generic call
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Escapes HTML special characters to prevent injection attacks
 */
const escapeHtml = (text) => {
    if (typeof text !== 'string') return text;
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

// ============================================================================
// EXPORTED METHODS
// ============================================================================

const emailService = {
    /**
     * Verify SMTP credentials on startup (non-blocking)
     */
    verifyConnection: async () => {
        try {
            console.log('🧪 Verifying SMTP Configurations...');
            let allGood = true;

            // Primary (Zoho)
            try {
                if (isConfigValid(SMTP_CONFIG.primary)) {
                    const primary = getPrimaryTransporter();
                    await primary.verify();
                    console.log('✅ SMTP Connection Verified (Zoho)');
                } else {
                    console.warn('⚠️ Primary SMTP (Zoho) not configured.');
                    allGood = false;
                }
            } catch (err) {
                console.warn('⚠️ Primary SMTP Connection Failed (Zoho):', err.message);
                allGood = false;
            }

            // Transactional (SendPulse)
            try {
                if (isConfigValid(SMTP_CONFIG.transactional)) {
                    const transactional = getTransactionalTransporter();
                    await transactional.verify();
                    console.log('✅ SMTP Connection Verified (SendPulse)');
                } else {
                    console.warn('⚠️ Transactional SMTP (SendPulse) not configured.');
                    allGood = false;
                }
            } catch (err) {
                console.warn('⚠️ Transactional SMTP Connection Failed (SendPulse):', err.message);
                console.warn('   Ensure port 2525 is open and credentials in .env are correct.');
                allGood = false;
            }

            // Fallback (Gmail)
            try {
                if (isConfigValid(SMTP_CONFIG.fallback)) {
                    const fallback = getFallbackTransporter();
                    await fallback.verify();
                    console.log('✅ SMTP Connection Verified (Gmail)');
                } else {
                    console.warn('⚠️ Fallback SMTP (Gmail) not configured.');
                    allGood = false;
                }
            } catch (err) {
                console.warn('⚠️ Fallback SMTP Connection Failed (Gmail):', err.message);
                allGood = false;
            }

            return allGood;
        } catch (fatalError) {
            console.error('❌ unexpected error during SMTP verification:', fatalError);
            return false;
        }
    },

    /**
     * Send Verification Email (High Priority - Auth Type)
     * Uses template: verification.html
     */
    sendVerification: async (email, otp, name) => {
        const safeName = escapeHtml(name);
        const safeOtp = escapeHtml(otp);

        const html = await loadEmailTemplate('verification', {
            USER_NAME: safeName,
            CODE: safeOtp
        });

        if (!html) {
            console.error('Failed to load verification template');
            return { success: false, error: 'Template loading failed' };
        }

        return sendEmailByType('auth', {
            to: email,
            subject: 'Verify your email - Hostel Ledger',
            html
        });
    },

    /**
     * Send Invitation Email
     * Uses template: invitation.html or external-invitation.html
     */
    sendInvitation: async (email, senderName, groupName, link, isNewUser = false) => {
        const safeSender = escapeHtml(senderName);
        const safeGroup = escapeHtml(groupName);
        const templateName = isNewUser ? 'external-invitation' : 'invitation';

        const html = await loadEmailTemplate(templateName, {
            SENDER_NAME: safeSender,
            GROUP_NAME: safeGroup,
            INVITEE_NAME: 'Friend', // Fallback, will be replaced if known
            LINK: link
        });

        if (!html) {
            console.error(`Failed to load ${templateName} template`);
            return { success: false, error: 'Template loading failed' };
        }

        return sendEmailByType('transactional', {
            to: email,
            subject: `${senderName} invited you to join ${groupName}`,
            html
        });
    },

    /**
     * Send Welcome Email (Transactional)
     * Uses template: welcome.html
     */
    sendWelcome: async (email, name) => {
        const safeName = escapeHtml(name);
        const html = await loadEmailTemplate('welcome', {
            USER_NAME: safeName
        });

        if (!html) {
            console.error('Failed to load welcome template');
            return { success: false, error: 'Template loading failed' };
        }

        return sendEmailByType('transactional', {
            to: email,
            subject: 'Welcome to Hostel Ledger! 🎉',
            html
        });
    },

    /**
     * Send Password Reset Email
     * Uses template: password-reset.html
     */
    sendPasswordReset: async (email, resetLink, name) => {
        const safeName = escapeHtml(name);
        const html = await loadEmailTemplate('password-reset', {
            USER_NAME: safeName,
            RESET_LINK: resetLink
        });

        if (!html) return { success: false, error: 'Template loading failed' };

        return sendEmailByType('auth', {
            to: email,
            subject: 'Reset your password - Hostel Ledger',
            html
        });
    },

    /**
     * Send Transaction Alert (Transactional)
     * Uses template: transaction-alert.html
     */
    sendTransactionAlert: async (data) => {
        const { email, name, transactionType, amount, groupName, date, description } = data;
        const safeName = escapeHtml(name);
        const safeGroup = escapeHtml(groupName);
        const safeDesc = escapeHtml(description);
        const safeType = escapeHtml(transactionType);

        const html = await loadEmailTemplate('transaction-alert', {
            USER_NAME: safeName,
            TRANSACTION_TYPE: safeType,
            AMOUNT: amount,
            GROUP_NAME: safeGroup,
            DATE: date,
            DESCRIPTION: safeDesc
        });

        if (!html) {
            console.error('Failed to load transaction-alert template');
            return { success: false, error: 'Template loading failed' };
        }

        return sendEmailSafe({
            to: data.email,
            subject: `${safeType}: Rs ${amount} in ${safeGroup}`,
            html
        });
    },

    /**
     * Send Expense Notification (Transactional)
     * Reusing transaction-alert.html for now but customizing variables if needed
     * Or stick to inline if too complex. Ideally we create expense-notification.html.
     * For now, I'll fallback to transaction-alert logic since it's similar.
     */
    sendExpenseNotification: async (email, data) => {
        // Map to transaction alert structure
        return emailService.sendTransactionAlert({
            email,
            name: 'User', // We don't have recipient name here easily
            transactionType: 'New Expense',
            amount: data.amount,
            groupName: data.groupName,
            date: data.date,
            description: `${data.payerName} paid for ${data.title}. Your share: ${data.splitAmount}`
        });
    },

    /**
     * Send Temporary Member Alert
     * Uses template: temp-member-alert.html
     */
    sendTempMemberAlert: async (email, memberName, groupName, expiryDate) => {
        const safeMember = escapeHtml(memberName);
        const safeGroup = escapeHtml(groupName);
        const safeDate = escapeHtml(expiryDate);

        const html = await loadEmailTemplate('temp-member-alert', {
            MEMBER_NAME: safeMember,
            GROUP_NAME: safeGroup,
            EXPIRY_DATE: safeDate
        });

        if (!html) return { success: false, error: 'Template loading failed' };

        return sendEmailSafe({
            to: email,
            subject: `Temporary Member Alert: ${safeMember}`,
            html
        });
    }
,
    /**
     * Send 2FA Reset Email
     * Uses template: 2fa-reset.html
     */
    send2FAReset: async (email, resetLink, name) => {
        const safeName = escapeHtml(name);
        const html = await loadEmailTemplate('2fa-reset', {
            USER_NAME: safeName,
            RESET_LINK: resetLink
        });

        if (!html) return { success: false, error: 'Template loading failed' };

        return sendEmailByType('auth', {
            to: email,
            subject: 'Action Required: Disable 2FA',
            html
        });
    },

    /**
     * Send 2FA Enabled Email
     * Uses template: 2fa-enabled.html
     */
    send2FAEnabled: async (email, name, details) => {
        const safeName = escapeHtml(name);
        const html = await loadEmailTemplate('2fa-enabled', {
            USER_NAME: safeName,
            DEVICE_NAME: details.deviceName || 'Unknown Device',
            LOCATION: details.location || 'Unknown Location',
            IP_ADDRESS: details.ip || 'Unknown IP',
            TIMESTAMP: details.timestamp || new Date().toLocaleString()
        });

        if (!html) return { success: false, error: 'Template loading failed' };

        return sendEmailByType('auth', {
            to: email,
            subject: 'Security Alert: 2FA Enabled',
            html
        });
    },

    /**
     * Send 2FA Disabled Email
     * Uses template: 2fa-disabled.html
     */
    send2FADisabled: async (email, name, details) => {
        const safeName = escapeHtml(name);
        const html = await loadEmailTemplate('2fa-disabled', {
            USER_NAME: safeName,
            DEVICE_NAME: details.deviceName || 'Unknown Device',
            LOCATION: details.location || 'Unknown Location',
            IP_ADDRESS: details.ip || 'Unknown IP',
            TIMESTAMP: details.timestamp || new Date().toLocaleString()
        });

        if (!html) return { success: false, error: 'Template loading failed' };

        return sendEmailByType('auth', {
            to: email,
            subject: 'Security Alert: 2FA Disabled',
            html
        });
    }

};

module.exports = emailService;
