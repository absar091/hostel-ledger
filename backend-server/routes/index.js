const express = require('express');
const router = express.Router();
const { generalLimiter } = require('../middleware/rateLimiters');

const authRoutes = require('./authRoutes');
const groupRoutes = require('./groupRoutes');
const transactionRoutes = require('./transactionRoutes');
const invitationRoutes = require('./invitationRoutes');
const notificationRoutes = require('./notificationRoutes');
const userRoutes = require('./userRoutes');
const adminRoutes = require('./adminRoutes');

// Apply general rate limiter to all API routes by default
// This matches the original server.js behavior: app.use('/api', generalLimiter);
router.use(generalLimiter);

router.use('/', authRoutes);
router.use('/', groupRoutes);
router.use('/', transactionRoutes);
router.use('/', invitationRoutes);
router.use('/', notificationRoutes);
router.use('/', userRoutes);
router.use('/', adminRoutes);

module.exports = router;
