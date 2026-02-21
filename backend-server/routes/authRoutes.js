const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { strictEmailLimiter, strictEmailCheckLimiter } = require('../middleware/rateLimiters');

// General limiter applied globally in index.js
router.post('/verification/request', strictEmailLimiter, authController.requestVerification);
router.post('/verification/verify', authController.verifyCode);
router.post('/verification/check', authController.checkVerification);
router.post('/check-email-exists', strictEmailCheckLimiter, authController.checkEmailExists);

module.exports = router;
