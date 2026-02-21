const { spawn } = require('child_process');
const http = require('http');

const PORT = 3001;
const ENDPOINT = `http://localhost:${PORT}/api/check-email-exists`;
const TOTAL_REQUESTS = 15;
const RATE_LIMIT = 10;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function startServer() {
  console.log('🚀 Starting server on port', PORT);
  const server = spawn('node', ['server.js'], {
    cwd: './backend-server',
    env: { ...process.env, PORT: PORT.toString() },
    stdio: 'pipe'
  });

  server.stdout.on('data', (data) => {
    console.log(`[SERVER]: ${data}`);
  });

  server.stderr.on('data', (data) => {
    console.error(`[SERVER ERROR]: ${data}`);
  });

  // Wait for server to be ready
  for (let i = 0; i < 20; i++) {
    try {
      // Use built-in fetch (Node 18+)
      const res = await fetch(`http://localhost:${PORT}/health`);
      if (res.ok) {
        console.log('✅ Server is ready');
        return server;
      }
    } catch (e) {
      await sleep(500);
    }
  }
  throw new Error('Server failed to start');
}

async function runTests() {
  let server;
  try {
    server = await startServer();

    console.log(`🧪 Sending ${TOTAL_REQUESTS} requests to verify rate limit (Max: ${RATE_LIMIT})...`);

    let successCount = 0;
    let failCount = 0;
    let blockedCount = 0;

    for (let i = 1; i <= TOTAL_REQUESTS; i++) {
      const startTime = Date.now();
      try {
        const response = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: `test${i}@example.com` })
        });

        const duration = Date.now() - startTime;

        if (response.status === 200) {
          successCount++;
          console.log(`Request ${i}: ✅ 200 OK (${duration}ms)`);

          if (duration < 500) {
             console.error(`❌ Request ${i} was too fast! Delay not working.`);
             // Don't exit immediately, let the counts determine failure
          }
        } else if (response.status === 429) {
          blockedCount++;
          console.log(`Request ${i}: 🛡️ 429 Too Many Requests (${duration}ms)`);
        } else {
            failCount++;
            console.log(`Request ${i}: ❌ ${response.status} (${duration}ms)`);
        }

      } catch (err) {
        console.error(`Request ${i} failed:`, err.message);
        failCount++;
      }

      // Small delay between requests
      await sleep(100);
    }

    console.log('\n📊 Results:');
    console.log(`Success (200): ${successCount}`);
    console.log(`Blocked (429): ${blockedCount}`);
    console.log(`Failed (Other): ${failCount}`);

    // Allow for small variations in rate limiting (sometimes 1 extra slips through depending on store sync)
    // But express-rate-limit memory store is usually exact.
    if (successCount === RATE_LIMIT && blockedCount === (TOTAL_REQUESTS - RATE_LIMIT)) {
      console.log('\n✅ VERIFICATION PASSED: Rate limit enforced correctly.');
    } else {
      console.error('\n❌ VERIFICATION FAILED: Counts do not match expected values.');
      console.error(`Expected Success: ${RATE_LIMIT}, Got: ${successCount}`);
      console.error(`Expected Blocked: ${TOTAL_REQUESTS - RATE_LIMIT}, Got: ${blockedCount}`);
      process.exit(1);
    }

  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    if (server) {
      console.log('🛑 Stopping server...');
      server.kill();
    }
  }
}

runTests();
