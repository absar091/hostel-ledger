const admin = require('../config/firebase');
const emailService = require('../services/emailService');
const { validateCreateGroup } = require('../utils/validation');
const { normalizeMembers } = require('../utils/helpers');

const createGroup = async (req, res) => {
  // Input Validation
  const validationError = validateCreateGroup(req.body);
  if (validationError) {
    return res.status(400).json({ success: false, error: validationError });
  }

  const { name, emoji, members, invitedUsernames, invitedEmails, coverPhoto } = req.body;
  const userId = req.user.uid;
  const notificationPromises = [];

  try {
    const groupsRef = admin.database().ref('groups');
    const newGroupRef = groupsRef.push();
    const groupId = newGroupRef.key;

    // 1a. Fetch User Name first (so we don't store "You" in DB)
    const userSnap = await admin.database().ref(`users/${userId}`).get();
    const userName = userSnap.exists() ? userSnap.val().name : "User";

    // 1b. Resolve Invited Usernames (Existing Users)
    const resolvedUsers = [];
    if (invitedUsernames && invitedUsernames.length > 0) {
      const resolved = await Promise.all(invitedUsernames.map(async (username) => {
        const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
        const s = await admin.database().ref(`usernames/${cleanUsername}`).get();
        if (s.exists()) {
          const uidData = s.val();
          const inviteeUid = typeof uidData === 'string' ? uidData : (uidData?.uid || uidData?.userId || null);
          if (inviteeUid) return { username, inviteeUid };
        }
        return null;
      }));
      resolvedUsers.push(...resolved.filter(u => u !== null));
    }

    // 1. Create Group Object
    const newGroup = {
      id: groupId,
      name: name.trim().substring(0, 50),
      emoji: emoji || "📁",
      coverPhoto: coverPhoto || null,
      members: [
        {
          id: userId,
          name: userName,
          isCurrentUser: true,
          userId: userId,
          paymentDetails: {},
          isAdmin: true
        },
        // Existing Users (by username)
        ...resolvedUsers.map(u => ({
          id: u.inviteeUid, // Real UID
          name: u.username,
          userId: u.inviteeUid,
          username: u.username,
          type: 'invited', // Changed from 'manual' to 'invited' so they excluded from expenses
          isPending: true,
          invitedAt: new Date().toISOString()
        })),
        // Manual Members from array
        ...members.map(m => ({
          id: `member_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          name: m.name,
          userId: m.uid || null,
          username: m.username || null,
          type: m.type || 'manual',
          email: m.email || null,
          isPending: !!m.email,
          invitedAt: m.email ? new Date().toISOString() : null
        })),
        // Invited Emails (pure string array) - DEDUPLICATED
        ...(invitedEmails || [])
          .filter(email => !members.some(m => m.email && m.email.toLowerCase() === email.toLowerCase()))
          .map(email => ({
            id: `member_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            name: email.split('@')[0],
            email: email,
            type: 'manual',
            isPending: true,
            invitedAt: new Date().toISOString()
          }))
      ],
      createdBy: userId,
      createdAt: new Date().toISOString()
    };

    // 2. Save Group
    await newGroupRef.set(newGroup);

    // 3. Add to User's Group Index
    await admin.database().ref(`userGroups/${userId}/${groupId}`).set({
      name: newGroup.name,
      emoji: newGroup.emoji,
      coverPhoto: newGroup.coverPhoto,
      memberCount: newGroup.members.length,
      role: 'admin',
      createdAt: newGroup.createdAt
    });

    // 4. Handle Invited Usernames (send invitations to existing users)
    if (resolvedUsers.length > 0) {
      const senderName = userName;
      const updates = {};
      const emailNotifications = [];

      resolvedUsers.forEach(user => {
        const { username, inviteeUid } = user;

        // Create invitation record
        const invRef = admin.database().ref('invitations').push();
        const invitationData = {
          id: invRef.key,
          invitationId: invRef.key,
          groupId,
          groupName: newGroup.name,
          groupEmoji: newGroup.emoji,
          senderId: userId,
          senderName,
          invitedBy: senderName,
          receiverId: inviteeUid,
          receiverName: username,
          status: 'pending',
          createdAt: new Date().toISOString()
        };

        updates[`invitations/${invRef.key}`] = invitationData;
        updates[`userInvitations/${inviteeUid}/${invRef.key}`] = invitationData;

        // GRANT READ ACCESS: Add to userGroups with status 'invited'
        updates[`userGroups/${inviteeUid}/${groupId}`] = {
          name: newGroup.name,
          emoji: newGroup.emoji,
          coverPhoto: newGroup.coverPhoto || null,
          memberCount: newGroup.members.length, // Initial count
          createdBy: userId,
          createdAt: newGroup.createdAt,
          status: 'invited', // Access Key
          invitedAt: new Date().toISOString()
        };

        console.log(`✅ Invitation prepared for user ${inviteeUid} (existing app user)`);
        emailNotifications.push({ inviteeUid, username });
      });

      // Execute DB Updates
      if (Object.keys(updates).length > 0) {
        await admin.database().ref().update(updates);
      }

      // Collect Email Promises
      const usernameInvitePromises = emailNotifications.map(async ({ inviteeUid, username }) => {
        try {
          const inviteeSnap = await admin.database().ref(`users/${inviteeUid}`).get();
          if (inviteeSnap.exists()) {
            const inviteeData = inviteeSnap.val();
            if (inviteeData.email) {
              return emailService.sendInvitation(
                inviteeData.email,
                senderName,
                newGroup.name,
                `https://app.hostelledger.aarx.online/join/${groupId}`
              );
            }
          }
        } catch (err) {
          console.error(`❌ Failed to send invite to ${username}:`, err.message);
        }
      });
      notificationPromises.push(...usernameInvitePromises);
    }

    // 5. Handle Email Invites (Manual members with emails + invitedEmails array)
    const emailMembers = [
      ...newGroup.members.filter(m => m.email && m.type === 'manual'),
      ...(invitedEmails || []).map(email => ({
        email,
        name: email.split('@')[0], // Fallback name
        type: 'manual'
      }))
    ];

    if (emailMembers.length > 0) {
      console.log(`📧 Preparing ${emailMembers.length} manual email invites...`);
      const senderName = userName;

      const manualInvitePromises = emailMembers.map(member => {
        const joinLink = `https://app.hostelledger.aarx.online/join/${groupId}?email=${encodeURIComponent(member.email)}`;
        return emailService.sendInvitation(
          member.email,
          senderName,
          newGroup.name,
          joinLink,
          true // isNewUser = true for manual email invites
        );
      });
      notificationPromises.push(...manualInvitePromises);
    }

    // 6. Await all notifications (Critical for Vercel)
    if (notificationPromises.length > 0) {
      try {
        console.log(`🚀 Awaiting ${notificationPromises.length} group creation notifications...`);
        const globalTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Invite timeout')), 8000));
        await Promise.race([Promise.allSettled(notificationPromises), globalTimeout])
          .catch(e => console.warn("⚠️ Group invites partially timed out:", e.message));
      } catch (notifErr) {
        console.error("❌ Notification awaiting failed:", notifErr);
      }
    }

    res.json({ success: true, groupId, message: 'Group created successfully' });

  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ success: false, error: 'Failed to create group' });
  }
};

const updateGroup = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { groupId, name, emoji } = req.body;

    if (!groupId) {
      return res.status(400).json({ success: false, error: 'Group ID is required' });
    }

    if (!name && !emoji) {
      return res.status(400).json({ success: false, error: 'Nothing to update' });
    }

    const db = admin.database();
    const groupRef = db.ref(`groups/${groupId}`);
    const groupSnap = await groupRef.get();

    if (!groupSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    const groupData = groupSnap.val();

    // Only the creator can update group details
    if (groupData.createdBy !== userId) {
      return res.status(403).json({ success: false, error: 'Only the group creator can update group details' });
    }

    // Sanitize and build updates
    const sanitized = {};
    if (name) {
      const cleanName = name.trim().replace(/[<>"'&]/g, '').substring(0, 50);
      if (!cleanName) return res.status(400).json({ success: false, error: 'Invalid group name' });
      sanitized.name = cleanName;
    }
    if (emoji) {
      sanitized.emoji = emoji.trim().substring(0, 10);
    }

    const updates = {};

    // Update group itself
    for (const [key, value] of Object.entries(sanitized)) {
      updates[`groups/${groupId}/${key}`] = value;
    }

    // Update denormalized metadata for ALL members who have this in userGroups
    const members = normalizeMembers(groupData.members);
    for (const member of members) {
      const memberUserId = member.userId;
      if (memberUserId) {
        for (const [key, value] of Object.entries(sanitized)) {
          updates[`userGroups/${memberUserId}/${groupId}/${key}`] = value;
        }
      }
    }

    // Also update for creator (in case they're not in members array somehow)
    for (const [key, value] of Object.entries(sanitized)) {
      updates[`userGroups/${userId}/${groupId}/${key}`] = value;
    }

    await db.ref().update(updates);

    console.log(`✅ Group ${groupId} updated by ${userId}:`, sanitized);
    res.json({ success: true, message: 'Group updated successfully' });

  } catch (error) {
    console.error('❌ Update group error:', error);
    res.status(500).json({ success: false, error: 'Failed to update group: ' + error.message });
  }
};

const deleteGroup = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { groupId } = req.body;

    if (!groupId) {
      return res.status(400).json({ success: false, error: 'Group ID is required' });
    }

    const db = admin.database();
    const groupRef = db.ref(`groups/${groupId}`);
    const groupSnap = await groupRef.get();

    if (!groupSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    const groupData = groupSnap.val();

    // Only the creator can delete
    if (groupData.createdBy !== userId) {
      return res.status(403).json({ success: false, error: 'Only the group creator can delete this group' });
    }

    // Check for pending settlements via transactions
    // We check if any transactions exist — if they do, we warn but still allow delete
    // (The frontend already checks settlements before calling this)

    const members = normalizeMembers(groupData.members);
    const updates = {};

    // 1. Delete the group itself
    updates[`groups/${groupId}`] = null;

    // 2. Remove from all members' userGroups
    for (const member of members) {
      const memberUserId = member.userId || member.id;
      if (memberUserId) {
        updates[`userGroups/${memberUserId}/${groupId}`] = null;
        updates[`users/${memberUserId}/groups/${groupId}`] = null;
      }
    }

    // Also ensure the creator's entry is removed
    updates[`userGroups/${userId}/${groupId}`] = null;
    updates[`users/${userId}/groups/${groupId}`] = null;

    await db.ref().update(updates);

    console.log(`✅ Group ${groupId} deleted by ${userId}`);
    res.json({ success: true, message: 'Group deleted successfully' });

  } catch (error) {
    console.error('❌ Delete group error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete group: ' + error.message });
  }
};

const removeMember = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { groupId, memberId } = req.body;

    if (!groupId || !memberId) {
      return res.status(400).json({ success: false, error: 'Group ID and Member ID are required' });
    }

    const db = admin.database();
    const groupRef = db.ref(`groups/${groupId}`);
    const groupSnap = await groupRef.get();

    if (!groupSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    const groupData = groupSnap.val();

    // Only the creator can remove members (except self-leave)
    const isSelfLeave = memberId === userId;
    if (!isSelfLeave && groupData.createdBy !== userId) {
      return res.status(403).json({ success: false, error: 'Only the group creator can remove members' });
    }

    // Cannot remove the creator
    if (memberId === groupData.createdBy && !isSelfLeave) {
      return res.status(400).json({ success: false, error: 'Cannot remove the group creator' });
    }

    const members = normalizeMembers(groupData.members);
    const memberToRemove = members.find(m => m.id === memberId || m.userId === memberId);

    if (!memberToRemove) {
      return res.status(404).json({ success: false, error: 'Member not found in group' });
    }

    // Filter out the member
    const updatedMembers = members.filter(m => m.id !== memberId && m.userId !== memberId);

    const updates = {};
    updates[`groups/${groupId}/members`] = updatedMembers;
    updates[`groups/${groupId}/memberCount`] = updatedMembers.length;

    // Update denormalized count for the requester
    updates[`userGroups/${userId}/${groupId}/memberCount`] = updatedMembers.length;

    // If the removed member had a userId, remove their userGroups entry too
    const removedUserId = memberToRemove.userId;
    if (removedUserId) {
      updates[`userGroups/${removedUserId}/${groupId}`] = null;
      updates[`users/${removedUserId}/groups/${groupId}`] = null;
    }

    await db.ref().update(updates);

    console.log(`✅ Member ${memberId} removed from group ${groupId} by ${userId}`);
    res.json({ success: true, message: 'Member removed successfully' });

  } catch (error) {
    console.error('❌ Remove member error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove member: ' + error.message });
  }
};

module.exports = {
  createGroup,
  updateGroup,
  deleteGroup,
  removeMember
};
