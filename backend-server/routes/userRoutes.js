const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const authenticate = require('../middleware/auth');
const crypto = require('crypto');
// We need an email service to send ticket confirmation
const emailService = require('../services/emailService');

router.use(authenticate);

// Generate a nice-looking 6 character alphanumeric ticket ID
function generateTicketId() {
  return 'TKT-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

// User submitting a support ticket
router.post('/support', async (req, res) => {
  try {
    const { subject, message, email } = req.body;
    const uid = req.user.uid;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required.' });
    }

    const ticketId = generateTicketId();

    // Security Fix: Prevent Open Relay by strictly using the authenticated user's email if possible
    // Allow fallback to a valid user-provided email only if they are unauthenticated or missing email in token
    const safeEmail = req.user?.email || email || 'unknown';

    const ticketData = {
      userId: uid,
      email: safeEmail,
      subject,
      message,
      status: 'open',
      priority: 'medium',
      createdAt: admin.database.ServerValue.TIMESTAMP,
      updatedAt: admin.database.ServerValue.TIMESTAMP
    };

    await admin.database().ref(`supportTickets/${uid}/${ticketId}`).set(ticketData);

    // Send confirmation email asynchronously (fire and forget to not block UI)
    if (emailService && emailService.isConfigured()) {
       emailService.sendEmail(
         ticketData.email,
         `Support Ticket Received: ${ticketId}`,
         `Hello,\n\nWe have received your support request:\n\nSubject: ${subject}\n\nOur team will review this shortly.\n\nTicket ID: ${ticketId}`
       ).catch(err => console.error("Failed to send ticket email", err));
    }

    res.json({ success: true, ticketId, message: 'Ticket submitted successfully.' });
  } catch (error) {
    console.error('Error submitting ticket:', error);
    res.status(500).json({ error: 'Failed to submit ticket.' });
  }
});

// User reporting another user or group
router.post('/report', async (req, res) => {
  try {
    const { targetId, targetType, reason, details } = req.body;
    const uid = req.user.uid;

    if (!['user', 'group'].includes(targetType) || !targetId || !reason) {
      console.log('Report Validation Failed:', { targetId, targetType, reason, details }); return res.status(400).json({ error: 'Invalid report data.' });
    }

    const reportRef = admin.database().ref('reports').push();

    await reportRef.set({
      reportedBy: uid,
      reporterName: req.user.displayName || 'Anonymous',
      targetId,
      targetType,
      reason,
      details: details || '',
      status: 'pending',
      createdAt: admin.database.ServerValue.TIMESTAMP
    });

    res.json({ success: true, message: 'Report submitted successfully.' });
  } catch (error) {
    console.error('Error submitting report:', error);
    res.status(500).json({ error: 'Failed to submit report.' });
  }
});

module.exports = router;
