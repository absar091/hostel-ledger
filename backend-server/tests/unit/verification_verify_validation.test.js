import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// Vitest mock for firebase-admin
vi.mock('firebase-admin', () => {
  const admin = {
    initializeApp: vi.fn(),
    credential: { cert: vi.fn() },
    database: vi.fn(() => ({
      ref: vi.fn(() => ({
        get: vi.fn(async () => ({ exists: () => true, val: () => ({}) })),
        update: vi.fn(async () => {}),
        set: vi.fn(async () => {})
      }))
    })),
    auth: vi.fn(() => ({
      verifyIdToken: vi.fn(async () => ({ uid: 'test-user-123', email: 'test@example.com' }))
    })),
    firestore: Object.assign(vi.fn(() => ({
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          set: vi.fn(async () => {}),
          get: vi.fn(async () => ({ exists: false })),
          delete: vi.fn(async () => {}),
          update: vi.fn(async () => {})
        }))
      }))
    })), {
      Timestamp: { fromDate: (date) => date }
    })
  };
  return { default: admin, ...admin };
});

import app from '../../server.js';

describe('POST /api/verification/verify Validation', () => {
  it('should reject missing email or code', async () => {
    const res = await request(app)
      .post('/api/verification/verify')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Email and code are required');
  });

  it('should reject non-string types for email and code', async () => {
    const res = await request(app)
      .post('/api/verification/verify')
      .send({ email: { $ne: null }, code: ['123456'] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid input types');
  });

  it('should reject invalid email formats', async () => {
    const res = await request(app)
      .post('/api/verification/verify')
      .send({ email: 'not-an-email', code: '123456' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid email format');
  });

  it('should reject invalid code lengths', async () => {
    const res = await request(app)
      .post('/api/verification/verify')
      .send({ email: 'test@example.com', code: '12345' }); // 5 digits
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid verification code format (must be 6 digits)');
  });

  it('should reject non-numeric codes', async () => {
    const res = await request(app)
      .post('/api/verification/verify')
      .send({ email: 'test@example.com', code: '123abc' }); // Contains letters
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid verification code format (must be 6 digits)');
  });

});
