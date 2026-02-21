const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminAuth = require('../middleware/adminAuth');

// General limiter applied globally in index.js
router.post('/cleanup-temp-members', adminAuth, adminController.cleanupTempMembers);
router.post('/cleanup-unverified-users', adminAuth, adminController.cleanupUnverifiedUsers);

module.exports = router;
