const admin = require('firebase-admin');

class AdminService {
  async getUserByEmailOrUid(identifier) {
    try {
      let userRecord;
      let uid;

      if (identifier.includes('@')) {
        userRecord = await admin.auth().getUserByEmail(identifier);
        uid = userRecord.uid;
      } else {
        uid = identifier;
        try {
          userRecord = await admin.auth().getUser(uid);
        } catch(error) {
           throw new Error('User not found by ID.');
        }
      }

      const userSnapshot = await admin.database().ref(`users/${uid}`).once('value');

      let userData = {};
      if (userSnapshot.exists()) {
        userData = userSnapshot.val();
      }

      // Combine Auth and Database data, ensuring we get EVERYTHING from the database
      const aggregatedData = {
        _auth: {
          uid: uid,
          email: userRecord.email,
          emailVerified: userRecord.emailVerified,
          displayName: userRecord.displayName,
          phoneNumber: userRecord.phoneNumber,
          disabled: userRecord.disabled,
          creationTime: userRecord.metadata.creationTime,
          lastSignInTime: userRecord.metadata.lastSignInTime,
          providerData: userRecord.providerData.map(p => p.providerId)
        },
        _database: userData // Dump the entire database record here for the frontend to parse
      };

      return aggregatedData;
    } catch (error) {
      console.error(`Error fetching user ${identifier}:`, error);
      throw error;
    }
  }

  async updateUserStatus(uid, newStatus, reason = 'Violation of safety guidelines') {
    if (!['active', 'disabled', 'banned'].includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    try {
      const disableAuth = newStatus === 'disabled' || newStatus === 'banned';
      await admin.auth().updateUser(uid, { disabled: disableAuth });

      // If banned, revoke all tokens to stop active sessions immediately
      if (newStatus === 'banned') {
        await admin.auth().revokeRefreshTokens(uid);
      }

      // Update database status
      await admin.database().ref(`users/${uid}`).update({
        accountStatus: newStatus,
        statusUpdatedAt: admin.database.ServerValue.TIMESTAMP,
        suspensionReason: newStatus === 'banned' ? reason : null
      });

      // Send email based on status
      try {
        const userRecord = await admin.auth().getUser(uid);
        const emailService = require('./emailService');
        
        console.log(`📧 Attempting to send status email for user ${uid}. Status: ${newStatus}, Email: ${userRecord.email}`);
        
        if (newStatus === 'banned') {
          console.log(`🚫 Sending account suspended email to ${userRecord.email}`);
          await emailService.sendAccountSuspendedEmail(userRecord.email, userRecord.displayName || 'User', reason);
        } else if (newStatus === 'active') {
          console.log(`✅ Sending account reactivation email to ${userRecord.email}`);
          await emailService.sendAccountReactivatedEmail(userRecord.email, userRecord.displayName || 'User');
        }
      } catch (emailError) {
        console.error(`❌ Failed to send status email to ${uid}:`, emailError);
      }

      return { success: true, message: `User status updated to ${newStatus}` };
    } catch (error) {
      console.error(`Error updating user status ${uid}:`, error);
      throw error;
    }
  }

  async updateUserPassword(uid, newPassword) {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    try {
      await admin.auth().updateUser(uid, { password: newPassword });

      // Optionally invalidate sessions by updating tokens
      await admin.auth().revokeRefreshTokens(uid);

      return { success: true, message: 'User password successfully updated and sessions revoked.' };
    } catch (error) {
      console.error(`Error updating password for ${uid}:`, error);
      throw error;
    }
  }

  async deleteUser(uid) {
    try {
      // 1. Delete from Firebase Auth
      await admin.auth().deleteUser(uid);

      // 2. Delete from Realtime Database
      // Note: In a production app, you might also want to delete user data from Firestore/Storage
      // or implement a "soft delete" instead of a hard delete to preserve financial history.
      // But the requirement here is a hard delete.
      await admin.database().ref(`users/${uid}`).remove();

      return { success: true, message: 'User completely deleted from Auth and Database.' };
    } catch (error) {
      console.error(`Error deleting user ${uid}:`, error);
      throw error;
    }
  }


  async getSystemStats() {
    try {
      // 1. Total Auth Users
      // Auth doesn't have a simple .count() method, so we list users or we rely on database counts
      // For large scale, listing all users is slow. We'll rely on the database 'users' node size.
      const usersSnapshot = await admin.database().ref('users').once('value');
      const totalUsers = usersSnapshot.numChildren();

      const groupsSnapshot = await admin.database().ref('groups').once('value');
      const totalGroups = groupsSnapshot.numChildren();

      // Additional simple aggregations could go here (e.g. counting transactions if feasible)
      // Note: Full database scans aren't scalable, but this is a starting point for the basic dashboard.

      const settingsSnapshot = await admin.database().ref('settings/system').once('value');
      const settings = settingsSnapshot.exists() ? settingsSnapshot.val() : { maintenanceMode: false };

      return {
        totalUsers,
        totalGroups,
        maintenanceMode: settings.maintenanceMode || false
      };
    } catch (error) {
      console.error('Error fetching system stats:', error);
      throw error;
    }
  }

  async toggleMaintenanceMode(enabled) {
    try {
      await admin.database().ref('settings/system').update({
        maintenanceMode: !!enabled
      });
      return { success: true, maintenanceMode: !!enabled };
    } catch (error) {
      console.error('Error toggling maintenance mode:', error);
      throw error;
    }
  }

  async broadcastMessage(title, message) {
    try {
      // Internal Database Notification Method (so it shows in their in-app Activity/Notifications)
      const usersSnapshot = await admin.database().ref('users').once('value');
      const updates = {};
      const timestamp = admin.database.ServerValue.TIMESTAMP;
      const notificationId = `broadcast_${Date.now()}`;

      usersSnapshot.forEach(child => {
        const uid = child.key;
        updates[`notifications/${uid}/${notificationId}`] = {
          type: 'admin_broadcast',
          title: title,
          message: message,
          createdAt: timestamp,
          read: false
        };
      });

      updates['settings/broadcast'] = {
        title,
        message,
        timestamp: timestamp
      };

      if (Object.keys(updates).length > 0) {
        await admin.database().ref().update(updates);
      }

      // If OneSignal is used for actual push notifications, you would trigger that here too.
      // But for Phase 2 basic UI, an in-app database notification is sufficient and robust.

      return { success: true, message: `Broadcast sent to ${usersSnapshot.numChildren()} users.` };
    } catch (error) {
      console.error('Error broadcasting message:', error);
      throw error;
    }
  }

  // --- ADVANCED USER CONTROLS ---

  // --- ADVANCED GROUP MANAGEMENT ---

  async getGroupDetails(groupId) {
    try {
      const groupSnapshot = await admin.database().ref(`groups/${groupId}`).once('value');
      if (!groupSnapshot.exists()) {
        // Fallback for personal spaces if they are only stored in userGroups
        if (groupId.startsWith('personal_')) {
           const uid = groupId.split('personal_')[1];
           const userGroupSnapshot = await admin.database().ref(`userGroups/${uid}/${groupId}`).once('value');
           if (userGroupSnapshot.exists()) {
              return userGroupSnapshot.val();
           }
        }
        throw new Error('Group not found');
      }
      return groupSnapshot.val();
    } catch (error) {
      console.error(`Error fetching group ${groupId}:`, error);
      throw error;
    }
  }

  async deleteGroupForce(groupId) {
    try {
      const groupSnapshot = await admin.database().ref(`groups/${groupId}`).once('value');
      if (!groupSnapshot.exists()) throw new Error('Group not found');

      const groupData = groupSnapshot.val();
      const members = groupData.members || {};

      // 1. Remove group reference from all members' user profiles
      const updates = {};
      for (const uid of Object.keys(members)) {
        updates[`users/${uid}/groups/${groupId}`] = null;
        updates[`userGroups/${uid}/${groupId}`] = null;
      }

      // 2. Delete the group transactions
      updates[`transactions/${groupId}`] = null;

      // 3. Delete the group itself
      updates[`groups/${groupId}`] = null;

      await admin.database().ref().update(updates);

      return { success: true, message: `Group ${groupId} and all related data forcefully deleted.` };
    } catch (error) {
      console.error(`Error deleting group ${groupId}:`, error);
      throw error;
    }
  }

  async removeGroupMemberForce(groupId, uid) {
    try {
      const updates = {};
      updates[`groups/${groupId}/members/${uid}`] = null;
      updates[`users/${uid}/groups/${groupId}`] = null;
      updates[`userGroups/${uid}/${groupId}`] = null;

      await admin.database().ref().update(updates);
      return { success: true, message: `User ${uid} forcefully removed from group ${groupId}.` };
    } catch (error) {
       console.error(`Error removing user ${uid} from group ${groupId}:`, error);
       throw error;
    }
  }

  async getUserGroups(uid) {
    try {
      const userGroupsRef = admin.database().ref(`userGroups/${uid}`);
      const snapshot = await userGroupsRef.once('value');
      
      if (!snapshot.exists()) return [];

      const groupIds = Object.keys(snapshot.val());
      const groups = [];

      for (const groupId of groupIds) {
        const groupSnap = await admin.database().ref(`groups/${groupId}`).once('value');
        if (groupSnap.exists()) {
          const data = groupSnap.val();
          groups.push({
            id: groupId,
            name: data.name,
            emoji: data.emoji,
            memberCount: Object.keys(data.members || {}).length,
            createdAt: data.createdAt,
            isPersonal: data.isPersonal || false
          });
        }
      }
      return groups;
    } catch (error) {
      console.error(`Error fetching user groups for ${uid}:`, error);
      throw error;
    }
  }

  // --- REPORTING SYSTEM (Admin Facing) ---

  async getReports() {
    try {
      const reportsSnapshot = await admin.database().ref('reports').once('value');
      const reports = [];
      if (reportsSnapshot.exists()) {
        reportsSnapshot.forEach(child => {
          reports.push({ id: child.key, ...child.val() });
        });
      }
      // Sort newest first
      return reports.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (error) {
      console.error('Error fetching reports:', error);
      throw error;
    }
  }

  // --- SUPPORT TICKETS (Admin Facing) ---

  async getTickets() {
    try {
      const ticketsSnapshot = await admin.database().ref('supportTickets').once('value');
      const tickets = [];
      if (ticketsSnapshot.exists()) {
        const ticketsData = ticketsSnapshot.val();
        for (const userId in ticketsData) {
          for (const ticketId in ticketsData[userId]) {
            tickets.push({
              id: ticketId,
              userId: userId,
              ...ticketsData[userId][ticketId]
            });
          }
        }
      }
      return tickets.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    } catch (error) {
      console.error('Error fetching tickets:', error);
      throw error;
    }
  }

  async listUsers() {
    try {
      // 1. Fetch all users from Auth (limited to 1000 for safety, but usually sufficient for this app)
      const listUsersResult = await admin.auth().listUsers(1000);
      const authUsers = listUsersResult.users;

      // 2. Fetch all users from Database
      const usersSnapshot = await admin.database().ref('users').once('value');
      const dbUsers = usersSnapshot.val() || {};

      // 3. Merge data
      const mergedUsers = authUsers.map(user => {
        const dbData = dbUsers[user.uid] || {};
        return {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || dbData.displayName || 'No Name',
          disabled: user.disabled,
          role: dbData.role || 'user',
          accountStatus: dbData.accountStatus || (user.disabled ? 'disabled' : 'active'),

          createdAt: user.metadata.creationTime,
          lastSignIn: user.metadata.lastSignInTime
        };
      });

      return mergedUsers;
    } catch (error) {
      console.error('Error listing users:', error);
      throw error;
    }
  }

  async listGroups() {
    try {
      const groupsSnapshot = await admin.database().ref('groups').once('value');
      const groupsData = groupsSnapshot.val() || {};
      
      const groups = [];
      for (const groupId in groupsData) {
        const group = groupsData[groupId];
        groups.push({
          id: groupId,
          name: group.name,
          emoji: group.emoji,
          createdAt: group.createdAt,
          memberCount: Object.keys(group.members || {}).length,
          members: group.members // Return for detailed view
        });
      }
      return groups.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (error) {
      console.error('Error listing groups:', error);
      throw error;
    }
  }

  async replyToTicket(userId, ticketId, adminReply) {
    try {
      const ticketRef = admin.database().ref(`supportTickets/${userId}/${ticketId}`);
      const ticketSnapshot = await ticketRef.once('value');
      if (!ticketSnapshot.exists()) throw new Error('Ticket not found');

      const ticketData = ticketSnapshot.val();

      // Add to messages structure
      const messageRef = ticketRef.child('messages').push();
      await messageRef.set({
        text: adminReply,
        sender: 'admin',
        timestamp: admin.database.ServerValue.TIMESTAMP,
        read: false
      });

      await ticketRef.update({
        status: 'replied',
        updatedAt: admin.database.ServerValue.TIMESTAMP
      });

      // Notify the user in-app
      const notificationId = `ticket_reply_${ticketId}_${Date.now()}`;
      await admin.database().ref(`notifications/${userId}/${notificationId}`).set({
        type: 'support_reply',
        title: `Reply to Ticket ${ticketData.ticketNumber || '#' + ticketId.substring(0, 6)}`,
        message: adminReply,
        createdAt: admin.database.ServerValue.TIMESTAMP,
        read: false
      });
      return { success: true };
    } catch (error) {
      console.error('Error replying to ticket:', error);
      throw error;
    }
  }

  async updateTicketStatus(userId, ticketId, newStatus) {
    try {
      const ticketRef = admin.database().ref(`supportTickets/${userId}/${ticketId}`);
      const ticketSnapshot = await ticketRef.once('value');
      if (!ticketSnapshot.exists()) throw new Error('Ticket not found');

      await ticketRef.update({
        status: newStatus,
        updatedAt: admin.database.ServerValue.TIMESTAMP
      });

      return { success: true, message: `Ticket status updated to ${newStatus}` };
    } catch (error) {
      console.error('Error updating ticket status:', error);
      throw error;
    }
  }
}
module.exports = new AdminService();
