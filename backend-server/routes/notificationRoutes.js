const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authenticate = require('../middleware/auth');
const { emailLimiter } = require('../middleware/rateLimiters');

// Email endpoints (Email limiter + General limiter)
router.post('/send-email', emailLimiter, authenticate, notificationController.sendEmail);
router.post('/send-verification', emailLimiter, authenticate, notificationController.sendVerification);
router.post('/send-verification-new', emailLimiter, authenticate, notificationController.sendVerification); // Alias
router.post('/send-password-reset', emailLimiter, authenticate, notificationController.sendPasswordReset);
router.post('/send-welcome', emailLimiter, authenticate, notificationController.sendWelcome);
router.post('/send-transaction-alert', emailLimiter, authenticate, notificationController.sendTransactionAlert);

// Push endpoints (General limiter only)
router.post('/push-notify', authenticate, notificationController.pushNotify);
router.post('/push-notify-multiple', authenticate, notificationController.pushNotifyMultiple);
router.get('/push-subscription/:userId', authenticate, notificationController.pushSubscription);
router.delete('/push-unsubscribe/:userId', authenticate, notificationController.pushUnsubscribe);
router.post('/push-subscribe', authenticate, notificationController.pushSubscribe);

// Public endpoints
router.get('/push-test', notificationController.pushTest);

module.exports = router;
