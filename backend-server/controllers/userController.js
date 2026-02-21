const admin = require('../config/firebase');
const cloudinary = require('../config/cloudinary');
const { verifyImageOwnership } = require('../utils/imageSecurity');
const { normalizeMembers } = require('../utils/helpers');

// --- New Endpoint: Get Valid User Details ---
// Apply stricter rate limiting for user search
const getValidUserDetails = async (req, res) => {
  // Add random delay to mitigate timing attacks (500ms - 1500ms)
  const randomDelay = Math.floor(Math.random() * 1000) + 500;
  await new Promise(resolve => setTimeout(resolve, randomDelay));

  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ success: false, error: 'Username is required' });
    }

    // Sanitize username to prevent path traversal (allow only alphanumeric and underscores)
    const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
    const usernameRef = admin.database().ref(`usernames/${cleanUsername}`);
    const snapshot = await usernameRef.get();

    if (!snapshot.exists()) {
      return res.json({ success: true, exists: false });
    }

    const uidData = snapshot.val();
    // Handle both formats: direct UID string or object like { uid: '...' }
    const uid = typeof uidData === 'string' ? uidData : (uidData?.uid || uidData?.userId || null);

    if (!uid || typeof uid !== 'string') {
      console.error('Invalid UID format in usernames lookup:', uidData);
      return res.json({ success: true, exists: false });
    }

    const userRef = admin.database().ref(`users/${uid}`);
    const userSnap = await userRef.get();

    if (!userSnap.exists()) {
      return res.json({ success: true, exists: false });
    }

    const userData = userSnap.val();

    // Safety check for userData
    if (!userData) {
      console.error('User data is null despite snapshot exists');
      return res.json({ success: true, exists: false });
    }

    const paymentDetails = userData.paymentDetails || {};

    // Sanitize return data (public info only)
    const publicProfile = {
      uid,
      username: userData.username || 'Unknown',
      name: userData.name || 'Unknown User',
      photoURL: userData.photoURL || null,
      currency: userData.currency || 'PKR',
      paymentMethods: {
        jazzCash: !!paymentDetails.jazzCash,
        easypaisa: !!paymentDetails.easypaisa,
        bankName: !!paymentDetails.bankName,
        raastId: !!paymentDetails.raastId
      }
    };

    res.json({ success: true, exists: true, user: publicProfile });

  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ success: false, error: 'Failed to search user' });
  }
};

// Delete Image Endpoint (Secure)
const deleteImage = async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({ success: false, error: 'Missing publicId' });
    }

    // Verify that the publicId belongs to the user or is a cover photo of a group they created
    const isOwner = await verifyImageOwnership(admin.database(), req.user.uid, publicId);

    if (!isOwner) {
      console.warn(`⚠️ User ${req.user.uid} attempted to delete image ${publicId} but ownership verification failed.`);
      return res.status(403).json({ success: false, error: 'Unauthorized: You do not have permission to delete this image.' });
    }

    console.log(`🗑️ Deleting image from Cloudinary: ${publicId} by user ${req.user.uid}`);

    // Check if Cloudinary is configured
    if (!cloudinary.config().cloud_name) {
       console.warn('⚠️ Cloudinary not configured, skipping deletion');
       return res.json({ success: true, message: 'Cloudinary not configured (Mock delete)' });
    }

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok' || result.result === 'not found') {
      // 'not found' is also considered success (idempotent)
      console.log(`✅ Image deleted successfully (result: ${result.result}): ${publicId}`);
      res.json({ success: true });
    } else {
      console.error(`❌ Cloudinary delete failed: ${JSON.stringify(result)}`);
      res.status(500).json({ success: false, error: 'Failed to delete image' });
    }

  } catch (error) {
    console.error('❌ Delete image error:', error);
    res.status(500).json({ success: false, error: 'Internal server error: ' + error.message });
  }
};

// Merge Members
const mergeMembers = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { groupId, fromMemberId, toMemberId } = req.body;

    if (!groupId || !fromMemberId || !toMemberId) {
      return res.status(400).json({ success: false, error: 'groupId, fromMemberId, and toMemberId are required' });
    }

    if (fromMemberId === toMemberId) {
      return res.status(400).json({ success: false, error: 'Cannot merge a member into themselves' });
    }

    const db = admin.database();

    // 1. Get group
    const groupSnap = await db.ref(`groups/${groupId}`).get();
    if (!groupSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    const groupData = groupSnap.val();
    const members = normalizeMembers(groupData.members);

    const fromMember = members.find(m => m.id === fromMemberId);
    const toMember = members.find(m => m.id === toMemberId);

    if (!fromMember || !toMember) {
      return res.status(404).json({ success: false, error: 'One or both members not found' });
    }

    // 2. Get all transactions for this group
    const txSnap = await db.ref('transactions').orderByChild('groupId').equalTo(groupId).get();
    const allTransactions = txSnap.exists() ? txSnap.val() : {};

    const updates = {};
    const txToDelete = []; // self-payments to delete

    // 3. Update transactions
    for (const [txId, tx] of Object.entries(allTransactions)) {
      const txUpdates = {};
      let needsUpdate = false;

      // Update paidBy
      if (tx.paidBy === fromMemberId) {
        txUpdates.paidBy = toMemberId;
        txUpdates.paidByName = toMember.name;
        needsUpdate = true;
      }

      // Update from/to for payments
      if (tx.type === 'payment') {
        if (tx.from === fromMemberId) {
          txUpdates.from = toMemberId;
          txUpdates.fromName = toMember.name;
          needsUpdate = true;
        }
        if (tx.to === fromMemberId) {
          txUpdates.to = toMemberId;
          txUpdates.toName = toMember.name;
          needsUpdate = true;
        }

        // Check for self-payment after merge
        const finalFrom = txUpdates.from || tx.from;
        const finalTo = txUpdates.to || tx.to;
        if (finalFrom === finalTo) {
          txToDelete.push(txId);
          continue; // Skip normal update
        }
      }

      // Update participants for expenses
      if (tx.type === 'expense' && Array.isArray(tx.participants)) {
        const fromIdx = tx.participants.findIndex(p => p.id === fromMemberId);
        if (fromIdx !== -1) {
          const newParticipants = [...tx.participants];
          const toIdx = newParticipants.findIndex(p => p.id === toMemberId);

          if (toIdx !== -1) {
            // Both present: merge amounts
            newParticipants[toIdx] = {
              ...newParticipants[toIdx],
              amount: (newParticipants[toIdx].amount || 0) + (newParticipants[fromIdx].amount || 0)
            };
            newParticipants.splice(fromIdx, 1);
          } else {
            // Only from present: rename
            newParticipants[fromIdx] = {
              ...newParticipants[fromIdx],
              id: toMemberId,
              name: toMember.name
            };
          }

          txUpdates.participants = newParticipants;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        for (const [key, value] of Object.entries(txUpdates)) {
          updates[`transactions/${txId}/${key}`] = value;
        }
      }
    }

    // 4. Delete self-payment transactions
    for (const txId of txToDelete) {
      updates[`transactions/${txId}`] = null;
      updates[`userTransactions/${userId}/${txId}`] = null;
    }

    // 5. Remove fromMember from members array
    const updatedMembers = members.filter(m => m.id !== fromMemberId);
    updates[`groups/${groupId}/members`] = updatedMembers;
    updates[`groups/${groupId}/memberCount`] = updatedMembers.length;

    // Update denormalized count
    updates[`userGroups/${userId}/${groupId}/memberCount`] = updatedMembers.length;

    // Remove fromMember's userGroups entry if they had a userId
    if (fromMember.userId) {
      updates[`userGroups/${fromMember.userId}/${groupId}`] = null;
    }

    await db.ref().update(updates);

    const mergedTxCount = Object.keys(updates).filter(k => k.startsWith('transactions/')).length;
    console.log(`✅ Merged member "${fromMember.name}" into "${toMember.name}" in group ${groupId}. Updated ${mergedTxCount} transaction paths, deleted ${txToDelete.length} self-payments.`);

    res.json({
      success: true,
      message: `Merged "${fromMember.name}" into "${toMember.name}" successfully`,
      mergedTransactions: mergedTxCount,
      deletedSelfPayments: txToDelete.length
    });

  } catch (error) {
    console.error('❌ Merge members error:', error);
    res.status(500).json({ success: false, error: 'Failed to merge members: ' + error.message });
  }
};

module.exports = {
  getValidUserDetails,
  deleteImage,
  mergeMembers
};
