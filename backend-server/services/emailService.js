const nodemailer = require('nodemailer');

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

const { getCurrencySymbol } = require('../utils/currency');

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
// HELPERS & TEMPLATES
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
// TEMPLATE HELPERS (Refactored for Clean, Mobile-Friendly Design)
// ============================================================================

const getCommonTemplate = (title, content, actionButton = '', showUnsubscribe = false) => {
    const logoUrl = 'https://app.hostelledger.aarx.online/only-logo.png';
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #333333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; }
    .logo { width: 48px; height: auto; margin-top: 20px; margin-bottom: 20px; }
    .title { font-size: 24px; font-weight: 700; color: #111111; margin-bottom: 20px; letter-spacing: -0.5px; line-height: 1.3; }
    .content { font-size: 16px; line-height: 1.6; color: #555555; margin-bottom: 30px; text-align: left; }
    .button-container { text-align: center; margin: 30px 0; }
    .button { background-color: #000000; color: #ffffff; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-weight: 600; display: inline-block; font-size: 16px; }

    /* Footer Card */
    .footer { background-color: #f7f7f7; padding: 20px; border-radius: 12px; margin-top: 40px; font-size: 12px; color: #999999; text-align: center; }
    .footer a { color: #007bff; text-decoration: none; margin: 0 8px; }

    /* Utility */
    .highlight { color: #000; font-weight: 600; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #888; font-size: 14px; }
    .detail-value { font-weight: 600; color: #333; font-size: 14px; text-align: right; }
    .amount-large { font-size: 24px; font-weight: 800; color: #111; margin: 10px 0; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <img src="${logoUrl}" alt="Hostel Ledger" class="logo">
    <h1 class="title">${title}</h1>

    <div class="content">
      ${content}
    </div>

    ${actionButton ? `<div class="button-container">${actionButton}</div>` : ''}

    <div class="footer">
      <p style="margin-bottom: 10px;">
        <a href="https://app.hostelledger.aarx.online/terms-of-service">Terms</a> •
        <a href="https://app.hostelledger.aarx.online/privacy-policy">Privacy</a> •
        <a href="https://app.hostelledger.aarx.online/settings">Preferences</a>
        ${showUnsubscribe ? `• <a href="https://app.hostelledger.aarx.online/settings" style="color: #666; font-weight: bold; text-decoration: underline;">Unsubscribe</a>` : ''}
      </p>
      <p>© ${new Date().getFullYear()} Hostel Ledger.
      </p>
    </div>
  </div>
</body>
</html>
`;
};

// ============================================================================
// EXPORTED METHODS
// ============================================================================

const emailService = {
    // Helper access for templates
    getCommonTemplate,
    escapeHtml,
    
    isConnectionVerified: false,
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

            emailService.isConnectionVerified = allGood;
            return allGood;
        } catch (fatalError) {
            console.error('❌ unexpected error during SMTP verification:', fatalError);
            emailService.isConnectionVerified = false;
            return false;
        }
    },

    /**
     * Send Verification Email (High Priority - Auth Type)
     * Uses Zoho -> Gmail Fallback
     */
    sendVerification: async (email, otp, name) => {
        const safeName = escapeHtml(name);
        const safeOtp = escapeHtml(otp);

        const html = getCommonTemplate(
            'Confirm your email',
            `<p>Hi ${safeName},</p>
             <p>Thank you for signing up for Hostel Ledger. To complete your registration, please verify your email address.</p>
             <p>Your verification code is:</p>
             <div class="otp-box">${safeOtp}</div>
             <p>This code will expire in 10 minutes.</p>`,
            '', // No action button
            false // No unsubscribe for critical auth emails
        );

        return sendEmailByType('auth', {
            to: email,
            subject: 'Verify your email - Hostel Ledger',
            html
        });
    },

    /**
     * Send Invitation Email
     */
    sendInvitation: async (email, senderName, groupName, link, isNewUser = false) => {
        const safeSender = escapeHtml(senderName);
        const safeGroup = escapeHtml(groupName);

        const title = isNewUser ? "You've been invited to Hostel Ledger!" : "You're invited!";
        const buttonText = isNewUser ? 'Sign Up & Join' : 'Join Group';

        const html = getCommonTemplate(
            title,
            `<p><strong>${safeSender}</strong> invited you to join the group <strong>${safeGroup}</strong> on Hostel Ledger.</p>
             <p>Track expenses, settle debts, and manage shared costs easily.</p>
             ${isNewUser ? '<p>Create an account to accept the invitation and start tracking.</p>' : ''}`,
            `<a href="${link}" class="button">${buttonText}</a>`,
            true // Allow unsubscribe
        );

        return sendEmailByType('transactional', {
            to: email,
            subject: `${senderName} invited you to join ${groupName}`,
            html
        });
    },

    /**
     * Send Welcome Email (Transactional)
     * Uses SendPulse -> Zoho -> Gmail Fallback
     */
    sendWelcome: async (email, name) => {
        const safeName = escapeHtml(name);
        const html = getCommonTemplate(
            'Welcome to Hostel Ledger! 🎉',
            `<p>Hi ${safeName},</p>
             <p>We're excited to have you on board! Hostel Ledger makes it easy to track shared expenses with your roommates.</p>
             <p>You can now create groups, add expenses, and settle debts easily.</p>`,
            `<a href="https://app.hostelledger.aarx.online" class="button">Go to Dashboard</a>`,
            false
        );

        return sendEmailByType('transactional', {
            to: email,
            subject: 'Welcome to Hostel Ledger!',
            html
        });
    },

    /**
     * Send Password Reset Email (Legacy - Firebase handles this natively now)
     * But keeping this as a backup or for custom flows.
     */
    sendPasswordReset: async (email, resetLink, name) => {
        const safeName = escapeHtml(name);
        const html = getCommonTemplate(
            'Reset Password',
            `<p>Hi ${safeName},</p>
             <p>We received a request to reset your password. If you didn't make the request, just ignore this email.</p>
             <p>Otherwise, you can reset your password using this link:</p>`,
            `<a href="${resetLink}" class="button">Reset Password</a>`,
            false // Critical security email
        );

        return sendEmailByType('auth', {
            to: email,
            subject: 'Reset your password - Hostel Ledger',
            html
        });
    },

    /**
     * Send Transaction Alert (Transactional)
     */
    sendTransactionAlert: async (data) => {
        const { email, name, transactionType, amount, groupName, date, description } = data;
        const safeName = escapeHtml(name);
        const safeGroup = escapeHtml(groupName);
        const safeDesc = escapeHtml(description);
        const safeType = escapeHtml(transactionType);

        const html = getCommonTemplate(
            `Transaction Alert`,
            `<p>Hi ${safeName},</p>
             <p>A new <strong>${safeType}</strong> was recorded in <strong>${safeGroup}</strong>.</p>
             <div class="amount-box">${amount}</div>
             <p>${safeDesc}</p>
             <p style="font-size: 12px; color: #999; margin-top: 20px;">Date: ${date}</p>`,
            `<a href="https://app.hostelledger.aarx.online" class="button">View Details</a>`,
            true // Allow unsubscribe
        );
        return sendEmailSafe({
            to: data.email,
            subject: `${safeType}: Rs ${amount} in ${safeGroup}`,
            html
        });
    },

    /**
     * Send Expense Notification (Transactional)
     */
    sendExpenseNotification: async (email, data) => {
        // data = { payerName, amount, title, splitAmount, date, groupName, note }
        const safePayer = escapeHtml(data.payerName);
        const safeTitle = escapeHtml(data.title);
        const safeGroup = escapeHtml(data.groupName);
        const safeNote = escapeHtml(data.note);

        const html = getCommonTemplate(
            `New Expense Added`,
            `
        <div style="text-align: center; margin-bottom: 30px;">
          <p style="margin: 0; color: #888; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Total Amount</p>
          <div class="amount-large">Rs ${data.amount}</div>
          <p style="margin: 5px 0 0 0; color: #555;">Paid by <strong>${safePayer}</strong></p>
        </div>

        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top: 1px solid #eeeeee; margin: 20px 0;">
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #eeeeee; color: #888; font-size: 14px;">For</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #eeeeee; text-align: right; font-weight: 600; color: #333;">${safeTitle}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #eeeeee; color: #888; font-size: 14px;">Your Share</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #eeeeee; text-align: right; font-weight: 600; color: #d32f2f;">${data.splitAmount}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #eeeeee; color: #888; font-size: 14px;">Group</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #eeeeee; text-align: right; font-weight: 600; color: #333;">${safeGroup}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #eeeeee; color: #888; font-size: 14px;">Date</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #eeeeee; text-align: right; font-weight: 600; color: #333;">${data.date}</td>
          </tr>
          ${safeNote ? `
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #eeeeee; color: #888; font-size: 14px;">Note</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #eeeeee; text-align: right; font-weight: 600; color: #333;">${safeNote}</td>
          </tr>` : ''}
        </table>
      `,
            `<a href="https://app.hostelledger.aarx.online/group/${data.groupId}" class="button">View Expense</a>`,
            true // Allow unsubscribe
        );

        return sendEmailSafe({
            to: email,
            subject: `New Expense: ${safeTitle} (Rs ${data.amount})`,
            html
        });
    },

    /**
     * Send Temporary Member Alert
     */
    sendTempMemberAlert: async (email, memberName, groupName, expiryDate) => {
        const safeMember = escapeHtml(memberName);
        const safeGroup = escapeHtml(groupName);
        const safeDate = escapeHtml(expiryDate);

        const html = getCommonTemplate(
            'Temporary Member Added',
            `<p>You added <strong>${safeMember}</strong> as a temporary member to group <strong>${safeGroup}</strong>.</p>
             <p>This member is scheduled to be automatically removed on <strong>${safeDate}</strong>.</p>
             <p>Please ensure all debts are settled before this date.</p>`,
            '',
            true
        );

        return sendEmailSafe({
            to: email,
            subject: `Temporary Member Alert: ${safeMember}`,
            html
        });
    },

    /**
     * Send Budget Alert (Transactional)
     */
    sendBudgetAlert: async (data) => {
        const { email, name, type, amount, spent, remaining, groupName } = data;
        const safeName = escapeHtml(name);
        const safeType = escapeHtml(type); // 'Group' or 'Personal'
        const safeGroup = groupName ? escapeHtml(groupName) : '';

        const titleText = type === 'Group' ? `Budget Alert: ${safeGroup}` : 'Personal Budget Alert';
        const contextText = type === 'Group' 
            ? `The budget for group <strong>${safeGroup}</strong> has reached 80% of its limit.`
            : `You have spent 80% of your personal budget.`;

        const html = getCommonTemplate(
            `⚠️ ${titleText}`,
            `
        <p>Hi ${safeName},</p>
        <p>${contextText}</p>

        <div style="text-align: center; margin: 30px 0;">
          <div style="display: flex; justify-content: space-between; max-width: 300px; margin: 0 auto; padding: 10px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666;">Budget Limit:</span>
            <span style="font-weight: 600;">Rs ${amount.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; max-width: 300px; margin: 0 auto; padding: 10px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666;">Amount Spent:</span>
            <span style="font-weight: 600; color: #d32f2f;">Rs ${spent.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; max-width: 300px; margin: 0 auto; padding: 10px 0;">
            <span style="color: #666;">Remaining:</span>
            <span style="font-weight: 600; color: #198754;">Rs ${remaining.toLocaleString()}</span>
          </div>
        </div>
        
        <p>You can adjust your budget settings in the app.</p>
      `,
            `<a href="https://app.hostelledger.aarx.online" class="button">View Dashboard</a>`,
            true // Allow unsubscribe
        );

        return sendEmailSafe({
            to: email,
            subject: `${titleText} (Remaining: Rs ${remaining.toLocaleString()})`,
            html
        });
    }
,
    /**
     * Send 2FA Reset Email
     */
    send2FAReset: async (email, resetLink, name, details = null) => {
        const safeName = escapeHtml(name);

        let detailsHtml = '';
        if (details) {
            const { device, browser, os, ip, location } = details;
            const safeDevice = escapeHtml(device);
            const safeBrowser = escapeHtml(browser);
            const safeOS = escapeHtml(os);
            const safeIP = escapeHtml(ip);
            const safeLocation = escapeHtml(`${location.city}, ${location.region}, ${location.country}`);
            const safeTime = escapeHtml(new Date().toLocaleString('en-US', { timeZone: location.timezone || 'UTC' }));

            detailsHtml = `
             <div style="background-color: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffe0b2;">
                <p style="margin: 0 0 10px 0; font-weight: bold; color: #e65100;">Request Details:</p>
                <p style="margin: 5px 0; font-size: 14px; color: #555;"><strong>Device:</strong> ${safeDevice} (${safeOS}, ${safeBrowser})</p>
                <p style="margin: 5px 0; font-size: 14px; color: #555;"><strong>Location:</strong> ${safeLocation}</p>
                <p style="margin: 5px 0; font-size: 14px; color: #555;"><strong>IP Address:</strong> ${safeIP}</p>
                <p style="margin: 5px 0; font-size: 14px; color: #555;"><strong>Time:</strong> ${safeTime}</p>
             </div>`;
        }

        const html = getCommonTemplate(
            'Disable 2FA Request',
            `<p>Hi ${safeName},</p>
             <p>We received a request to disable Two-Factor Authentication on your account. If you didn't make this request, please change your password immediately.</p>
             ${detailsHtml}
             <p>To disable 2FA, click the button below:</p>`,
            `<a href="${resetLink}" class="button" style="background-color: #d32f2f;">Disable 2FA</a>`,
            false // Critical security email
        );

        return sendEmailByType('auth', {
            to: email,
            subject: 'Action Required: Disable 2FA',
            html
        });
    }

,
    /**
     * Send 2FA Enabled Alert
     */
    send2FAEnabledAlert: async (email, name, details) => {
        const safeName = escapeHtml(name);
        const { device, browser, os, ip, location } = details;
        const safeDevice = escapeHtml(device);
        const safeBrowser = escapeHtml(browser);
        const safeOS = escapeHtml(os);
        const safeIP = escapeHtml(ip);
        const safeLocation = escapeHtml(`${location.city}, ${location.region}, ${location.country}`);
        const safeTime = escapeHtml(new Date().toLocaleString('en-US', { timeZone: location.timezone }));

        const html = getCommonTemplate(
            '🔐 2FA Enabled Successfully',
            `<p>Hi ${safeName},</p>
             <p>Two-Factor Authentication (2FA) has been enabled on your Hostel Ledger account. This adds an extra layer of security to your account.</p>

             <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0; font-size: 14px; color: #666;"><strong>Device:</strong> ${safeDevice} (${safeOS}, ${safeBrowser})</p>
                <p style="margin: 5px 0; font-size: 14px; color: #666;"><strong>Location:</strong> ${safeLocation}</p>
                <p style="margin: 5px 0; font-size: 14px; color: #666;"><strong>IP Address:</strong> ${safeIP}</p>
                <p style="margin: 5px 0; font-size: 14px; color: #666;"><strong>Time:</strong> ${safeTime}</p>
             </div>

             <p>If you did not enable 2FA, please contact support immediately.</p>`,
            `<a href="https://app.hostelledger.aarx.online/settings" class="button">View Security Settings</a>`,
            false // Security alert
        );

        return sendEmailByType('auth', {
            to: email,
            subject: 'Security Alert: 2FA Enabled',
            html
        });
    },

    /**
     * Send 2FA Disabled Alert
     */
    send2FADisabledAlert: async (email, name, details) => {
        const safeName = escapeHtml(name);
        const { device, browser, os, ip, location } = details;
        const safeDevice = escapeHtml(device);
        const safeBrowser = escapeHtml(browser);
        const safeOS = escapeHtml(os);
        const safeIP = escapeHtml(ip);
        const safeLocation = escapeHtml(`${location.city}, ${location.region}, ${location.country}`);
        const safeTime = escapeHtml(new Date().toLocaleString('en-US', { timeZone: location.timezone }));

        const html = getCommonTemplate(
            '⚠️ 2FA Disabled',
            `<p>Hi ${safeName},</p>
             <p>Two-Factor Authentication (2FA) has been <strong>disabled</strong> on your Hostel Ledger account.</p>

             <div style="background-color: #fff3f3; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffcdd2;">
                <p style="margin: 5px 0; font-size: 14px; color: #b71c1c;"><strong>Device:</strong> ${safeDevice} (${safeOS}, ${safeBrowser})</p>
                <p style="margin: 5px 0; font-size: 14px; color: #b71c1c;"><strong>Location:</strong> ${safeLocation}</p>
                <p style="margin: 5px 0; font-size: 14px; color: #b71c1c;"><strong>IP Address:</strong> ${safeIP}</p>
                <p style="margin: 5px 0; font-size: 14px; color: #b71c1c;"><strong>Time:</strong> ${safeTime}</p>
             </div>

             <p>If you did not disable 2FA, your account may be compromised. Please secure your account immediately.</p>`,
            `<a href="https://app.hostelledger.aarx.online/settings" class="button" style="background-color: #d32f2f;">Secure My Account</a>`,
            false // Security alert
        );

        return sendEmailByType('auth', {
            to: email,
            subject: 'Security Alert: 2FA Disabled',
            html
        });
    },

    /**
     * Send Account Suspended Alert
     */
    sendAccountSuspendedEmail: async (email, name, reason) => {
        const safeName = escapeHtml(name);
        const safeReason = escapeHtml(reason);
        
        const content = `
        <p>Hi ${safeName},</p>
        <p>We are writing to inform you that your Hostel Ledger account has been <strong>suspended</strong> due to a violation of our security policies.</p>
        
        <div style="background-color: #fff5f5; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #feb2b2;">
            <p style="margin: 0; color: #c53030; font-weight: 700; text-transform: uppercase; font-size: 13px; letter-spacing: 0.5px;">Reason for Suspension</p>
            <p style="margin: 8px 0 0 0; color: #2d3748; font-size: 15px;">${safeReason}</p>
        </div>

        <p>Our automated fraud detection system flagged your account for suspicious activity. While this suspension is automated for safety, we are happy to review your case if you believe this was a mistake.</p>
        
        <p>To appeal this decision, please contact our support team with your account details.</p>
        `;

        const actionButton = `<a href="mailto:support@aarx.online" class="button" style="background-color: #c53030;">Contact Support</a>`;

        return sendEmailSafe({
            to: email,
            subject: 'Action Required: Your Account has been Suspended',
            html: getCommonTemplate('Account Suspended', content, actionButton, false)
        });
    },

    /**
     * Send Account Reactivated Email
     */
    sendAccountReactivatedEmail: async (email, name) => {
        const safeName = escapeHtml(name);

        const content = `
        <p>Hi ${safeName},</p>
        <p>Great news! Your Hostel Ledger account has been <strong>reactivated</strong> and you now have full access again.</p>

        <div style="background-color: #f0fff4; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #9ae6b4;">
            <p style="margin: 0; color: #276749; font-weight: 700; text-transform: uppercase; font-size: 13px; letter-spacing: 0.5px;">Account Status</p>
            <p style="margin: 8px 0 0 0; color: #2d3748; font-size: 15px;">Active &amp; Fully Restored</p>
        </div>

        <p>If you have any questions or concerns, our support team is always here to help.</p>
        <p>Thank you for your patience.</p>
        `;

        const actionButton = `<a href="https://app.hostelledger.aarx.online" class="button" style="background-color: #276749;">Go to App</a>`;

        return sendEmailSafe({
            to: email,
            subject: 'Your Hostel Ledger Account Has Been Reactivated',
            html: getCommonTemplate('Account Reactivated', content, actionButton, false)
        });
    },

    sendSupportTicketUpdate: async (userEmail, data) => {
        // data = { userName, ticketNumber, status, issueSummary, latestMessage }
        const safeName = escapeHtml(data.userName);
        const safeStatus = escapeHtml(data.status.replace('_', ' '));
        const safeSummary = escapeHtml(data.issueSummary);
        const safeMessage = data.latestMessage ? escapeHtml(data.latestMessage) : '';

        const content = `
        <p>Hi ${safeName},</p>
        <p>Your support ticket status has been updated.</p>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e9ecef;">
          <div style="margin-bottom: 10px;">
            <span style="color: #6c757d; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Ticket Number</span>
            <div style="font-weight: 700; color: #212529; font-size: 18px;">#${data.ticketNumber}</div>
          </div>
          <div style="margin-bottom: 10px;">
            <span style="color: #6c757d; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Current Status</span>
            <div style="font-weight: 700; color: #198754; font-size: 16px; text-transform: uppercase;">${safeStatus}</div>
          </div>
          <div style="margin-bottom: 0;">
            <span style="color: #6c757d; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Issue Summary</span>
            <p style="margin: 5px 0 0 0; color: #495057; font-size: 14px; font-style: italic;">"${safeSummary}"</p>
          </div>
        </div>

        ${safeMessage ? `
        <div style="margin-top: 25px; border-top: 1px solid #eee; padding-top: 20px;">
          <p style="font-weight: 600; color: #212529; margin-bottom: 8px;">Latest Message:</p>
          <div style="background-color: #ffffff; padding: 15px; border-radius: 10px; border: 1px solid #eee; font-size: 14px; line-height: 1.5; color: #444;">
            ${safeMessage}
          </div>
        </div>` : ''}

        <p style="margin-top: 25px;">You can view the full conversation and respond by clicking the button below.</p>
        `;

        const actionButton = `<a href="https://app.hostelledger.aarx.online/support" class="button">View Support Chat</a>`;

        return sendEmailSafe({
            to: userEmail,
            subject: `[Update] Ticket #${data.ticketNumber}: Status changed to ${safeStatus}`,
            html: getCommonTemplate(`Ticket #${data.ticketNumber} Update`, content, actionButton, true)
        });
    },

    /**
     * Send Weekly Transaction Summary
     */
    sendWeeklyReport: async (email, name, summary, currencyCode = 'PKR') => {
        // summary = { totalYouOwe, totalTheyOwe, netAmount, groupSummaries: [...] }
        const symbol = getCurrencySymbol(currencyCode);
        const safeName = escapeHtml(name);
        const netColor = summary.netAmount >= 0 ? '#198754' : '#d32f2f';
        const netLabel = summary.netAmount >= 0 ? 'To Receive' : 'To Pay';
        
        let groupsHtml = '';
        if (summary.groupSummaries && summary.groupSummaries.length > 0) {
            groupsHtml = `
            <div style="margin-top: 25px;">
                <p style="font-weight: 600; color: #212529; margin-bottom: 12px;">Top Groups:</p>
                ${summary.groupSummaries.slice(0, 3).map(g => `
                    <div style="background-color: #f8f9fa; padding: 12px; border-radius: 10px; margin-bottom: 8px; border-left: 4px solid #4a6850;">
                        <span style="font-weight: 600; color: #212529;">${escapeHtml(g.name)}</span>
                        <div style="float: right; font-weight: 700; color: ${g.balance >= 0 ? '#198754' : '#d32f2f'}">
                            ${symbol} ${Math.abs(g.balance).toLocaleString()}
                        </div>
                    </div>
                `).join('')}
            </div>`;
        }

        const content = `
        <p>Hi ${safeName},</p>
        <p>Here is your weekly financial summary from Hostel Ledger.</p>

        <div style="background-color: #ffffff; padding: 25px; border-radius: 16px; margin: 24px 0; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <div style="text-align: center; margin-bottom: 20px;">
                <span style="color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Weekly Net Position</span>
                <div style="font-size: 32px; font-weight: 800; color: ${netColor}; margin-top: 4px;">
                    ${symbol} ${Math.abs(summary.netAmount).toLocaleString()}
                </div>
                <div style="font-size: 14px; color: ${netColor}; font-weight: 600; margin-top: -2px;">${netLabel}</div>
            </div>

            <div style="display: flex; justify-content: space-between; gap: 12px; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 16px;">
                <div style="flex: 1; text-align: center;">
                    <span style="color: #64748b; font-size: 12px; text-transform: uppercase;">You Owe</span>
                    <div style="font-weight: 700; color: #d32f2f; font-size: 18px;">${symbol} ${summary.totalYouOwe.toLocaleString()}</div>
                </div>
                <div style="width: 1px; background-color: #f1f5f9;"></div>
                <div style="flex: 1; text-align: center;">
                    <span style="color: #64748b; font-size: 12px; text-transform: uppercase;">They Owe</span>
                    <div style="font-weight: 700; color: #198754; font-size: 18px;">${symbol} ${summary.totalTheyOwe.toLocaleString()}</div>
                </div>
            </div>

            ${groupsHtml}
        </div>

        <p>Log in to the app to see detailed transaction history or settle up with your friends.</p>
        `;

        const actionButton = `<a href="https://app.hostelledger.aarx.online/dashboard" class="button">Go to Dashboard</a>`;

        return sendEmailSafe({
            to: email,
            subject: `Weekly Report: You have ${symbol} ${Math.abs(summary.netAmount).toLocaleString()} ${netLabel}`,
            html: getCommonTemplate(`Weekly Financial Insight`, content, actionButton, false)
        });
    },

    /**
     * Send Support Email (Generic Transactional)
     */
    sendEmailSafe: async (options) => {
        return sendEmailSafe(options);
    }

};

module.exports = emailService;
