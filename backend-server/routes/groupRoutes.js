const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const authenticate = require('../middleware/auth');
const { createLimiter } = require('../middleware/rateLimiters');

router.post('/create-group', createLimiter, authenticate, groupController.createGroup);
router.post('/update-group', authenticate, groupController.updateGroup);
router.post('/delete-group', authenticate, groupController.deleteGroup);
router.post('/remove-member', authenticate, groupController.removeMember);

module.exports = router;
