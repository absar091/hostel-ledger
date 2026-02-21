const admin = require('../config/firebase');
const { normalizeMembers } = require('../utils/helpers');
const { sendNotification } = require('../services/pushService');
const emailService = require('../services/emailService');

const sendInvitation = async (req, res) => {
  try {
    const { groupId, inviteeUsername } = req.body;
    const senderUid = req.user.uid;

    if (!groupId || !inviteeUsername) {
      return res.status(400).json({ success: false, error: 'Group ID and username are required' });
    }

    const db = admin.database();

    // 1. Resolve invitee username to UID
    // Using the 'usernames' index we created in Phase 1
    const normalizedUsername = inviteeUsername.toLowerCase().replace(/[^a-z0-9._]/g, '');
    const usernameSnap = await db.ref(`usernames/${normalizedUsername}`).get();

    if (!usernameSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Username not found' });
    }

    const inviteeUid = usernameSnap.val().uid;
    const inviteeUserSnap = await db.ref(`users/${inviteeUid}`).get();
    const inviteeEmail = inviteeUserSnap.exists() ? (inviteeUserSnap.val().email || '').toLowerCase() : '';

    if (inviteeUid === senderUid) {
      return res.status(400).json({ success: false, error: 'You cannot invite yourself' });
    }

    // 2. Verify Group Exists and Sender is Member
    const groupRef = db.ref(`groups/${groupId}`);
    const groupSnap = await groupRef.get();

    if (!groupSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    const group = groupSnap.val();
    // Ideally real members only. We check if sender is in the group.
    const isSenderMember = normalizeMembers(group.members).some(m => m.userId === senderUid);

    if (!isSenderMember) {
      return res.status(403).json({ success: false, error: 'You must be a member of the group to invite others' });
    }

    // 3. Check if Invitee is already in group (by UID)
    const currentMembers = normalizeMembers(group.members);
    const isInviteeAlreadyMember = currentMembers.some(m => m.userId === inviteeUid);

    // Check if invitee is already in group as Manual Member (by Email)
    let existingManualMemberIndex = -1;
    if (inviteeEmail && !isInviteeAlreadyMember) {
      existingManualMemberIndex = currentMembers.findIndex(m => m.email && m.email.toLowerCase() === inviteeEmail && m.type === 'manual');
    }

    if (isInviteeAlreadyMember) {
      return res.status(400).json({ success: false, error: 'User is already a member of this group' });
    }

    // 4. Create Invitation
    const invitationId = db.ref('invitations').push().key;
    const now = new Date().toISOString();

    // Get sender info for the notification
    const senderSnap = await db.ref(`users/${senderUid}`).get();
    const senderName = senderSnap.exists() ? senderSnap.val().name : "A friend";
    const senderUsername = senderSnap.exists() ? (senderSnap.val().username || "") : "";

    const invitationData = {
      id: invitationId,
      invitationId, // Add alias
      groupId,
      groupName: group.name,
      senderName, // New: Support legacy frontend
      invitedBy: senderName, // New: Simple string for frontend
      senderId: senderUid, // Simple field
      receiverId: inviteeUid, // Simple field for filtering
      receiverName: inviteeUsername || normalizedUsername, // CRITICAL: Fix for "Invited User" display
      invitedByDetail: { // Preserve the object in a subfield if needed
        uid: senderUid,
        name: senderName,
        username: senderUsername
      },
      invitee: {
        uid: inviteeUid,
        username: normalizedUsername
      },
      status: 'pending',
      createdAt: now,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };

    const updates = {};
    updates[`invitations/${invitationId}`] = invitationData;
    updates[`userInvitations/${inviteeUid}/${invitationId}`] = {
      invitationId,
      groupId,
      groupName: group.name,
      senderName,
      invitedBy: senderName,
      createdAt: now,
      status: 'pending'
    };

    // SYNC: Add or Update member in group list
    if (existingManualMemberIndex !== -1) {
      // MERGE: Update existing manual member
      // We modify the copy in the currentMembers array and save the whole array back
      // This is safe because normalizeMembers preserves structure mostly, but writing it back as array standardizes it.
      const memberToUpdate = { ...currentMembers[existingManualMemberIndex] };
      memberToUpdate.userId = inviteeUid;
      memberToUpdate.isPending = true; // Mark as pending acceptance
      memberToUpdate.invitedAt = now;
      memberToUpdate.username = normalizedUsername; // Add username if missing

      // Update the array
      currentMembers[existingManualMemberIndex] = memberToUpdate;

      updates[`groups/${groupId}/members`] = currentMembers;
      console.log(`🔄 Merging invitation with existing manual member (Index: ${existingManualMemberIndex})`);
    } else {
      // ADD NEW: Add pending member to group list for visibility to owner
      // Use type: 'invited' so they are excluded from expense splitting until they accept
      const newMember = {
        id: `member_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name: inviteeUsername || normalizedUsername,
        userId: inviteeUid,
        username: normalizedUsername,
        type: 'invited', // Changed from 'manual' to 'invited'
        isPending: true,
        invitedAt: now
      };

      const updatedMembers = [...currentMembers, newMember];
      updates[`groups/${groupId}/members`] = updatedMembers;
      // Also update index count for owner
      updates[`userGroups/${senderUid}/${groupId}/memberCount`] = updatedMembers.length;

      // GRANT READ ACCESS: Add to userGroups of the invitee
      updates[`userGroups/${inviteeUid}/${groupId}`] = {
        name: group.name,
        emoji: group.emoji,
        coverPhoto: group.coverPhoto || null,
        memberCount: updatedMembers.length,
        createdBy: group.createdBy || '',
        createdAt: group.createdAt || now,
        status: 'invited', // Access Key
        invitedAt: now
      };

      console.log(`➕ Adding new pending member (type: invited) to group list`);
    }

    await db.ref().update(updates);

    // 5. Send Notification (Awaited for Vercel/Serverless)
    try {
      const notificationPromises = [];

      // Push Notification
      notificationPromises.push(
        sendNotification({
          userIds: [inviteeUid],
          title: "New Group Invitation! 🏠",
          body: `${senderName} invited you to join "${group.name}"`,
          data: { type: 'invitation', invitationId, groupId }
        })
          .catch(err => console.error("Invitation push failed:", err.message))
      );

      // Email Invitation
      notificationPromises.push((async () => {
        try {
          const userRecord = await admin.auth().getUser(inviteeUid);
          if (userRecord.email) {
            const joinLink = `https://app.hostelledger.aarx.online/join/${groupId}`;
            await emailService.sendInvitation(userRecord.email, senderName, group.name, joinLink);
          }
        } catch (e) { console.error("Invitations email inner failed:", e.message); }
      })());

      const globalTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Invite timeout')), 8000));
      await Promise.race([Promise.allSettled(notificationPromises), globalTimeout]).catch(e => console.warn("Invitation notifications timed out"));
    } catch (notifErr) {
      console.error("Invitation notifications failed overall:", notifErr.message);
    }

    res.json({ success: true, message: 'Invitation sent successfully' });

  } catch (error) {
    console.error('❌ Send invitation error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

const respondInvitation = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { invitationId, accept } = req.body;

    if (!invitationId) {
      return res.status(400).json({ success: false, error: 'Invitation ID is required' });
    }

    // Get the invitation from userInvitations
    const userInvRef = admin.database().ref(`userInvitations/${userId}/${invitationId}`);
    const invSnap = await userInvRef.get();

    if (!invSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Invitation not found' });
    }

    const invitation = invSnap.val();

    // Verify this invitation belongs to this user
    if (invitation.receiverId !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    // Check if already processed
    if (invitation.status !== 'pending') {
      return res.json({ success: true, message: 'Invitation already processed', status: invitation.status });
    }

    const newStatus = accept ? 'accepted' : 'declined';
    const now = new Date().toISOString();

    if (accept) {
      // === ACCEPT: Add/Update user in group ===
      const groupId = invitation.groupId;

      // Get user data
      const userSnap = await admin.database().ref(`users/${userId}`).get();
      const userData = userSnap.val() || {};

      // Get group members
      const groupRef = admin.database().ref(`groups/${groupId}`);
      const groupSnap = await groupRef.get();
      const groupData = groupSnap.val() || {};
      let members = groupData.members || [];

      const isArray = Array.isArray(members);
      const membersArray = normalizeMembers(members);

      // Find existing member entry for this user
      // PRIORITY 1: Match by userId (Already joined/linked)
      let memberIndex = membersArray.findIndex(m => m.userId === userId);

      // PRIORITY 2: Match by Email (Manual member invited by email)
      if (memberIndex === -1 && userData.email) {
        memberIndex = membersArray.findIndex(m =>
          (m.type === 'manual' || m.type === 'invited') &&
          m.email &&
          m.email.toLowerCase() === userData.email.toLowerCase()
        );
        if (memberIndex !== -1) console.log(`🔗 Found matching member by EMAIL for merge: ${userData.email}`);
      }

      // PRIORITY 3: Match by Username (Manual member invited by username)
      if (memberIndex === -1 && userData.username) {
        memberIndex = membersArray.findIndex(m =>
          (m.type === 'manual' || m.type === 'invited') &&
          m.username &&
          m.username.toLowerCase() === userData.username.toLowerCase()
        );
        if (memberIndex !== -1) console.log(`🔗 Found matching member by USERNAME for merge: ${userData.username}`);
      }

      const memberEntry = {
        id: memberIndex !== -1 ? membersArray[memberIndex].id : `member_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name: userData.name || (memberIndex !== -1 ? membersArray[memberIndex].name : 'Member'),
        isRegistered: true,
        type: 'registered',
        userId: userId,
        joinedAt: now,
        isPending: false,
        photoURL: userData.photoURL || null
      };

      if (memberIndex !== -1) {
        // Update existing entry
        if (isArray) {
          members[memberIndex] = memberEntry;
        } else {
          // It's an object, we need to find the key
          const memberKey = Object.keys(members).find(key => members[key].userId === userId || members[key].id === membersArray[memberIndex].id);
          if (memberKey) {
            members[memberKey] = memberEntry;
          } else {
            // Fallback: use userId as key
            members[userId] = memberEntry;
          }
        }
      } else {
        // Add new entry
        if (isArray) {
          members.push(memberEntry);
        } else {
          members[userId] = memberEntry;
        }
      }

      // Update group members and memberCount
      const updates = {};
      updates[`groups/${groupId}/members`] = members;

      // Calculate member count
      const finalMemberCount = isArray ? members.length : Object.keys(members).length;
      updates[`groups/${groupId}/memberCount`] = finalMemberCount;

      // Add to userGroups (REQUIRED for Firebase rules to grant access)
      updates[`userGroups/${userId}/${groupId}`] = {
        name: groupData.name,
        emoji: groupData.emoji || '👥',
        coverPhoto: groupData.coverPhoto || null,
        memberCount: finalMemberCount,
        createdBy: groupData.createdBy || '',
        createdAt: groupData.createdAt || now,
        joinedAt: now
      };

      // Also add to users/{uid}/groups for backwards compatibility
      updates[`users/${userId}/groups/${groupId}`] = {
        name: groupData.name,
        emoji: groupData.emoji || '👥',
        coverPhoto: groupData.coverPhoto || null,
        memberCount: finalMemberCount,
        role: 'member',
        joinedAt: now
      };

      await admin.database().ref().update(updates);
      console.log(`✅ User ${userId} joined group ${groupId} (Updated ${memberIndex !== -1 ? 'existing' : 'new'} member)`);
    }

    // Update invitation status in both locations
    await admin.database().ref(`invitations/${invitationId}/status`).set(newStatus);
    await admin.database().ref(`invitations/${invitationId}/respondedAt`).set(now);
    await admin.database().ref(`userInvitations/${userId}/${invitationId}/status`).set(newStatus);
    await admin.database().ref(`userInvitations/${userId}/${invitationId}/respondedAt`).set(now);

    res.json({
      success: true,
      message: accept ? 'Successfully joined the group!' : 'Invitation declined',
      status: newStatus,
      groupId: accept ? invitation.groupId : null
    });

  } catch (error) {
    console.error('Error responding to invitation:', error);
    res.status(500).json({ success: false, error: 'Failed to respond to invitation' });
  }
};

const claimEmailInvite = async (req, res) => {
  try {
    const userId = req.user.uid;
    const userEmail = req.user.email;
    const { groupId } = req.body;

    if (!groupId) {
      return res.status(400).json({ success: false, error: 'Group ID is required' });
    }

    // Get the group
    const groupSnap = await admin.database().ref(`groups/${groupId}`).get();
    if (!groupSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    const groupData = groupSnap.val();
    const members = groupData.members || {};

    // Find a manual member with matching email
    let matchedMemberId = null;
    let matchedMember = null;

    for (const [memberId, member] of Object.entries(members)) {
      if (member.email && member.email.toLowerCase() === userEmail.toLowerCase() && member.type === 'manual') {
        matchedMemberId = memberId;
        matchedMember = member;
        break;
      }
    }

    if (!matchedMemberId) {
      return res.json({ success: false, error: 'No pending email invite found for this group' });
    }

    // Get user data
    const userSnap = await admin.database().ref(`users/${userId}`).get();
    const userData = userSnap.val() || {};

    // Update the member entry to link it to this user
    await admin.database().ref(`groups/${groupId}/members/${matchedMemberId}`).update({
      userId: userId,
      isRegistered: true,
      type: 'registered',
      name: userData.name || matchedMember.name,
      claimedAt: new Date().toISOString()
    });

    // Add to userGroups (REQUIRED for Firebase rules to grant access)
    const now = new Date().toISOString();
    await admin.database().ref(`userGroups/${userId}/${groupId}`).set({
      name: groupData.name,
      emoji: groupData.emoji || '👥',
      coverPhoto: groupData.coverPhoto || null,
      memberCount: groupData.memberCount || 0,
      createdBy: groupData.createdBy || '',
      createdAt: groupData.createdAt || now,
      joinedAt: now
    });

    // Also add to users/{uid}/groups for backwards compatibility
    await admin.database().ref(`users/${userId}/groups/${groupId}`).set({
      name: groupData.name,
      emoji: groupData.emoji || '👥',
      coverPhoto: groupData.coverPhoto || null,
      memberCount: groupData.memberCount || 0,
      role: 'member',
      joinedAt: now
    });

    console.log(`✅ User ${userId} claimed email invite for group ${groupId}`);

    res.json({
      success: true,
      message: 'Successfully joined the group!',
      groupId,
      groupName: groupData.name
    });

  } catch (error) {
    console.error('Error claiming email invite:', error);
    res.status(500).json({ success: false, error: 'Failed to claim invite' });
  }
};

const sendExternalInvitation = async (req, res) => {
  try {
    const { email, groupId } = req.body;
    const senderUid = req.user.uid;

    if (!email || !groupId) {
      return res.status(400).json({ success: false, error: 'Email and Group ID are required' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email address' });
    }

    const db = admin.database();

    // 1. Verify Sender and Group
    const groupRef = db.ref(`groups/${groupId}`);
    const groupSnap = await groupRef.get();

    if (!groupSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    const group = groupSnap.val();

    // Check sender membership (must be a real member)
    const isSenderMember = normalizeMembers(group.members).some(m => m.userId === senderUid);

    if (!isSenderMember) {
      return res.status(403).json({ success: false, error: 'You must be a member of the group to invite others' });
    }

    // 2. Get Sender Info
    const senderSnap = await db.ref(`users/${senderUid}`).get();
    const senderName = senderSnap.exists() ? senderSnap.val().name : "A friend";

    // 2b. Add Manual Member to Group (so they can be added to expenses immediately)
    const currentMembers = normalizeMembers(group.members);
    const existingMember = currentMembers.find(m => m.email && m.email.toLowerCase() === email.toLowerCase());

    if (!existingMember) {
      const newMember = {
        id: `member_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name: email.split('@')[0],
        email: email,
        type: 'manual', // Correctly set as manual so they can be split with
        isPending: true,
        invitedAt: new Date().toISOString()
      };

      const updatedMembers = [...currentMembers, newMember];

      const updates = {};
      updates[`groups/${groupId}/members`] = updatedMembers;
      updates[`userGroups/${senderUid}/${groupId}/memberCount`] = updatedMembers.length;

      await db.ref().update(updates);
      console.log(`➕ Added manual member for email invite: ${email}`);
    } else {
      console.log(`ℹ️ Member with email ${email} already exists, skipping add.`);
    }

    // 3. Send Email
    // Determine if this is a new user or existing user
    let isNewUser = true;
    try {
      await admin.auth().getUserByEmail(email);
      isNewUser = false; // User exists!
    } catch (e) {
      // User not found, so they are new
      isNewUser = true;
    }

    const joinLink = `https://app.hostelledger.aarx.online/join/${groupId}?email=${encodeURIComponent(email)}`;

    await emailService.sendInvitation(
      email,
      senderName,
      group.name,
      joinLink,
      isNewUser
    );
    console.log('📧 External invitation email sent');

    res.json({ success: true, message: 'Invitation email sent successfully' });

  } catch (error) {
    console.error('❌ Send external invitation error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

module.exports = {
  sendInvitation,
  respondInvitation,
  claimEmailInvite,
  sendExternalInvitation
};
