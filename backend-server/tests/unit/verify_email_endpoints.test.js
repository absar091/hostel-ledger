const Module = require('module');
const request = require('supertest');
const originalRequire = Module.prototype.require;

// Mock Data
const MOCK_USER_WITH_EMAIL = {
  uid: 'test-user-123',
  email: 'user@example.com',
  name: 'Test User'
};

const MOCK_USER_NO_EMAIL = {
  uid: 'test-user-no-email',
  // email: undefined
  name: 'Phone User'
};

let currentUser = MOCK_USER_WITH_EMAIL;

// 1. Mock Dependencies
const mockFirebaseAdmin = {
  initializeApp: () => {},
  credential: { cert: () => {} },
  auth: () => ({
    verifyIdToken: async () => currentUser,
    getUserByEmail: async () => currentUser,
    getUser: async () => currentUser
  }),
  database: () => ({
    ref: () => ({
      get: async () => ({ exists: () => false, val: () => null }),
      update: async () => {},
      push: () => ({ key: 'new-id' }),
      set: async () => {}
    }),
    ServerValue: { TIMESTAMP: 123456789, increment: () => {} }
  }),
  firestore: () => ({
      collection: () => ({ doc: () => ({ set: async () => {}, get: async () => ({ exists: false }) }) }),
      Timestamp: { fromDate: () => {} }
  })
};

const mockCloudinary = {
  v2: {
    config: () => {},
    uploader: { destroy: async () => ({ result: 'ok' }) }
  }
};

const mockEmailService = {
  verifyConnection: async () => true,
  sendTempMemberAlert: async () => ({ success: true }),
  sendTransactionAlert: async () => ({ success: true }),
  sendVerification: async () => ({ success: true }),
  sendPasswordReset: async () => ({ success: true }),
  sendWelcome: async () => ({ success: true }),
  sendInvitation: async () => ({ success: true }),
  sendExpenseNotification: async () => ({ success: true }),
  send2FAReset: async () => ({ success: true }),
  send2FAEnabledAlert: async () => ({ success: true }),
  send2FADisabledAlert: async () => ({ success: true })
};

// Intercept require
Module.prototype.require = function(path) {
  if (path === 'firebase-admin') return mockFirebaseAdmin;
  if (path === 'cloudinary') return mockCloudinary;
  if (path.endsWith('/services/emailService') || path.endsWith('\\services\\emailService')) {
      return mockEmailService;
  }

  return originalRequire.apply(this, arguments);
};

// 2. Load Server
console.log('🚀 Loading server with mocks...');
let app;
try {
  process.env.PORT = '3000';
  process.env.FIREBASE_PROJECT_ID = 'test';

  const serverPath = require.resolve('../../server.js');
  delete require.cache[serverPath];

  app = originalRequire(serverPath);
} catch (err) {
  console.error('❌ Failed to load server:', err);
  process.exit(1);
}

// 3. Run Tests
async function runTests() {
  console.log('\n🧪 Running Security Verification Tests...\n');
  let failures = 0;

  // TEST 1: /api/send-transaction-alert (Expectation: 410 Gone)
  console.log('🔹 TEST 1: Checking /api/send-transaction-alert (Expectation: 410)');
  try {
    currentUser = MOCK_USER_WITH_EMAIL;
    const res = await request(app)
      .post('/api/send-transaction-alert')
      .set('Authorization', 'Bearer valid-token')
      .send({
        email: 'victim@example.com',
        name: 'Victim',
        transactionType: 'payment',
        amount: '10000',
        groupName: 'Fake Group',
        date: '2023-01-01',
        description: 'You paid'
      });

    if (res.status === 410) {
      console.log('✅ PASS: Endpoint returns 410 Gone');
    } else {
      console.log(`❌ FAIL: Expected 410, got ${res.status}`);
      failures++;
    }
  } catch (err) {
    console.error('❌ Error in Test 1:', err);
    failures++;
  }

  // TEST 2: /api/send-temp-member-alert (Expectation: 403 on mismatch)
  console.log('\n🔹 TEST 2: Checking /api/send-temp-member-alert (Expectation: 403 on mismatch)');
  try {
    currentUser = MOCK_USER_WITH_EMAIL;
    const res = await request(app)
      .post('/api/send-temp-member-alert')
      .set('Authorization', 'Bearer valid-token')
      .send({
        to: 'victim@example.com',
        memberName: 'Temp User',
        groupName: 'My Group',
        expiryDate: new Date().toISOString()
      });

    if (res.status === 403) {
      console.log('✅ PASS: Mismatched email blocked (403)');
    } else {
      console.log(`❌ FAIL: Expected 403, got ${res.status}`);
      failures++;
    }
  } catch (err) {
    console.error('❌ Error in Test 2:', err);
    failures++;
  }

  // TEST 3: /api/send-temp-member-alert (Expectation: 200 on match)
  console.log('\n🔹 TEST 3: Checking /api/send-temp-member-alert (Expectation: 200 on match)');
  try {
      currentUser = MOCK_USER_WITH_EMAIL;
      const res = await request(app)
        .post('/api/send-temp-member-alert')
        .set('Authorization', 'Bearer valid-token')
        .send({
          to: 'user@example.com',
          memberName: 'Temp User',
          groupName: 'My Group',
          expiryDate: new Date().toISOString()
        });

      if (res.status === 200) {
        console.log('✅ PASS: Matching email allowed (200)');
      } else {
        console.log(`❌ FAIL: Expected 200, got ${res.status}`);
        failures++;
      }
    } catch (err) {
      console.error('❌ Error in Test 3:', err);
      failures++;
    }

  // TEST 4: Missing 'to' field (Expect 400 Bad Request, NOT crash)
  console.log('\n🔹 TEST 4: Checking missing input (Expectation: 400)');
  try {
    currentUser = MOCK_USER_WITH_EMAIL;
    const res = await request(app)
      .post('/api/send-temp-member-alert')
      .set('Authorization', 'Bearer valid-token')
      .send({
        // to: missing
        memberName: 'Temp User',
        groupName: 'My Group',
        expiryDate: new Date().toISOString()
      });

    if (res.status === 400) {
      console.log('✅ PASS: Missing field returned 400');
    } else {
      console.log(`❌ FAIL: Expected 400, got ${res.status}`);
      failures++;
    }
  } catch (err) {
    console.error('❌ Error in Test 4:', err);
    failures++;
  }


  // TEST 4b: DoS Payload for 'to' field (Expect 400 Bad Request, NOT crash)
  console.log('\n🔹 TEST 4b: Checking DoS payload (Expectation: 400)');
  try {
    currentUser = MOCK_USER_WITH_EMAIL;
    const res = await request(app)
      .post('/api/send-temp-member-alert')
      .set('Authorization', 'Bearer valid-token')
      .send({
        to: { $ne: null }, // Malicious payload
        memberName: 'Temp User',
        groupName: 'My Group',
        expiryDate: new Date().toISOString()
      });

    if (res.status === 400) {
      console.log('✅ PASS: DoS payload returned 400');
    } else {
      console.log(`❌ FAIL: Expected 400, got ${res.status}`);
      failures++;
    }
  } catch (err) {
    console.error('❌ Error in Test 4b:', err);
    failures++;
  }

  // TEST 5: User without email (Expect 403 Forbidden)
  console.log('\n🔹 TEST 5: Checking user without email (Expectation: 403)');
  try {
    currentUser = MOCK_USER_NO_EMAIL; // Switch user
    const res = await request(app)
      .post('/api/send-temp-member-alert')
      .set('Authorization', 'Bearer valid-token')
      .send({
        to: 'some@example.com',
        memberName: 'Temp User',
        groupName: 'My Group',
        expiryDate: new Date().toISOString()
      });

    if (res.status === 403) {
      console.log('✅ PASS: User without email blocked (403)');
    } else {
      console.log(`❌ FAIL: Expected 403, got ${res.status}`);
      failures++;
    }
  } catch (err) {
    console.error('❌ Error in Test 5:', err);
    failures++;
  }

  // TEST 6: /api/send-welcome (Expectation: 403 on mismatch)
  console.log('\n🔹 TEST 6: Checking /api/send-welcome (Expectation: 403 on mismatch)');
  try {
    currentUser = MOCK_USER_WITH_EMAIL;
    const res = await request(app)
      .post('/api/send-welcome')
      .set('Authorization', 'Bearer valid-token')
      .send({
        email: 'victim@example.com',
        name: 'Temp User'
      });

    if (res.status === 403) {
      console.log('✅ PASS: Mismatched email blocked (403)');
    } else {
      console.log(`❌ FAIL: Expected 403, got ${res.status}`);
      failures++;
    }
  } catch (err) {
    console.error('❌ Error in Test 6:', err);
    failures++;
  }

  // TEST 7: /api/send-welcome (Expectation: 200 on match)
  console.log('\n🔹 TEST 7: Checking /api/send-welcome (Expectation: 200 on match)');
  try {
      currentUser = MOCK_USER_WITH_EMAIL;
      const res = await request(app)
        .post('/api/send-welcome')
        .set('Authorization', 'Bearer valid-token')
        .send({
          email: 'user@example.com',
          name: 'Temp User'
        });

      if (res.status === 200) {
        console.log('✅ PASS: Matching email allowed (200)');
      } else {
        console.log(`❌ FAIL: Expected 200, got ${res.status}`);
        failures++;
      }
    } catch (err) {
      console.error('❌ Error in Test 7:', err);
      failures++;
    }

  console.log(`\n🏁 Tests Complete. Failures: ${failures}`);
  if (failures > 0) process.exit(1);
}

runTests();
