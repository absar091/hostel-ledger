const admin = require('../config/firebase');
const emailService = require('../services/emailService');
const { sendNotification } = require('../services/pushService');

// Generic email sending endpoint
const sendEmail = async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;

    // Validate input
    if (!to || !subject || !html) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, subject, html'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address'
      });
    }

    // Send email using emailService
    console.log('📧 Sending email via emailService...');
    const result = await emailService.sendEmailSafe({
      to,
      subject,
      html,
      text: text || ''
    });

    if (result.success) {
      console.log('✅ Email sent successfully:', result.messageId);
      res.json({
        success: true,
        messageId: result.messageId,
        provider: result.provider
      });
    } else {
      console.error('❌ Failed to send email:', result.error);
      res.status(500).json({
        success: false,
        error: 'Failed to send email: ' + result.error
      });
    }

  } catch (error) {
    console.error('❌ Email sending error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email: ' + error.message
    });
  }
};

// Verification email endpoint
const sendVerification = async (req, res) => {
  try {
    const { email, code, name } = req.body;
    if (!email || !code || !name) {
      return res.status(400).json({ success: false, error: 'Missing required fields: email, code, name' });
    }

    await emailService.sendVerification(email, code, name);
    console.log('✅ Verification email sent');
    res.json({ success: true, message: 'Verification email sent successfully' });
  } catch (error) {
    console.error('❌ Verification email error:', error);
    res.status(500).json({ success: false, error: 'Failed to send verification email: ' + error.message });
  }
};

// Password reset email endpoint
const sendPasswordReset = async (req, res) => {
  try {
    const { email, resetLink, name } = req.body;
    if (!email || !resetLink || !name) {
      return res.status(400).json({ success: false, error: 'Missing required fields: email, resetLink, name' });
    }

    await emailService.sendPasswordReset(email, resetLink, name);
    console.log('✅ Password reset email sent');
    res.json({ success: true, message: 'Password reset email sent' });
  } catch (error) {
    console.error('❌ Password reset email error:', error);
    res.status(500).json({ success: false, error: 'Failed to send password reset email: ' + error.message });
  }
};

// Welcome email endpoint
const sendWelcome = async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email || !name) {
      return res.status(400).json({ success: false, error: 'Missing required fields: email, name' });
    }

    await emailService.sendWelcome(email, name);
    console.log('✅ Welcome email sent');
    res.json({ success: true, message: 'Welcome email sent' });
  } catch (error) {
    console.error('❌ Welcome email error:', error);
    res.status(500).json({ success: false, error: 'Failed to send welcome email: ' + error.message });
  }
};

// Transaction alert email endpoint
const sendTransactionAlert = async (req, res) => {
  try {
    const { email, name, transactionType, amount, groupName, date, description } = req.body;

    if (!email || !name || !transactionType || !amount || !groupName || !date || !description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    await emailService.sendTransactionAlert({
      email, name, transactionType, amount, groupName, date, description
    });

    console.log('✅ Transaction alert email sent');
    res.json({ success: true, message: 'Transaction alert email sent' });

  } catch (error) {
    console.error('❌ Transaction alert email error:', error);
    res.status(500).json({ success: false, error: 'Failed to send transaction alert email: ' + error.message });
  }
};

// Send push notification to a specific user using OneSignal REST API
const pushNotify = async (req, res) => {
  try {
    const { userId, title, body, icon, badge, tag, data } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, title, body'
      });
    }

    console.log('🔔 Sending push notification to user via OneSignal:', userId);

    const result = await sendNotification({
      userIds: [userId],
      title,
      body,
      icon,
      badge,
      data
    });

    res.json({
      success: true,
      message: 'Push notification sent successfully',
      recipients: result.recipients,
      id: result.id
    });

  } catch (error) {
    console.error('❌ Push notify error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send push notification: ' + error.message
    });
  }
};

// Send push notification to multiple users using OneSignal REST API
const pushNotifyMultiple = async (req, res) => {
  try {
    const { userIds, title, body, icon, badge, data } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, error: 'userIds must be a non-empty array' });
    }

    if (!title || !body) {
      return res.status(400).json({ success: false, error: 'Missing required fields: title, body' });
    }

    console.log('🔔 Sending push notifications via internal helper');
    const result = await sendNotification({ userIds, title, body, icon, badge, data });

    res.json({
      success: true,
      message: `Sent notifications to ${result.recipients} users`,
      recipients: result.recipients,
      id: result.id
    });

  } catch (error) {
    console.error('❌ Push notify multiple error:', error);
    res.status(500).json({ success: false, error: 'Failed to send push notifications: ' + error.message });
  }
};

// Get subscription status for a user (OneSignal handles this)
const pushSubscription = async (req, res) => {
  try {
    console.log('ℹ️ Push subscription status endpoint called (OneSignal handles this)');

    res.json({
      success: true,
      message: 'OneSignal handles subscription status - check OneSignal dashboard'
    });

  } catch (error) {
    console.error('❌ Get subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get subscription status: ' + error.message
    });
  }
};

// Unsubscribe from push notifications (OneSignal handles this)
const pushUnsubscribe = async (req, res) => {
  try {
    console.log('ℹ️ Push unsubscribe endpoint called (OneSignal handles this)');

    res.json({
      success: true,
      message: 'OneSignal handles unsubscription automatically'
    });

  } catch (error) {
    console.error('❌ Push unsubscribe error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process unsubscription: ' + error.message
    });
  }
};

// Deprecated: Push Subscribe
const pushSubscribe = async (req, res) => {
    try {
        console.log('ℹ️ Push subscribe endpoint called (OneSignal handles subscriptions automatically)');
        res.json({
            success: true,
            message: 'OneSignal handles subscriptions automatically - no action needed'
        });
    } catch (error) {
        console.error('❌ Push subscribe error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process subscription: ' + error.message
        });
    }
}

// Test endpoint to verify push routes are loaded
const pushTest = (req, res) => {
  res.json({
    success: true,
    message: 'Push notification routes are active!',
    availableEndpoints: [
      'POST /api/push-subscribe',
      'POST /api/push-notify',
      'POST /api/push-notify-multiple',
      'GET /api/push-subscription/:userId',
      'DELETE /api/push-unsubscribe/:userId'
    ]
  });
};

module.exports = {
  sendEmail,
  sendVerification,
  sendPasswordReset,
  sendWelcome,
  sendTransactionAlert,
  pushNotify,
  pushNotifyMultiple,
  pushSubscription,
  pushUnsubscribe,
  pushSubscribe,
  pushTest
};
