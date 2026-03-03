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
  sendWelcome: async () => ({ success: true })
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
let app;
try {
  process.env.PORT = '3002'; // Different port just in case
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
  console.log('\n🧪 Running Welcome Email Tests...\n');
  let failures = 0;

  // TEST 1: /api/send-welcome with XSS email
  console.log('\n🔹 TEST 1: Checking /api/send-welcome with XSS email');
  try {
    const res = await request(app)
      .post('/api/send-welcome')
      .set('Authorization', 'Bearer valid-token')
      .send({
        email: '<script>alert(1)</script>@example.com',
        name: 'Hacker'
      });

    if (res.status === 400 && res.body.error && res.body.error.includes('Invalid email format')) {
      console.log('✅ PASS: XSS email rejected (400)');
    } else {
      console.log(`❌ FAIL: Expected 400 with 'Invalid email format', got ${res.status}. Body:`, res.body);
      failures++;
    }
  } catch (err) {
    console.error('❌ Error in Test 1:', err);
    failures++;
  }

  console.log(`\n🏁 Tests Complete. Failures: ${failures}`);
  if (failures > 0) process.exit(1);
}

runTests();
