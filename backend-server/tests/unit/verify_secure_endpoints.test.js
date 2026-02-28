const Module = require('module');
const request = require('supertest');
const originalRequire = Module.prototype.require;

// Mock Data
const MOCK_USER_WITH_EMAIL = {
  uid: 'test-user-123',
  email: 'user@example.com',
  name: 'Test User'
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
  process.env.PORT = '3001'; // Different port just in case
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
  console.log('\n🧪 Running Secure Endpoints Verification Tests...\n');
  let failures = 0;

  // TEST 1: /api/send-verification with invalid code (Expectation: 400)
  console.log('🔹 TEST 1: Checking /api/send-verification with invalid code');
  try {
    const res = await request(app)
      .post('/api/send-verification')
      .set('Authorization', 'Bearer valid-token')
      .send({
        email: 'user@example.com',
        code: '1234567', // 7 digits
        name: 'Test User'
      });

    if (res.status === 400 && res.body.error.includes('must be 6 digits')) {
      console.log('✅ PASS: Invalid code rejected (400)');
    } else {
      console.log(`❌ FAIL: Expected 400, got ${res.status}. Body:`, res.body);
      failures++;
    }
  } catch (err) {
    console.error('❌ Error in Test 1:', err);
    failures++;
  }

  // TEST 2: /api/send-verification with XSS email (Expectation: 400)
  console.log('\n🔹 TEST 2: Checking /api/send-verification with XSS email');
  try {
    const res = await request(app)
      .post('/api/send-verification')
      .set('Authorization', 'Bearer valid-token')
      .send({
        email: '<script>alert(1)</script>@example.com',
        code: '123456',
        name: 'Hacker'
      });

    if (res.status === 400 && res.body.error.includes('Invalid email format')) {
      console.log('✅ PASS: XSS email rejected (400)');
    } else {
      console.log(`❌ FAIL: Expected 400, got ${res.status}. Body:`, res.body);
      failures++;
    }
  } catch (err) {
    console.error('❌ Error in Test 2:', err);
    failures++;
  }

  // TEST 3: /api/send-verification with valid inputs (Expectation: 200)
  console.log('\n🔹 TEST 3: Checking /api/send-verification with valid inputs');
  try {
    const res = await request(app)
      .post('/api/send-verification')
      .set('Authorization', 'Bearer valid-token')
      .send({
        email: 'valid@example.com',
        code: '123456',
        name: 'Good User'
      });

    if (res.status === 200) {
      console.log('✅ PASS: Valid input accepted (200)');
    } else {
      console.log(`❌ FAIL: Expected 200, got ${res.status}. Body:`, res.body);
      failures++;
    }
  } catch (err) {
    console.error('❌ Error in Test 3:', err);
    failures++;
  }

  // TEST 4: /api/create-group with invalid member emails (Expectation: 400)
  // Note: create-group requires auth. Our mock auth returns a user.
  console.log('\n🔹 TEST 4: Checking /api/create-group with invalid member email');
  try {
    const res = await request(app)
      .post('/api/create-group')
      .set('Authorization', 'Bearer valid-token')
      .send({
        name: 'Hacked Group',
        members: [
            { name: 'Hacker', email: '<script>@bad.com', type: 'manual' }
        ]
      });

    if (res.status === 400 && res.body.error.includes('invalid email format')) {
      console.log('✅ PASS: Invalid member email rejected (400)');
    } else {
      console.log(`❌ FAIL: Expected 400, got ${res.status}. Body:`, res.body);
      failures++;
    }
  } catch (err) {
    console.error('❌ Error in Test 4:', err);
    failures++;
  }

  console.log(`\n🏁 Tests Complete. Failures: ${failures}`);
  if (failures > 0) process.exit(1);
}

runTests();
