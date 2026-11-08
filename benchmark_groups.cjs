const { performance } = require('perf_hooks');

const NUM_GROUPS = 50;

// Mock DB
const db = {
  ref: (path) => {
    return {
      get: async () => {
        await new Promise(resolve => setTimeout(resolve, 10)); // 10ms latency per request
        return {
          exists: () => true,
          val: () => "Test Group Name"
        };
      }
    };
  }
};

const admin = { database: () => db };

async function runBenchmark() {
  const groupIds = Array.from({length: NUM_GROUPS}, (_, i) => `group_${i}`);

  // Baseline: Sequential await in for loop
  const start = performance.now();
  const groupNames = {};
  for (const gid of groupIds) {
    const gSnap = await admin.database().ref(`groups/${gid}/name`).get();
    if (gSnap.exists()) groupNames[gid] = gSnap.val();
  }
  const end = performance.now();
  console.log(`[Baseline - Sequential loop] Time: ${(end - start).toFixed(2)}ms`);

  // Optimized: Promise.all
  const startOpt = performance.now();
  const groupNamesOpt = {};
  const promises = groupIds.map(async (gid) => {
    const gSnap = await admin.database().ref(`groups/${gid}/name`).get();
    if (gSnap.exists()) groupNamesOpt[gid] = gSnap.val();
  });
  await Promise.all(promises);
  const endOpt = performance.now();
  console.log(`[Optimized - Promise.all] Time: ${(endOpt - startOpt).toFixed(2)}ms`);
}

runBenchmark();
