const Module = require('module');
const request = require('supertest');
const originalRequire = Module.prototype.require;

// Mock Data
const MOCK_USER = {
  uid: 'test-user-123',
  email: 'user@example.com',
  name: 'Test User'
};

// 1. Mock Dependencies
const mockFirebaseAdmin = {
  initializeApp: () => {},
  credential: { cert: () => {} },
  auth: () => ({
    verifyIdToken: async () => MOCK_USER,
    getUserByEmail: async () => MOCK_USER,
    getUser: async () => MOCK_USER
  }),
  database: () => ({
    ref: () => ({
      get: async () => ({ exists: () => false, val: () => null }),
      update: async () => {},
      push: () => ({ key: 'new-id' }),
      set: async () => {},
      once: async () => ({ exists: () => false, val: () => null })
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
  verifyConnection: async () => true
};

// Intercept require
Module.prototype.require = function(path) {
  if (path === 'firebase-admin') return mockFirebaseAdmin;
  if (path === 'cloudinary') return mockCloudinary;
  if (path.endsWith('/services/emailService') || path.endsWith('\\services\\emailService')) {
      return mockEmailService;
  }
  // Allow normal loading for other modules
  return originalRequire.apply(this, arguments);
};

// Mock fetch for OneSignal
global.fetch = async () => ({
  ok: true,
  json: async () => ({ id: 'test-notification-id', recipients: 1 })
});

// 2. Load Server
console.log('🚀 Loading server with mocks...');
let app;
try {
  process.env.PORT = '3002';
  process.env.FIREBASE_PROJECT_ID = 'test';
  process.env.ONESIGNAL_APP_ID = 'test-app-id';
  process.env.ONESIGNAL_REST_API_KEY = 'test-api-key';

  const serverPath = require.resolve('../../server.js');
  delete require.cache[serverPath];

  app = originalRequire(serverPath);
} catch (err) {
  console.error('❌ Failed to load server:', err);
  process.exit(1);
}

// 3. Define Tests - Using CommonJS compatible test runner approach
// Since we are running with 'vitest', we should avoid importing 'vitest' in CJS if it causes issues.
// But we need 'describe', 'it', 'expect'.
// Vitest injects these globally if globals: true is set.
// If not, we are stuck.
// Let's assume globals are NOT injected given the previous error didn't complain about missing describe/it but about import.

// HACK: Use dynamic import to get vitest functions
async function runTests() {
  const { describe, it, expect } = await import('vitest');

  describe('Push Notification Security', () => {

    it('should reject title that is too long', async () => {
      const res = await request(app)
        .post('/api/push-notify')
        .set('Authorization', 'Bearer valid-token')
        .send({
          userId: 'test-user',
          title: 'A'.repeat(101),
          body: 'Valid body'
        });

      expect(res.status).toBe(400);
    });

    it('should reject body that is too long', async () => {
      const res = await request(app)
        .post('/api/push-notify')
        .set('Authorization', 'Bearer valid-token')
        .send({
          userId: 'test-user',
          title: 'Valid Title',
          body: 'A'.repeat(501)
        });

      expect(res.status).toBe(400);
    });

    it('should reject non-string title', async () => {
      const res = await request(app)
        .post('/api/push-notify')
        .set('Authorization', 'Bearer valid-token')
        .send({
          userId: 'test-user',
          title: 12345,
          body: 'Valid body'
        });

      expect(res.status).toBe(400);
    });

    it('should accept valid input', async () => {
      const res = await request(app)
        .post('/api/push-notify')
        .set('Authorization', 'Bearer valid-token')
        .send({
          userId: 'test-user',
          title: 'Valid Title',
          body: 'Valid Body'
        });

      expect(res.status).toBe(200);
    });
  });
}

// Check if we are running in Vitest context
if (process.env.VITEST) {
    // If running under Vitest, these might be global or we can try importing.
    // The previous error was about `require('vitest')`.
    // Let's try `import('vitest')` inside an async IIFE wrapper?
    // Or, since `runTests` is async and uses dynamic import, let's just call it.
    // BUT, `describe` needs to be synchronous for collection usually.
    // Vitest collects tests synchronously.

    // Attempt to use global describe/it/expect if available
    try {
        if (typeof describe !== 'undefined') {
            describe('Push Notification Security (Global)', () => {
                 it('should reject title that is too long', async () => {
                    const res = await request(app)
                        .post('/api/push-notify')
                        .set('Authorization', 'Bearer valid-token')
                        .send({
                            userId: 'test-user-123',
                            title: 'A'.repeat(101),
                            body: 'Valid body'
                        });
                    if (typeof expect !== 'undefined') {
                         expect(res.status).toBe(400);
                    } else {
                         if (res.status !== 400) throw new Error('Expected 400');
                    }
                 });

                 it('should reject body that is too long', async () => {
                    const res = await request(app)
                        .post('/api/push-notify')
                        .set('Authorization', 'Bearer valid-token')
                        .send({
                            userId: 'test-user-123',
                            title: 'Valid Title',
                            body: 'A'.repeat(501)
                        });
                    if (typeof expect !== 'undefined') {
                         expect(res.status).toBe(400);
                    } else {
                         if (res.status !== 400) throw new Error('Expected 400');
                    }
                 });

                 it('should reject non-string title', async () => {
                    const res = await request(app)
                        .post('/api/push-notify')
                        .set('Authorization', 'Bearer valid-token')
                        .send({
                            userId: 'test-user-123',
                            title: 12345,
                            body: 'Valid body'
                        });
                    if (typeof expect !== 'undefined') {
                         expect(res.status).toBe(400);
                    } else {
                         if (res.status !== 400) throw new Error('Expected 400');
                    }
                 });

                 it('should accept valid input', async () => {
                    const res = await request(app)
                        .post('/api/push-notify')
                        .set('Authorization', 'Bearer valid-token')
                        .send({
                            userId: 'test-user-123',
                            title: 'Valid Title',
                            body: 'Valid Body'
                        });
                    if (typeof expect !== 'undefined') {
                         expect(res.status).toBe(200);
                    } else {
                         if (res.status !== 200) throw new Error('Expected 200');
                    }
                 });
            });
        } else {
            // If describe is missing, we are in trouble.
            // Just running the file as node script?
            // See below.
        }
    } catch (e) {
        console.error("Setup error", e);
    }
}
