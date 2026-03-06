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

// --- PHASE 2 ROUTES ---

// System stats
router.get('/system/stats', async (req, res) => {
  try {
    const stats = await adminService.getSystemStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve system stats' });
  }
});

// Toggle Maintenance Mode
router.post('/system/maintenance', async (req, res) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'Enabled must be a boolean.' });
    }
    const result = await adminService.toggleMaintenanceMode(enabled);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle maintenance mode' });
  }
});

// Broadcast Message
router.post('/system/broadcast', async (req, res) => {
  try {
    const { title, message } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required.' });
    }
    const result = await adminService.broadcastMessage(title, message);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send broadcast' });
  }
});

// Reset User Wallet
router.post('/users/:uid/wallet-reset', async (req, res) => {
  try {
    const { uid } = req.params;
    const result = await adminService.resetUserWallet(uid);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset user wallet' });
  }
});

// Get Group Details
router.get('/groups/:groupId', async (req, res) => {
  try {
    const groupId = req.params.groupId.trim();
    const groupData = await adminService.getGroupDetails(groupId);
    res.json(groupData);
  } catch (error) {
    res.status(404).json({ error: 'Group not found' });
  }
});

// Force Delete Group
router.delete('/groups/:groupId', async (req, res) => {
  try {
    const groupId = req.params.groupId.trim();
    const result = await adminService.deleteGroupForce(groupId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

// Force Remove Member from Group
router.delete('/groups/:groupId/members/:uid', async (req, res) => {
  try {
    const groupId = req.params.groupId.trim();
    const uid = req.params.uid.trim();
    const result = await adminService.removeGroupMemberForce(groupId, uid);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove group member' });
  }
});

// --- TICKETS AND REPORTS ---

// Get Reports
router.get('/reports', async (req, res) => {
  try {
    const reports = await adminService.getReports();
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Get Tickets
router.get('/tickets', async (req, res) => {
  try {
    const tickets = await adminService.getTickets();
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// Reply to Ticket
router.post('/tickets/:ticketId/reply', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { adminReply } = req.body;

    if (!adminReply) {
       return res.status(400).json({ error: 'Reply message is required.' });
    }

    const result = await adminService.replyToTicket(ticketId, adminReply);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reply to ticket' });
  }
});
