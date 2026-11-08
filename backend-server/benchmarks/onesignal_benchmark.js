const { performance } = require('perf_hooks');

// Mock Data
const USER_COUNT = 100;
const userIds = Array.from({ length: USER_COUNT }, (_, i) => `user_${i}`);

// Mock Admin SDK
const mockDelay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const admin = {
  database: () => ({
    ref: (path) => ({
      once: async (event) => {
        await mockDelay(10); // Simulate RTDB network latency (optimistic 10ms)
        return {
          val: () => {
            // Simulate 50% hit rate for playerIds
            const userId = path.split('/')[1];
            if (userId.charCodeAt(5) % 2 === 0) {
              return { playerId: `player_${userId}` };
            }
            return null;
          }
        };
      }
    })
  })
};

// Mock Fetch
const mockFetch = async (url, options) => {
  await mockDelay(50); // Simulate OneSignal API latency
  return {
    ok: true,
    json: async () => ({
      id: 'mock_notification_id',
      recipients: USER_COUNT
    })
  };
};

// Current Implementation (N+1 Fetch)
async function currentImplementation() {
  const start = performance.now();

  // 1. Get OneSignal Player IDs from Firebase Realtime Database
  // console.log('🔍 Looking up Player IDs in Firebase...');

  const playerIdsPromises = userIds.map(async (userId) => {
    try {
      const playerRef = admin.database().ref(`oneSignalPlayers/${userId}`);
      const snapshot = await playerRef.once('value');
      const playerData = snapshot.val();

      if (playerData && playerData.playerId) {
        // console.log(`  ✅ User ${userId}: Player ID found (${playerData.playerId.substring(0, 12)}...)`);
        return playerData.playerId;
      } else {
        // console.log(`  ⚠️ User ${userId}: NO Player ID in Firebase (user may not have subscribed)`);
        return null;
      }
    } catch (error) {
      console.error(`  ❌ User ${userId}: Failed to get Player ID:`, error.message);
      return null;
    }
  });

  const results = await Promise.all(playerIdsPromises);
  const playerIds = results.filter(id => id !== null);

  // console.log('📊 Summary: Found', playerIds.length, 'Player IDs out of', userIds.length, 'users');

  // 2. Build notification payload
  const notificationData = {
    app_id: 'mock_app_id',
    include_external_user_ids: userIds,
    include_player_ids: playerIds.length > 0 ? playerIds : undefined,
    headings: { en: 'Test Title' },
    contents: { en: 'Test Body' }
  };

  // 3. Send to OneSignal
  await mockFetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    body: JSON.stringify(notificationData)
  });

  const end = performance.now();
  return end - start;
}

// Optimized Implementation (No Fetch)
async function optimizedImplementation() {
  const start = performance.now();

  // 1. Skip Player ID lookup!

  // 2. Build notification payload
  const notificationData = {
    app_id: 'mock_app_id',
    include_external_user_ids: userIds,
    // include_player_ids: removed
    headings: { en: 'Test Title' },
    contents: { en: 'Test Body' }
  };

  // 3. Send to OneSignal
  await mockFetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    body: JSON.stringify(notificationData)
  });

  const end = performance.now();
  return end - start;
}

(async () => {
    console.log(`Running benchmark with ${USER_COUNT} users...`);

    // Warmup
    await currentImplementation();
    await optimizedImplementation();

    // Run
    const currentTimes = [];
    const optimizedTimes = [];

    for(let i=0; i<5; i++) {
        currentTimes.push(await currentImplementation());
        optimizedTimes.push(await optimizedImplementation());
    }

    const avgCurrent = currentTimes.reduce((a,b) => a+b, 0) / currentTimes.length;
    const avgOptimized = optimizedTimes.reduce((a,b) => a+b, 0) / optimizedTimes.length;

    console.log(`\nCurrent Implementation (Avg): ${avgCurrent.toFixed(2)}ms`);
    console.log(`Optimized Implementation (Avg): ${avgOptimized.toFixed(2)}ms`);
    console.log(`Improvement: ${(avgCurrent / avgOptimized).toFixed(2)}x faster`);
    console.log(`Time Saved: ${(avgCurrent - avgOptimized).toFixed(2)}ms per batch of ${USER_COUNT} users`);
})();
