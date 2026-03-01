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

const mockImageSecurity = {
  verifyImageOwnership: async (db, uid, publicId) => {
    // Mock successful ownership check
    return publicId === 'owned_image';
  }
};

// Intercept require
Module.prototype.require = function(path) {
  if (path === 'firebase-admin') return mockFirebaseAdmin;
  if (path === 'cloudinary') return mockCloudinary;
  if (path.endsWith('/services/emailService') || path.endsWith('\\services\\emailService')) {
      return mockEmailService;
  }
  if (path.endsWith('/utils/imageSecurity') || path.endsWith('\\utils\\imageSecurity')) {
      return mockImageSecurity;
  }
  // Allow normal loading for other modules
  return originalRequire.apply(this, arguments);
};

// 2. Load Server
let app;
try {
  process.env.PORT = '3005';
  process.env.FIREBASE_PROJECT_ID = 'test';

  const serverPath = require.resolve('../../server.js');
  delete require.cache[serverPath];

  app = originalRequire(serverPath);
} catch (err) {
  console.error('❌ Failed to load server:', err);
  process.exit(1);
}

// 3. Define Tests
async function runTests() {
  const { describe, it, expect } = await import('vitest');

  describe('Delete Image Endpoint', () => {
    it('should successfully delete an owned image', async () => {
      const res = await request(app)
        .post('/api/delete-image')
        .set('Authorization', 'Bearer valid-token')
        .send({
          publicId: 'owned_image'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject deleting an unowned image (IDOR protection)', async () => {
      const res = await request(app)
        .post('/api/delete-image')
        .set('Authorization', 'Bearer valid-token')
        .send({
          publicId: 'other_users_image'
        });

      // Based on line 799 in server.js
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Unauthorized');
    });

    it('should require publicId', async () => {
      const res = await request(app)
        .post('/api/delete-image')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
}

if (process.env.VITEST) {
    try {
        if (typeof describe !== 'undefined') {
            describe('Delete Image Endpoint Security (Global)', () => {
                 it('should successfully delete an owned image', async () => {
                    const res = await request(app)
                        .post('/api/delete-image')
                        .set('Authorization', 'Bearer valid-token')
                        .send({
                            publicId: 'owned_image'
                        });
                    if (typeof expect !== 'undefined') {
                         expect(res.status).toBe(200);
                         expect(res.body.success).toBe(true);
                    } else {
                         if (res.status !== 200) throw new Error('Expected 200');
                    }
                 });

                 it('should reject deleting an unowned image (IDOR protection)', async () => {
                    const res = await request(app)
                        .post('/api/delete-image')
                        .set('Authorization', 'Bearer valid-token')
                        .send({
                            publicId: 'other_users_image'
                        });
                    if (typeof expect !== 'undefined') {
                         expect(res.status).toBe(403);
                         expect(res.body.success).toBe(false);
                    } else {
                         if (res.status !== 403) throw new Error('Expected 403');
                    }
                 });
            });
        }
    } catch (e) {
        console.error("Setup error", e);
    }
}
