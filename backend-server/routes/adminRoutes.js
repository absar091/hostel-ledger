const express = require('express');
const router = express.Router();
const { verifyAdmin } = require('../middleware/adminAuth');
const adminService = require('../services/adminService');

// All admin routes must be protected
router.use(verifyAdmin);

// Fetch complete user details
router.get('/users/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const userData = await adminService.getUserByEmailOrUid(identifier);
    res.json(userData);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Failed to retrieve user details: ' + error.message });
  }
});

// Update user status
router.post('/users/:uid/status', async (req, res) => {
  try {
    const { uid } = req.params;
    const { status } = req.body;

    if (!['active', 'disabled', 'banned'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status provided.' });
    }

    if (uid === req.user.uid) {
        return res.status(400).json({ error: 'Cannot alter your own status.' });
    }

    const result = await adminService.updateUserStatus(uid, status);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user status.' });
  }
});

// Reset user password directly
router.post('/users/:uid/password', async (req, res) => {
  try {
    const { uid } = req.params;
    const { newPassword } = req.body;

    if (uid === req.user.uid) {
        return res.status(400).json({ error: 'Cannot reset your own password here. Use standard reset flow.' });
    }

    const result = await adminService.updateUserPassword(uid, newPassword);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update password: ' + error.message });
  }
});

// Hard delete a user
router.delete('/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    if (uid === req.user.uid) {
        return res.status(400).json({ error: 'Cannot delete your own account here.' });
    }

    const result = await adminService.deleteUser(uid);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user: ' + error.message });
  }
});

module.exports = router;
