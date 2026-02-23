import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

describe('Payment Duplicate Check (DoS Fix)', () => {
  let app;
  let adminMocks;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    // Mock Factories
    const mockVerifyIdToken = vi.fn().mockResolvedValue({ uid: 'user1' });
    const mockDbGet = vi.fn();
    const mockDbUpdate = vi.fn();
    const mockDbRef = vi.fn();
    const mockOrderByChild = vi.fn();
    const mockStartAt = vi.fn();
    const mockLimitToLast = vi.fn();

    const databaseFn = () => ({
      ref: (path) => {
        mockDbRef(path);
        return {
          get: () => {
            mockDbGet(path);
            if (path === 'groups/group1') return Promise.resolve({ exists: () => true, val: () => ({ name: 'Test Group', members: [{ id: 'user1', userId: 'user1', name: 'User 1' }, { id: 'user2', userId: 'user2', name: 'User 2' }] }) });
            if (path === 'users/user1') return Promise.resolve({ exists: () => true, val: () => ({ name: 'User 1', walletBalance: 100 }) });
            if (path === 'users/user2') return Promise.resolve({ exists: () => true, val: () => ({ name: 'User 2', walletBalance: 50 }) });
            // Mock empty transactions for user
            return Promise.resolve({ exists: () => false, val: () => null });
          },
          push: () => ({ key: 'new_tx_id' }),
          update: mockDbUpdate,
          orderByChild: (field) => {
            mockOrderByChild(field);
            return {
              startAt: (val) => {
                mockStartAt(val);
                return {
                  get: () => Promise.resolve({ exists: () => false, val: () => null })
                }
              }
            }
          },
          limitToLast: (n) => {
              mockLimitToLast(n);
              return {
                  get: () => {
                      return Promise.resolve({ exists: () => false, val: () => null })
                  }
              }
          }
        };
      }
    });

    databaseFn.ServerValue = {
      increment: (n) => n,
      TIMESTAMP: 'mock_timestamp'
    };

    const firebaseAdminMock = {
      credential: { cert: () => {} },
      initializeApp: () => {},
      auth: () => ({
        verifyIdToken: mockVerifyIdToken,
        getUser: () => Promise.resolve({ email: 'test@test.com' })
      }),
      database: databaseFn,
      firestore: () => ({
        doc: () => ({ get: () => Promise.resolve({ exists: false }) })
      })
    };

    adminMocks = {
      mockDbRef,
      mockOrderByChild,
      mockStartAt,
      mockLimitToLast
    };

    // FORCE MOCK into require cache
    const firebaseAdminPath = require.resolve('firebase-admin');
    require.cache[firebaseAdminPath] = {
      id: firebaseAdminPath,
      filename: firebaseAdminPath,
      loaded: true,
      exports: firebaseAdminMock
    };

    // Force reload server.js
    const serverPath = require.resolve('../server');
    delete require.cache[serverPath];

    app = require('../server');
  });

  it('should verify OPTIMIZED transaction scan behavior (DoS Fix)', async () => {
    const res = await request(app)
      .post('/api/record-payment')
      .set('Authorization', 'Bearer valid-token')
      .send({
        groupId: 'group1',
        fromMember: 'user1',
        toMember: 'user2',
        amount: 10,
        method: 'cash'
      });

    if (res.status !== 200) {
        console.error('Response Error:', res.body);
    }
    expect(res.status).toBe(200);

    // Verify optimized query happens:
    expect(adminMocks.mockDbRef).toHaveBeenCalledWith('userTransactions/user1');
    expect(adminMocks.mockLimitToLast).toHaveBeenCalledWith(10);

    // Global query should NOT happen
    expect(adminMocks.mockOrderByChild).not.toHaveBeenCalled();
    expect(adminMocks.mockStartAt).not.toHaveBeenCalled();
  });
});
