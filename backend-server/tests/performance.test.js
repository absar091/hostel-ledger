import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const proxyquire = require('proxyquire').noPreserveCache();

// Spies
const rootUpdateSpy = vi.fn().mockResolvedValue(true);
const removeSpy = vi.fn().mockResolvedValue(true);
const migrationSetSpy = vi.fn().mockResolvedValue(true);

// 1. Define Mocks
const mockDb = {
  ref: vi.fn(),
  orderByKey: vi.fn(),
  startAt: vi.fn(),
  limitToFirst: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  push: vi.fn(),
  set: vi.fn(),
  child: vi.fn(),
};

const mockQuery = {
  startAt: vi.fn().mockReturnThis(),
  limitToFirst: vi.fn().mockReturnThis(),
  get: vi.fn(),
};

// 2. Setup mock implementations
let queryData = {};
const generateGroups = (count) => {
  queryData = {};
  for (let i = 0; i < count; i++) {
    const id = `group_${i.toString().padStart(4, '0')}`;
    queryData[id] = {
      id,
      name: `Group ${i}`,
      members: [
        { id: 'm1', name: 'User 1', isTemporary: false }
      ]
    };
  }
};

mockQuery.get.mockImplementation(async function() {
  const startAtCalls = mockQuery.startAt.mock.calls;
  const limitCalls = mockQuery.limitToFirst.mock.calls;

  const lastStartAtCall = startAtCalls.length > 0 ? startAtCalls[startAtCalls.length - 1] : null;
  const lastLimitCall = limitCalls.length > 0 ? limitCalls[limitCalls.length - 1] : null;

  const startKey = lastStartAtCall ? lastStartAtCall[0] : null;
  const limit = lastLimitCall ? lastLimitCall[0] : 100;

  const allKeys = Object.keys(queryData).sort();
  let startIndex = 0;

  if (startKey) {
    startIndex = allKeys.indexOf(startKey);
  }

  const resultKeys = allKeys.slice(startIndex, startIndex + limit);
  const resultData = {};
  resultKeys.forEach(k => resultData[k] = queryData[k]);

  return {
    exists: () => resultKeys.length > 0,
    val: () => resultData,
    forEach: (callback) => {
      Object.entries(resultData).forEach(([key, val]) => {
        callback({ key, val: () => val });
      });
    }
  };
});

// Mock migration flag state
let migrationFlagState = false;

// Dynamic mock for db.ref
mockDb.ref.mockImplementation((path) => {
  if (!path) {
    return { update: rootUpdateSpy };
  }
  if (path === 'system/migrations/tempMembersIndex') {
    return {
      get: vi.fn().mockResolvedValue({
        exists: () => true,
        val: () => migrationFlagState
      }),
      set: migrationSetSpy
    };
  }
  if (path === 'groups') {
    return {
        orderByKey: vi.fn().mockReturnValue(mockQuery),
        push: vi.fn().mockReturnValue({ key: 'new_group_id', set: vi.fn().mockResolvedValue(true) }),
        get: vi.fn().mockResolvedValue({ exists: () => true, val: () => queryData })
    };
  }
  if (path === 'tempMembers') {
    return {
        orderByKey: vi.fn().mockReturnValue(mockQuery)
    };
  }

  // Specific group logic
  if (path === 'groups/test_group') {
    return {
      get: vi.fn().mockResolvedValue({
        exists: () => true,
        val: () => ({
          name: 'Test Group',
          members: {
            'mem_1': { email: 'test@example.com', type: 'manual', name: 'Manual' }
          }
        })
      })
    };
  }
  if (path === 'groups/test_group/members/mem_1') {
    return {
      update: vi.fn().mockResolvedValue(true)
    };
  }
  if (path === 'tempMembers/test_group/mem_1') {
    return {
      remove: removeSpy
    };
  }

  return {
    orderByKey: vi.fn().mockReturnValue(mockQuery),
    push: vi.fn().mockReturnValue({ key: 'new_group_id', set: vi.fn().mockResolvedValue(true) }),
    update: vi.fn().mockResolvedValue(true),
    child: vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue({ exists: () => true, val: () => ({ name: 'Test User' }) }),
      set: vi.fn().mockResolvedValue(true),
      update: vi.fn().mockResolvedValue(true),
      push: vi.fn().mockReturnValue({ key: 'new_child', set: vi.fn().mockResolvedValue(true) })
    }),
    get: vi.fn().mockResolvedValue({ exists: () => true, val: () => ({ name: 'Test User' }) }),
    set: vi.fn().mockResolvedValue(true),
    remove: removeSpy
  };
});


const mockAuth = {
  verifyIdToken: vi.fn().mockResolvedValue({ uid: 'test_user_id', email: 'test@example.com' }),
  getUser: vi.fn().mockResolvedValue({ email: 'test@example.com' }),
  getUserByEmail: vi.fn().mockResolvedValue({ uid: 'test_user_id' })
};

const mockAdmin = {
  credential: { cert: vi.fn() },
  initializeApp: vi.fn(),
  database: () => mockDb,
  auth: () => mockAuth
};

const mockNodemailer = {
  createTransport: vi.fn().mockReturnValue({
    sendMail: vi.fn().mockResolvedValue({ messageId: 'test' }),
    verify: vi.fn()
  })
};

const mockDotenv = {
  config: vi.fn()
};

process.env.FIREBASE_PRIVATE_KEY = 'test';
process.env.FIREBASE_PROJECT_ID = 'test';
process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';

describe('Performance Benchmark: Cleanup Temp Members', () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.startAt.mockClear();
    mockQuery.limitToFirst.mockClear();
    mockQuery.get.mockClear();
    rootUpdateSpy.mockClear();
    removeSpy.mockClear();
    migrationSetSpy.mockClear();

    process.env.PORT = Math.floor(Math.random() * 10000 + 50000).toString();
    try {
      app = proxyquire('../server.js', {
        'firebase-admin': mockAdmin,
        'nodemailer': mockNodemailer,
        'web-push': {},
        'dotenv': mockDotenv
      });
    } catch (e) {
      console.error("Proxyquire error:", e);
      throw e;
    }
  });

  it('MIGRATION: Runs full scan (O(N)) if flag missing, sets flag', async () => {
    migrationFlagState = false; // Flag missing/false
    generateGroups(1000); // queryData populated with groups

    const response = await request(app)
      .post('/api/cleanup-temp-members')
      .set('Authorization', 'Bearer valid_token')
      .expect(200);

    const fetchCount = mockQuery.get.mock.calls.length;
    console.log(`MIGRATION Fetches: ${fetchCount}`);

    expect(fetchCount).toBeGreaterThanOrEqual(10);
    expect(response.body.migrated).toBe(true);
    expect(migrationSetSpy).toHaveBeenCalledWith(true);
  });

  it('OPTIMIZED: Runs index scan (O(1)) if flag present', async () => {
    migrationFlagState = true; // Flag present/true
    queryData = {}; // tempMembers index is empty

    const response = await request(app)
      .post('/api/cleanup-temp-members')
      .set('Authorization', 'Bearer valid_token')
      .expect(200);

    const fetchCount = mockQuery.get.mock.calls.length;
    console.log(`OPTIMIZED Fetches: ${fetchCount}`);

    expect(fetchCount).toBe(1);
    expect(response.body.migrated).toBeUndefined();
  });

  it('CREATE GROUP: Writes to tempMembers index', async () => {
    migrationFlagState = true;
    const payload = {
      name: 'Test Group',
      members: [
        { name: 'Manual User', type: 'manual' }
      ]
    };

    const response = await request(app)
      .post('/api/create-group')
      .set('Authorization', 'Bearer valid_token')
      .send(payload)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(rootUpdateSpy).toHaveBeenCalled();
    const updateArgs = rootUpdateSpy.mock.calls[0][0];
    const keys = Object.keys(updateArgs);
    const tempMemberKey = keys.find(k => k.startsWith('tempMembers/'));
    expect(tempMemberKey).toBeDefined();
  });

  it('CLAIM INVITE: Removes from tempMembers index', async () => {
    migrationFlagState = true;
    const response = await request(app)
      .post('/api/claim-email-invite')
      .set('Authorization', 'Bearer valid_token')
      .send({ groupId: 'test_group' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(removeSpy).toHaveBeenCalled();
  });
});
