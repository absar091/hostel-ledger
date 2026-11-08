const { performance } = require('perf_hooks');

// Mock Data Setup
const NUM_MEMBERS = 50;
const users = {};
const members = [];

for (let i = 0; i < NUM_MEMBERS; i++) {
  const uid = `user_${i}`;
  users[uid] = { email: `user${i}@example.com`, name: `User ${i}` };
  members.push({
    id: `member_${i}`,
    userId: uid,
    name: `User ${i}`
    // No email initially
  });
}

// Mock DB
const db = {
  ref: (path) => {
    if (path.startsWith('users/')) {
      const uid = path.split('/')[1];
      return {
        get: async () => {
          // Simulate network latency (e.g., 50ms)
          await new Promise(resolve => setTimeout(resolve, 50));
          return {
            exists: () => !!users[uid],
            val: () => users[uid]
          };
        }
      };
    }
    return {
        get: async () => ({ exists: () => false })
    };
  }
};

async function runBenchmark() {
  console.log(`Starting benchmark with ${NUM_MEMBERS} members...`);

  // 1. Baseline: Hydration needed
  let membersArray = JSON.parse(JSON.stringify(members)); // Deep copy

  const start = performance.now();

  try {
    const memberHydrationPromises = membersArray.map(async (m) => {
      if (m.userId && !m.email) {
        try {
          const userSnap = await db.ref(`users/${m.userId}`).get();
          if (userSnap.exists()) {
            const userData = userSnap.val();
            return { ...m, email: userData.email };
          }
        } catch (err) {
          console.error(`⚠️ Failed to hydrate email for user ${m.userId}:`, err.message);
        }
      }
      return m;
    });
    membersArray = await Promise.all(memberHydrationPromises);
  } catch (hydrateError) { console.error('Hydration failed', hydrateError); }

  const end = performance.now();
  console.log(`[Baseline] Time taken (with hydration): ${(end - start).toFixed(2)}ms`);


  // 2. Optimized: Emails already present
  // Populate emails first
  const membersWithEmails = members.map(m => ({ ...m, email: users[m.userId].email }));
  let membersArrayOpt = JSON.parse(JSON.stringify(membersWithEmails));

  const startOpt = performance.now();

  try {
    const memberHydrationPromises = membersArrayOpt.map(async (m) => {
      if (m.userId && !m.email) {
        try {
          const userSnap = await db.ref(`users/${m.userId}`).get();
          if (userSnap.exists()) {
            const userData = userSnap.val();
            return { ...m, email: userData.email };
          }
        } catch (err) {
          console.error(`⚠️ Failed to hydrate email for user ${m.userId}:`, err.message);
        }
      }
      return m;
    });
    membersArrayOpt = await Promise.all(memberHydrationPromises);
  } catch (hydrateError) { console.error('Hydration failed', hydrateError); }

  const endOpt = performance.now();
  console.log(`[Optimized] Time taken (cached emails): ${(endOpt - startOpt).toFixed(2)}ms`);
}

runBenchmark();
