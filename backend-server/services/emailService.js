const nodemailer = require('nodemailer');

// Environment variables should be checked at startup
const SMTP_CONFIG = {
    primary: {
        host: process.env.SMTP_HOST || 'smtp.zoho.in',
        port: parseInt(process.env.SMTP_PORT) || 465,
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: (process.env.SMTP_PASS || '').replace(/\s+/g, '') // Trim spaces automatically
        },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 30000
    },
    fallback: {
        host: process.env.FALLBACK_SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.FALLBACK_SMTP_PORT) || 465,
        secure: true,
        auth: {
            user: process.env.FALLBACK_SMTP_USER,
            pass: (process.env.FALLBACK_SMTP_PASS || '').replace(/\s+/g, '')
        }
    }
};

// Singleton transporters
let primaryTransporter = null;
let fallbackTransporter = null;

const createTransporter = (config) => {
    return nodemailer.createTransport(config);
};

const getPrimaryTransporter = () => {
    if (!primaryTransporter) {
        console.log('📧 Initializing Primary Transporter (Zoho)...');
        primaryTransporter = createTransporter(SMTP_CONFIG.primary);
    }
    return primaryTransporter;
};

const getFallbackTransporter = () => {
    if (!fallbackTransporter) {
        console.log('📧 Initializing Fallback Transporter (Gmail)...');
        fallbackTransporter = createTransporter(SMTP_CONFIG.fallback);
    }
    return fallbackTransporter;
};

/**
 * Sends an email with automatic fallback and retry logic.
 * @param {Object} mailOptions - Nodemailer mail options
 * @returns {Promise<{success: boolean, message: string, provider: string}>}
 */
const sendWithTimeout = async (transporter, options, timeoutMs = 15000) => {
    return Promise.race([
        transporter.sendMail(options),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Email sending timed out after ${timeoutMs}ms`)), timeoutMs)
        )
    ]);
};

const sendEmailSafe = async (mailOptions) => {
    const primary = getPrimaryTransporter();

    // Enforce strict 'from' address to match auth user to prevent blocking
    const finalMailOptions = {
        ...mailOptions,
        from: `Hostel Ledger <${SMTP_CONFIG.primary.auth.user}>`
    };

    try {
        console.log(`📨 Attempting to send email to ${finalMailOptions.to} via Primary...`);
        const info = await sendWithTimeout(primary, finalMailOptions, 15000); // 15s timeout
        console.log(`✅ Email sent via Primary: ${info.messageId}`);
        return { success: true, message: 'Sent via Primary', provider: 'primary', messageId: info.messageId };
    } catch (primaryError) {
        console.warn(`⚠️ Primary Transport Failed: ${primaryError.message}`);

        // Attempt Fallback
        try {
            console.log(`📨 Attempting Fallback (Gmail) to ${finalMailOptions.to}...`);
            const fallback = getFallbackTransporter();

            // Update 'from' for fallback if needed (Gmail usually overwrites it anyway)
            const fallbackOptions = {
                ...finalMailOptions,
                from: `Hostel Ledger <${SMTP_CONFIG.fallback.auth.user}>` // Match fallback auth
            };

            const info = await sendWithTimeout(fallback, fallbackOptions, 15000); // 15s timeout
            console.log(`✅ Email sent via Fallback: ${info.messageId}`);
            return { success: true, message: 'Sent via Fallback', provider: 'fallback', messageId: info.messageId };
        } catch (fallbackError) {
            console.error(`❌ All email transports failed for ${finalMailOptions.to}`);
            console.error(`   PrimaryKey Error: ${primaryError.message}`);
            console.error(`   Fallback Error: ${fallbackError.message}`);
            return { success: false, error: fallbackError.message };
        }
    }
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
        ${showUnsubscribe ? `• <a href="https://app.hostelledger.aarx.online/settings" style="color: #666;">Unsubscribe</a>` : ''}
      </p>
      <p>Copyright© ${new Date().getFullYear()} Hostel Ledger. All rights reserved.
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
    /**
     * Verify SMTP credentials on startup (non-blocking)
     */
    verifyConnection: async () => {
        try {
            const primary = getPrimaryTransporter();
            await primary.verify();
            console.log('✅ SMTP Connection Verified (Zoho)');
            return true;
        } catch (err) {
            console.warn('⚠️ Primary SMTP Connection Failed:', err.message);
            // Try fallback
            try {
                const fallback = getFallbackTransporter();
                await fallback.verify();
                console.log('✅ Fallback SMTP Connection Verified (Gmail)');
                return true;
            } catch (fbErr) {
                console.error('❌ ALL SMTP Connections Failed. Emails will not send.');
                return false;
            }
        }
    },

    /**
     * Send Verification Code
     */
    sendVerification: async (email, otp, name) => {
        const html = getCommonTemplate(
            'Confirm your email',
            `
        <p>Hi ${name ? `<span class="highlight">${name}</span>` : 'there'},</p>
        <p>Welcome to Hostel Ledger! Use the code below to verify your email address. It helps us keep your account secure.</p>
        <div style="text-align: center; margin: 40px 0;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 4px; color: #111;">${otp}</span>
        </div>
        <p>This code expires in 10 minutes.</p>
      `,
            '',
            false // No unsubscribe for critical auth emails
        );
        return sendEmailSafe({
            to: email,
            subject: 'Verify your email - Hostel Ledger',
            html
        });
    },

    /**
     * Send Invitation Email
     */
    sendInvitation: async (email, inviterName, groupName, inviteLink) => {
        const html = getCommonTemplate(
            'You’ve been invited!',
            `
        <p><span class="highlight">${inviterName}</span> invited you to join the group <strong>"${groupName}"</strong> on Hostel Ledger.</p>
        <p>Join the group to start tracking expenses, splitting bills, and settling up directly from your phone.</p>
      `,
            `<a href="${inviteLink}" class="button">Accept Invitation</a>`,
            true // Allow unsubscribe
        );
        return sendEmailSafe({
            to: email,
            subject: `${inviterName} invited you to join "${groupName}"`,
            html
        });
    },

    /**
     * Send Welcome Email
     */
    sendWelcome: async (email, name) => {
        const html = getCommonTemplate(
            'Welcome to Hostel Ledger',
            `
        <p>Hi ${name ? `<span class="highlight">${name}</span>` : 'there'},</p>
        <p>Thanks for creating an account! You’re all set to start managing shared expenses without the stress.</p>
        <p>Create a group, invite your friends, and never worry about details again.</p>
      `,
            `<a href="https://app.hostelledger.aarx.online" class="button">Go to Dashboard</a>`,
            false // Essential account email
        );
        return sendEmailSafe({
            to: email,
            subject: 'Welcome to Hostel Ledger!',
            html
        });
    },

    /**
     * Send Password Reset
     */
    sendPasswordReset: async (email, resetLink, name) => {
        const html = getCommonTemplate(
            'Reset Password',
            `
        <p>Hi ${name ? `<span class="highlight">${name}</span>` : 'there'},</p>
        <p>We received a request to reset your password. Tap the button below to choose a new one:</p>
      `,
            `<a href="${resetLink}" class="button">Reset Password</a>`,
            false // Critical security email
        );
        return sendEmailSafe({
            to: email,
            subject: 'Reset Password - Hostel Ledger',
            html
        });
    },

    /**
     * Send Transaction Alert
     */
    sendTransactionAlert: async (data) => {
        // data = { email, name, transactionType, amount, groupName, date, description }
        const html = getCommonTemplate(
            `Transaction Alert`,
            `
        <p>Hi ${data.name},</p>
        <p>A new <strong>${data.transactionType}</strong> was recorded in <strong>${data.groupName}</strong>.</p>
        
        <div class="amount-large">Rs ${data.amount}</div>

        <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
          <div class="detail-row">
            <span class="detail-label">Type</span>
            <span class="detail-value" style="text-transform: capitalize;">${data.transactionType}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Group</span>
            <span class="detail-value">${data.groupName}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Date</span>
            <span class="detail-value">${data.date}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Note</span>
            <span class="detail-value">${data.description || '-'}</span>
          </div>
        </div>
      `,
            `<a href="https://app.hostelledger.aarx.online" class="button">View Details</a>`,
            true // Allow unsubscribe
        );
        return sendEmailSafe({
            to: data.email,
            subject: `${data.transactionType}: Rs ${data.amount} in ${data.groupName}`,
            html
        });
    },

    /**
     * Send Expense Notification
     */
    sendExpenseNotification: async (email, data) => {
        // data = { payerName, amount, title, splitAmount, date, groupName, note }
        const html = getCommonTemplate(
            `New Expense Added`,
            `
        <div style="text-align: center; margin-bottom: 20px;">
          <p style="margin: 0; color: #888;">Total Amount</p>
          <div class="amount-large">Rs ${data.amount}</div>
          <p style="margin: 5px 0 0 0; color: #555;">Paid by <strong>${data.payerName}</strong></p>
        </div>

        <div style="border-top: 1px solid #eee; margin: 20px 0;"></div>

        <div class="detail-row">
            <span class="detail-label">For</span>
            <span class="detail-value">"${data.title}"</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Your Share</span>
            <span class="detail-value" style="color: #d32f2f;">Rs ${data.splitAmount}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Group</span>
            <span class="detail-value">${data.groupName}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Date</span>
            <span class="detail-value">${data.date}</span>
        </div>
        ${data.note ? `
        <div class="detail-row">
            <span class="detail-label">Note</span>
            <span class="detail-value">"${data.note}"</span>
        </div>` : ''}
      `,
            `<a href="https://app.hostelledger.aarx.online/groups/${data.groupId}" class="button">View Expense</a>`,
            true // Allow unsubscribe
        );

        return sendEmailSafe({
            to: email,
            subject: `New Expense: ${data.title} (Rs ${data.amount})`,
            html
        });
    }
};

module.exports = emailService;
