const { performance } = require('perf_hooks');

// Mock Database
const MOCK_LATENCY_MS = 50; // Simulate 50ms network latency
const MOCK_PROCESSING_MS = 1; // Simulate 1ms processing overhead per request

const mockDb = {
  requestCount: 0,
  resetStats() {
    this.requestCount = 0;
  },
  ref(path) {
    return {
      get: async () => {
        this.requestCount++;
        // Simulate network latency + processing
        await new Promise(resolve => setTimeout(resolve, MOCK_LATENCY_MS + Math.random() * 5));
        // Simulate some CPU work
        const start = Date.now();
        while (Date.now() - start < MOCK_PROCESSING_MS) {}
        return {
          exists: () => true,
          val: () => ({ some: 'data' })
        };
      }
    };
  }
};

async function benchmarkNPlus1(memberIds) {
  mockDb.resetStats();
  const start = performance.now();

  const settlementsMap = {};
  const fetchPromises = memberIds.map(async (memberId) => {
    const snap = await mockDb.ref(`users/${memberId}/settlements/group1`).get();
    if (snap.exists()) {
      settlementsMap[memberId] = snap.val();
    } else {
      settlementsMap[memberId] = {};
    }
  });

  await Promise.all(fetchPromises);

  const end = performance.now();
  return {
    time: end - start,
    requests: mockDb.requestCount
  };
}

async function benchmarkOptimized(groupId) {
  mockDb.resetStats();
  const start = performance.now();

  // Optimized: Single fetch
  const snap = await mockDb.ref(`groupSettlements/${groupId}`).get();
  const data = snap.val();

  const end = performance.now();
  return {
    time: end - start,
    requests: mockDb.requestCount
  };
}

async function runBenchmark() {
  console.log('🚀 Starting Benchmark: Settlement Fetching');
  console.log('----------------------------------------');
  console.log(`Simulated Latency: ${MOCK_LATENCY_MS}ms`);
  console.log(`Simulated CPU Overhead: ${MOCK_PROCESSING_MS}ms/req`);
  console.log('----------------------------------------');

  const sizes = [5, 10, 50, 100];

  for (const size of sizes) {
    const memberIds = Array.from({ length: size }, (_, i) => `user_${i}`);

    console.log(`\nGroup Size: ${size} members`);

    // Warmup
    await benchmarkNPlus1(memberIds);
    await benchmarkOptimized('group1');

    // Run N+1
    const res1 = await benchmarkNPlus1(memberIds);
    console.log(`[N+1 Fetch]   Time: ${res1.time.toFixed(2)}ms | Requests: ${res1.requests}`);

    // Run Optimized
    const res2 = await benchmarkOptimized('group1');
    console.log(`[Optimized]   Time: ${res2.time.toFixed(2)}ms | Requests: ${res2.requests}`);

    const improvement = ((res1.time - res2.time) / res1.time * 100).toFixed(1);
    console.log(`⚡ Improvement: ${improvement}% faster (latency) | ${res1.requests / res2.requests}x fewer requests`);
  }
}

runBenchmark();
