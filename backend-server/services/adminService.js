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
}

module.exports = new AdminService();
