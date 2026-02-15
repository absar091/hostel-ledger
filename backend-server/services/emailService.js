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
        // Increased timeouts for reliability
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
const sendEmailSafe = async (mailOptions) => {
    const primary = getPrimaryTransporter();

    // Enforce strict 'from' address to match auth user to prevent blocking
    const finalMailOptions = {
        ...mailOptions,
        from: `Hostel Ledger <${SMTP_CONFIG.primary.auth.user}>`
    };

    try {
        console.log(`📨 Attempting to send email to ${finalMailOptions.to} via Primary...`);
        const info = await primary.sendMail(finalMailOptions);
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

            const info = await fallback.sendMail(fallbackOptions);
            console.log(`✅ Email sent via Fallback: ${info.messageId}`);
            return { success: true, message: 'Sent via Fallback', provider: 'fallback', messageId: info.messageId };
        } catch (fallbackError) {
            console.error(`❌ All email transports failed for ${finalMailOptions.to}`);
            console.error(`   Primary Error: ${primaryError.message}`);
            console.error(`   Fallback Error: ${fallbackError.message}`);
            return { success: false, error: fallbackError.message };
        }
    }
};

// ============================================================================
// TEMPLATE HELPERS (Moved from server.js for cohesion)
// ============================================================================

const getCommonTemplate = (title, content, actionButton = '', footerText = '') => {
    const logoUrl = 'https://app.hostelledger.aarx.online/hostel-ledger-logo.webp';
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { margin: 0; padding: 0; background-color: #f4f6f5; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.05); }
        .header { text-align: center; margin-bottom: 32px; }
        .logo { max-height: 48px; margin-bottom: 16px; }
        .title { color: #4a6850; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
        .content { color: #444; font-size: 16px; line-height: 1.6; }
        .button { display: inline-block; background-color: #4a6850; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; }
        .footer { margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; text-align: center; font-size: 12px; color: #888; }
        .footer a { color: #4a6850; text-decoration: none; margin: 0 5px; }
      </style>
    </head>
    <body style="background-color: #f4f6f5; padding: 20px 0;">
      <div class="container">
        <div class="header">
          <img src="${logoUrl}" alt="Hostel Ledger" class="logo" onerror="this.style.display='none'">
          <h1 class="title">${title}</h1>
        </div>
        <div class="content">
          ${content}
          ${actionButton}
        </div>
        <div class="footer">
          <p>${footerText}</p>
          <p>
            <a href="https://hostel-ledger.aarx.online/terms">Terms</a> • 
            <a href="https://hostel-ledger.aarx.online/privacy">Privacy</a> •
            <a href="https://app.hostelledger.aarx.online/settings">Manage Preferences</a>
          </p>
          <p style="font-size: 10px; opacity: 0.7; margin-top: 10px;">
            This email was sent to you because you are a user of Hostel Ledger.
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
            'Verify Your Email',
            `
        <p>Hi <strong>${name || 'there'}</strong>,</p>
        <p>Welcome to Hostel Ledger! Please verify your email address to continue.</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4a6850; text-align: center; margin: 30px 0;">
          ${otp}
        </p>
        <p>This code will expire in 10 minutes.</p>
      `
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
            'You are invited!',
            `
        <p><strong>${inviterName}</strong> has invited you to join the group <strong>"${groupName}"</strong> on Hostel Ledger.</p>
        <p>Click the button below to accept the invitation and start tracking expenses together.</p>
      `,
            `<div style="text-align: center; margin-top: 20px;"><a href="${inviteLink}" style="background-color: #4a6850; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Accept Invitation</a></div>`
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
            'Welcome to Hostel Ledger! 🎉',
            `
        <p>Hi <strong>${name}</strong>,</p>
        <p>Thanks for joining Hostel Ledger! We're excited to help you split bills and manage expenses stress-free.</p>
        <p>Create a group, invite your friends, and never worry about "who owes who" again.</p>
      `,
            `<div style="text-align: center; margin-top: 20px;"><a href="https://app.hostelledger.aarx.online" style="background-color: #4a6850; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Go to Dashboard</a></div>`
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
            'Reset Your Password',
            `
        <p>Hi <strong>${name || 'there'}</strong>,</p>
        <p>We received a request to reset your password. If this was you, click the button below:</p>
        <p>If you didn't ask for this, you can safely ignore this email.</p>
      `,
            `<div style="text-align: center; margin-top: 20px;"><a href="${resetLink}" style="background-color: #4a6850; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Reset Password</a></div>`
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
            `Transaction Alert: ${data.transactionType}`,
            `
        <p>Hi <strong>${data.name}</strong>,</p>
        <p>A new transaction has been recorded on your Hostel Ledger account.</p>
        <div style="background-color: #f8fcf9; border: 1px solid #e0e9e2; border-radius: 12px; padding: 20px; margin: 20px 0;">
             <p style="margin: 5px 0;"><strong>Type:</strong> ${data.transactionType}</p>
             <p style="margin: 5px 0;"><strong>Amount:</strong> Rs ${data.amount}</p>
             <p style="margin: 5px 0;"><strong>Group:</strong> ${data.groupName}</p>
             <p style="margin: 5px 0;"><strong>Date:</strong> ${data.date}</p>
             <p style="margin: 5px 0;"><strong>Description:</strong> ${data.description}</p>
        </div>
      `,
            `<div style="text-align: center; margin-top: 20px;"><a href="https://app.hostelledger.aarx.online" style="background-color: #4a6850; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">View Details</a></div>`
        );
        return sendEmailSafe({
            to: data.email,
            subject: `Transaction Alert - ${data.transactionType} in ${data.groupName}`,
            html
        });
    },

    /**
     * Send Expense Notification
     */
    sendExpenseNotification: async (recipient, data) => {
        // data = { payerName, amount, title, splitAmount, date, groupName, note }
        const html = getCommonTemplate(
            `New Expense in ${data.groupName}`,
            `
        <div style="background-color: #f8fcf9; border: 1px solid #e0e9e2; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #666;">Amount</span>
            <span style="font-weight: bold; color: #1a1a1a;">Rs ${data.amount}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #666;">Paid by</span>
            <span style="font-weight: bold; color: #1a1a1a;">${data.payerName}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #666;">Your Share</span>
            <span style="font-weight: bold; color: #d32f2f;">Rs ${data.splitAmount}</span>
          </div>
           <div style="display: flex; justify-content: space-between;">
            <span style="color: #666;">Date</span>
            <span style="font-weight: bold; color: #1a1a1a;">${data.date}</span>
          </div>
        </div>
        ${data.note ? `<p style="font-style: italic; color: #666; text-align: center;">"${data.note}"</p>` : ''}
        <p>A new expense <strong>"${data.title}"</strong> was added.</p>
      `,
            `<div style="text-align: center;"><a href="https://app.hostelledger.aarx.online/groups/${data.groupId}" class="button" style="color: #ffffff;">View Details</a></div>`
        );

        return sendEmailSafe({
            to: recipient.email,
            subject: `New Expense: ${data.title} (Rs ${data.amount})`,
            html
        });
    }
};

module.exports = emailService;
