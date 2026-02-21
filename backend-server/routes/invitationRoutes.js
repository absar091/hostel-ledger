const express = require('express');
const router = express.Router();
const invitationController = require('../controllers/invitationController');
const authenticate = require('../middleware/auth');
const { strictEmailLimiter } = require('../middleware/rateLimiters');

// General limiter applied globally in index.js
router.post('/send-invitation', authenticate, invitationController.sendInvitation);
router.post('/respond-invitation', authenticate, invitationController.respondInvitation);
router.post('/claim-email-invite', authenticate, invitationController.claimEmailInvite);
router.post('/send-external-invitation', strictEmailLimiter, authenticate, invitationController.sendExternalInvitation);

module.exports = router;
