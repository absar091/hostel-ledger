const { performance } = require('perf_hooks');

// Mock Firebase Admin
const admin = {
  database: () => ({
    ref: (path) => ({
      once: async () => {
        // Simulate network latency
        await new Promise(resolve => setTimeout(resolve, 50));
        return {
          val: () => ({ playerId: `player-${path.split('/').pop()}` })
        };
      }
    })
  })
};

const userIds = Array.from({ length: 20 }, (_, i) => `user_${i}`);

async function originalFetch(userIds) {
  const playerIds = [];
  console.log('Original: Starting sequential fetch...');
  const start = performance.now();

  for (const userId of userIds) {
    try {
      const playerRef = admin.database().ref(`oneSignalPlayers/${userId}`);
      const snapshot = await playerRef.once('value');
      const playerData = snapshot.val();

      if (playerData && playerData.playerId) {
        playerIds.push(playerData.playerId);
      }
    } catch (error) {
      console.error(`Error fetching ${userId}`, error);
    }
  }

  const end = performance.now();
  console.log(`Original: Finished in ${(end - start).toFixed(2)}ms`);
  return playerIds;
}

async function optimizedFetch(userIds) {
  const playerIds = [];
  console.log('Optimized: Starting parallel fetch...');
  const start = performance.now();

  const promises = userIds.map(async (userId) => {
    try {
      const playerRef = admin.database().ref(`oneSignalPlayers/${userId}`);
      const snapshot = await playerRef.once('value');
      const playerData = snapshot.val();

      if (playerData && playerData.playerId) {
        return playerData.playerId;
      }
    } catch (error) {
      console.error(`Error fetching ${userId}`, error);
    }
    return null;
  });

  const results = await Promise.all(promises);
  const validIds = results.filter(id => id !== null);

  const end = performance.now();
  console.log(`Optimized: Finished in ${(end - start).toFixed(2)}ms`);
  return validIds;
}

async function runBenchmark() {
  console.log(`Benchmarking with ${userIds.length} users...`);
  await originalFetch(userIds);
  await optimizedFetch(userIds);
}

runBenchmark();
