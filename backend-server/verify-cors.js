const http = require('http');

// Mock Environment Variables
process.env.ALLOWED_ORIGINS = 'https://my-preview.vercel.app';
process.env.PORT = '3001';
process.env.NODE_ENV = 'test';

console.log('🧪 Starting CORS Verification Test...');

try {
  // Import the app
  const app = require('./server.js');

  // Start the server manually
  const server = app.listen(3001, () => {
    console.log('✅ Test server started on port 3001');
    runTests(server);
  });

} catch (err) {
  console.error('❌ Test Setup Failed:', err);
  process.exit(1);
}

async function runTests(server) {
  let passed = 0;
  let failed = 0;

  async function testRequest(name, origin, expectedStatus) {
    console.log(`\n🔍 Test: ${name}`);
    console.log(`   Origin: ${origin || '(none)'}`);

    try {
      const response = await fetch('http://localhost:3001/health', {
        method: 'GET',
        headers: origin ? { 'Origin': origin } : {}
      });

      console.log(`   Response Status: ${response.status}`);

      if (response.status === expectedStatus) {
        console.log('   ✅ Result: PASSED');
        passed++;
        return true;
      } else {
        console.log(`   ❌ Result: FAILED (Expected ${expectedStatus}, got ${response.status})`);
        failed++;
        return false;
      }
    } catch (err) {
      console.error('   ❌ Request Error:', err.message);
      failed++;
      return false;
    }
  }

  // 1. Hardcoded Origin (Production)
  await testRequest('Hardcoded Production Origin', 'https://hostel-ledger.vercel.app', 200);

  // 2. Environment Allowed Origin
  await testRequest('Environment Allowed Origin', 'https://my-preview.vercel.app', 200);

  // 3. Disallowed Vercel App
  // Note: Express CORS middleware triggers error handler for callback(err), resulting in 500
  await testRequest('Disallowed Vercel App', 'https://evil.vercel.app', 500);

  // 4. Disallowed Random Origin
  await testRequest('Disallowed Random Origin', 'https://random-site.com', 500);

  // 5. No Origin (Mobile/Curl)
  await testRequest('No Origin', null, 200);

  console.log(`\n📊 Summary: ${passed} passed, ${failed} failed.`);

  server.close(() => {
    console.log('🛑 Test server closed');
    process.exit(failed === 0 ? 0 : 1);
  });
}
