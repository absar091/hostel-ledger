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

  async updateUserStatus(uid, newStatus) {
    if (!['active', 'disabled', 'banned'].includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    try {
      const disableAuth = newStatus === 'disabled' || newStatus === 'banned';
      await admin.auth().updateUser(uid, { disabled: disableAuth });

      // Update database status
      await admin.database().ref(`users/${uid}`).update({
        accountStatus: newStatus,
        statusUpdatedAt: admin.database.ServerValue.TIMESTAMP
      });

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

  async resetUserWallet(uid) {
    try {
      await admin.database().ref(`users/${uid}`).update({ walletBalance: 0 });
      return { success: true, message: `Wallet balance for ${uid} reset to 0.` };
    } catch (error) {
      console.error(`Error resetting wallet for ${uid}:`, error);
      throw error;
    }
  }

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
      const ticketsSnapshot = await admin.database().ref('support_tickets').once('value');
      const tickets = [];
      if (ticketsSnapshot.exists()) {
        ticketsSnapshot.forEach(child => {
          tickets.push({ id: child.key, ...child.val() });
        });
      }
      return tickets.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (error) {
      console.error('Error fetching tickets:', error);
      throw error;
    }
  }

  async replyToTicket(ticketId, adminReply) {
    try {
      const ticketRef = admin.database().ref(`support_tickets/${ticketId}`);
      const ticketSnapshot = await ticketRef.once('value');
      if (!ticketSnapshot.exists()) throw new Error('Ticket not found');

      const ticketData = ticketSnapshot.val();

      await ticketRef.update({
        status: 'replied',
        adminReply: adminReply,
        repliedAt: admin.database.ServerValue.TIMESTAMP
      });

      // Notify the user in-app
      if (ticketData.uid) {
        const notificationId = `ticket_reply_${ticketId}_${Date.now()}`;
        await admin.database().ref(`notifications/${ticketData.uid}/${notificationId}`).set({
          type: 'support_reply',
          title: `Reply to Ticket #${ticketId}`,
          message: adminReply,
          createdAt: admin.database.ServerValue.TIMESTAMP,
          read: false
        });
      }

      // If you want to also email the reply to the user, you can inject emailService here.
      // But they will see it via the in-app notification and dashboard.

      return { success: true, message: 'Replied to ticket successfully.' };
    } catch (error) {
      console.error('Error replying to ticket:', error);
      throw error;
    }
  }
}
module.exports = new AdminService();
