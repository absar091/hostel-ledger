
// Mock admin
const mockDb = {
  ref: (path) => ({
    get: async () => {
      await new Promise(r => setTimeout(r, 50)); // Mock network latency
      return { exists: () => true, val: () => 'Group Name' };
    }
  })
};

async function testSequential(groupIds) {
  const start = Date.now();
  const groupNames = {};
  for (const gid of groupIds) {
    const gSnap = await mockDb.ref(`groups/${gid}/name`).get();
    if (gSnap.exists()) groupNames[gid] = gSnap.val();
  }
  return Date.now() - start;
}

async function testConcurrent(groupIds) {
  const start = Date.now();
  const groupNames = {};
  await Promise.all(groupIds.map(async (gid) => {
    const gSnap = await mockDb.ref(`groups/${gid}/name`).get();
    if (gSnap.exists()) groupNames[gid] = gSnap.val();
  }));
  return Date.now() - start;
}

async function run() {
  const groupIds = Array.from({length: 20}, (_, i) => `group_${i}`);

  console.log("Running sequential test...");
  const seqTime = await testSequential(groupIds);

  console.log("Running concurrent test...");
  const concTime = await testConcurrent(groupIds);

  console.log(`Sequential time: ${seqTime}ms`);
  console.log(`Concurrent time: ${concTime}ms`);
  console.log(`Improvement: ${((seqTime - concTime) / seqTime * 100).toFixed(2)}%`);
}

run();
