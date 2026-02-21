const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticate = require('../middleware/auth');
const { userSearchLimiter } = require('../middleware/rateLimiters');

router.post('/get-valid-user-details', userSearchLimiter, authenticate, userController.getValidUserDetails);
router.post('/delete-image', authenticate, userController.deleteImage);
router.post('/merge-members', authenticate, userController.mergeMembers);

module.exports = router;
