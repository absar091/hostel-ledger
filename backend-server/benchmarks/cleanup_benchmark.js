const { performance } = require('perf_hooks');

// Mock Data
const MOCK_USERS_COUNT = 50;
const accounts = {};
for (let i = 0; i < MOCK_USERS_COUNT; i++) {
  accounts[`user_${i}`] = {
    emailVerified: false,
    email: `user_${i}@example.com`,
    createdAt: new Date().toISOString()
  };
}

// Mock Admin SDK
const mockDelay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const admin = {
  auth: () => ({
    deleteUser: async (uid) => {
      await mockDelay(50); // Simulate Auth delete latency
      // console.log(`[Mock] Deleted Auth: ${uid}`);
    }
  }),
  firestore: () => ({
    collection: () => ({
      where: () => ({
        get: async () => {
          await mockDelay(30); // Simulate Firestore query latency
          return {
            empty: false,
            forEach: (cb) => {
               // Simulate one doc
               cb({ ref: {} });
            }
          };
        }
      })
    }),
    batch: () => ({
      delete: () => {},
      commit: async () => {
        await mockDelay(30); // Simulate batch commit latency
      }
    })
  })
};

const db = {
  ref: (path) => ({
    remove: async () => {
      await mockDelay(20); // Simulate RTDB remove latency
      // console.log(`[Mock] Removed RTDB: ${path}`);
    }
  })
};

// Original Sequential Implementation
async function sequentialCleanup() {
  console.log('--- Starting Sequential Cleanup ---');
  let deletedCount = 0;
  const errors = [];
  const firestore = admin.firestore();

  const start = performance.now();

  for (const [uid, accountData] of Object.entries(accounts)) {
    try {
      // Skip if already verified (double check)
      if (accountData.emailVerified) {
        continue;
      }

      // 1. Delete from Firebase Auth
      try {
        await admin.auth().deleteUser(uid);
      } catch (authError) {
        if (authError.code === 'auth/user-not-found') {
          // console.log(`User ${uid} not found in Auth, proceeding with DB cleanup`);
        } else {
          throw authError;
        }
      }

      // 2. Delete user profile from Realtime Database
      await db.ref(`users/${uid}`).remove();

      // 3. Delete email verification record from Realtime Database
      await db.ref(`emailVerification/${uid}`).remove();

      // 4. Delete verification codes (Legacy RTDB & Firestore)
      if (accountData.email) {
        // RTDB (Legacy/Invalid Path Handling)
        try {
          await db.ref(`verificationCodes/${accountData.email}`).remove();
        } catch (e) {
          // console.warn('Could not delete RTDB verification codes for user:', e.message);
        }

        // Firestore (Current)
        try {
          const verificationCodesRef = firestore.collection('verificationCodes');
          const snapshotCodes = await verificationCodesRef.where('email', '==', accountData.email).get();
          if (!snapshotCodes.empty) {
            const batch = firestore.batch();
            snapshotCodes.forEach(doc => {
              batch.delete(doc.ref);
            });
            await batch.commit();
            // console.log('Deleted Firestore verification codes for user');
          }
        } catch (e) {
          // console.warn('Could not delete Firestore verification codes for user:', e.message);
        }
      }

      deletedCount++;

    } catch (err) {
      console.error(`Failed to delete user ${uid}:`, err);
      errors.push({ uid, error: err.message });
    }
  }

  const end = performance.now();
  console.log(`Sequential: Processed ${deletedCount} users in ${(end - start).toFixed(2)}ms`);
  return end - start;
}

// Optimized Parallel Implementation
async function parallelCleanup() {
  console.log('--- Starting Parallel Cleanup ---');
  let deletedCount = 0; // Note: This might need atomic handling if strictly tracking counts, but for array length it's fine.
  // In parallel, we collect results.
  const firestore = admin.firestore();

  const start = performance.now();

  const promises = Object.entries(accounts).map(async ([uid, accountData]) => {
    try {
        // Skip if already verified (double check)
        if (accountData.emailVerified) {
          return null; // Skip
        }

        // 1. Delete from Firebase Auth
        try {
          await admin.auth().deleteUser(uid);
        } catch (authError) {
          if (authError.code === 'auth/user-not-found') {
            // console.log(`User ${uid} not found in Auth, proceeding with DB cleanup`);
          } else {
            throw authError;
          }
        }

        // 2. Delete user profile from Realtime Database
        // 3. Delete email verification record from Realtime Database
        // 4. Delete verification codes (RTDB)

        // Parallelize internal operations? Or just user-level parallelization?
        // User-level parallelization is the biggest win. Internal operations are dependent or fast enough.
        // Actually, RTDB removes can be parallelized too!

        const internalPromises = [
            db.ref(`users/${uid}`).remove(),
            db.ref(`emailVerification/${uid}`).remove()
        ];

        if (accountData.email) {
            internalPromises.push(
                (async () => {
                    try {
                        await db.ref(`verificationCodes/${accountData.email}`).remove();
                    } catch (e) {}
                })()
            );
        }

        await Promise.all(internalPromises);

        // Firestore (Current) - keep this await as it involves query then write
        if (accountData.email) {
            try {
              const verificationCodesRef = firestore.collection('verificationCodes');
              const snapshotCodes = await verificationCodesRef.where('email', '==', accountData.email).get();
              if (!snapshotCodes.empty) {
                const batch = firestore.batch();
                snapshotCodes.forEach(doc => {
                  batch.delete(doc.ref);
                });
                await batch.commit();
              }
            } catch (e) {
              // console.warn('Could not delete Firestore verification codes for user:', e.message);
            }
        }

        return { success: true, uid };

      } catch (err) {
        // console.error(`Failed to delete user ${uid}:`, err);
        return { success: false, uid, error: err.message };
      }
  });

  const results = await Promise.all(promises);

  const successCount = results.filter(r => r && r.success).length;
  const errors = results.filter(r => r && !r.success);

  const end = performance.now();
  console.log(`Parallel: Processed ${successCount} users in ${(end - start).toFixed(2)}ms`);
  return end - start;
}

(async () => {
    const seqTime = await sequentialCleanup();
    const parTime = await parallelCleanup();

    console.log(`\nImprovement: ${(seqTime / parTime).toFixed(2)}x faster`);
})();
