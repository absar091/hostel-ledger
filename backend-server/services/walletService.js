// --- Helper: Sync Wallet Balance to Groups ---
const syncWalletBalanceToGroups = async (db, userId, balance, isEnabled) => {
  try {
    const userGroupsRef = db.ref(`userGroups/${userId}`);
    const snapshot = await userGroupsRef.get();

    if (!snapshot.exists()) return;

    const groupIds = Object.keys(snapshot.val());
    const updates = {};

    // We need to find the member entry for this user in each group
    // This requires fetching each group, which is expensive (N+1)
    // Optimization: Run fetches in parallel
    const groupFetchPromises = groupIds.map(gid => db.ref(`groups/${gid}`).get());
    const groupSnapshots = await Promise.all(groupFetchPromises);

    groupSnapshots.forEach(groupSnap => {
      if (!groupSnap.exists()) return;
      const groupData = groupSnap.val();
      const groupId = groupSnap.key;
      const members = groupData.members;

      if (!members) return;

      if (Array.isArray(members)) {
        const memberIndex = members.findIndex(m => m.userId === userId || m.id === userId);
        if (memberIndex !== -1) {
          updates[`groups/${groupId}/members/${memberIndex}/walletBalance`] = isEnabled ? balance : null;
        }
      } else {
        // Object based members
        const memberKey = Object.keys(members).find(key => members[key].userId === userId || members[key].id === userId);
        if (memberKey) {
          updates[`groups/${groupId}/members/${memberKey}/walletBalance`] = isEnabled ? balance : null;
        }
      }
    });

    if (Object.keys(updates).length > 0) {
      await db.ref().update(updates);
      console.log(`✅ Synced wallet balance for user ${userId} to ${Object.keys(updates).length} group paths (Enabled: ${isEnabled})`);
    }

  } catch (error) {
    console.error('❌ Failed to sync wallet balance to groups:', error);
  }
};

module.exports = { syncWalletBalanceToGroups };
