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

      if (!userSnapshot.exists()) {
        throw new Error('User found in Auth but missing database record.');
      }

      const userData = userSnapshot.val();

      const aggregatedData = {
        uid: uid,
        email: userRecord.email,
        name: userData.name || userData.username || 'Unknown',
        emailVerified: userRecord.emailVerified,
        phone: userData.phone || 'N/A',
        accountStatus: userData.accountStatus || 'active',
        role: userData.role || 'user',
        createdAt: userRecord.metadata.creationTime,
        lastLogin: userRecord.metadata.lastSignInTime,
        groupsJoined: userData.groups ? Object.keys(userData.groups).length : 0,
        walletBalance: userData.walletBalance || 0,
        is2FAEnabled: userData.is2FAEnabled ? 'Yes' : 'No',
        totalReportsAgainstUser: 0, // Placeholder
        totalPosts: 0 // Placeholder
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
      await admin.database().ref(`users/${uid}`).update({ accountStatus: newStatus });
      console.log(`User ${uid} status updated to ${newStatus}`);

      return { success: true, message: `User status updated to ${newStatus}` };
    } catch (error) {
      console.error(`Error updating user status ${uid}:`, error);
      throw error;
    }
  }
}

module.exports = new AdminService();
