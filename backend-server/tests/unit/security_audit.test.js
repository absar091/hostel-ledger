import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Mocks
// Custom mock to handle chaining and state
// Shared store for DB data
let mockDbData = {};
let mockDbUpdates = []; // Capture updates

const createMockRef = (path) => {
  const refObj = {
    path,
    get: vi.fn(async () => {
        // Simple exact match or prefix match?
        // For now exact match is enough for direct lookups
        // For queries like orderByChild, path is undefined/root usually? No, ref('transactions') has path.
        // But chaining doesn't change path in this simple mock.
        const val = mockDbData[path];
        // Special case for 'transactions' query in record-payment which calls .get()
        if (path === 'transactions') {
             return { exists: () => false, val: () => null }; // Assume no recent duplicates
        }
        return { exists: () => val !== undefined, val: () => val };
    }),
    update: vi.fn(async (updates) => {
        mockDbUpdates.push(updates);
        return null;
    }),
    push: vi.fn().mockReturnValue({ key: 'mock-key', set: vi.fn().mockResolvedValue(null) }),
    set: vi.fn().mockResolvedValue(null),
    orderByChild: vi.fn().mockReturnThis(),
    equalTo: vi.fn().mockReturnThis(),
    startAt: vi.fn().mockReturnThis(),
    once: vi.fn(async () => {
        const val = mockDbData[path];
        return { exists: () => val !== undefined, val: () => val };
    }),
    remove: vi.fn().mockResolvedValue(null)
  };
  // Bind methods to return self for chaining where appropriate
  refObj.orderByChild = vi.fn().mockReturnValue(refObj);
  refObj.equalTo = vi.fn().mockReturnValue(refObj);
  refObj.startAt = vi.fn().mockReturnValue(refObj);
  return refObj;
};

const mockDatabase = {
  ref: vi.fn((path) => createMockRef(path))
};

// Mock database function with static properties
const mockDatabaseFn = () => mockDatabase;
mockDatabaseFn.ServerValue = {
    increment: (val) => ({ ".sv": "increment", "val": val }),
    TIMESTAMP: 1234567890
};

const mockAuth = {
  verifyIdToken: vi.fn().mockResolvedValue({ uid: 'test-user-id', email: 'test@example.com' }),
  getUser: vi.fn().mockResolvedValue({ uid: 'test-user-id', email: 'test@example.com', displayName: 'Test User' }),
  getUserByEmail: vi.fn().mockResolvedValue({ uid: 'test-user-id', email: 'test@example.com' })
};

const mockFirestore = {
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ exists: false, data: () => ({}) })
};

// Set Global Mock for server.js Dependency Injection
const mockAdmin = {
    initializeApp: vi.fn(),
    credential: { cert: vi.fn() },
    auth: () => mockAuth,
    database: mockDatabaseFn,
    firestore: () => mockFirestore
};
// Use global injection to bypass require('firebase-admin')
global.__MOCK_ADMIN__ = mockAdmin;

vi.mock('cloudinary', () => ({
  default: {
    v2: {
      config: vi.fn(),
      uploader: { destroy: vi.fn() }
    }
  }
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-id' }),
      verify: vi.fn().mockResolvedValue(true)
    })
  }
}));

// Mock internal services to avoid side effects
vi.mock('../../services/emailService', () => ({
    sendEmailSafe: vi.fn().mockResolvedValue({ success: true, messageId: 'mock-id' }),
    sendExpenseNotification: vi.fn().mockResolvedValue({ success: true }),
    verifyConnection: vi.fn().mockResolvedValue(true)
}));

vi.mock('../../middleware/adminAuth', () => (req, res, next) => next());

vi.mock('../../utils/email', () => ({
    loadEmailTemplate: vi.fn().mockReturnValue('<html>mock template</html>')
}));

vi.mock('../../utils/imageSecurity', () => ({
    verifyImageOwnership: vi.fn().mockResolvedValue(true)
}));

// Import app AFTER mocks
// We use dynamic import in beforeAll to ensure global.__MOCK_ADMIN__ is set BEFORE server.js evaluates
let app;

describe('Security Audit Tests', () => {
  beforeAll(async () => {
     const module = await import('../../server.js');
     app = module.default;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockDbData = {};
    mockDbUpdates = [];
  });

  const validToken = 'valid-firebase-id-token';

  it('VULNERABILITY 1: add-expense allows negative amounts', async () => {
    // Setup Data
    mockDbData['groups/group123'] = {
        members: [
            { id: 'test-user-id', userId: 'test-user-id', name: 'Test User' },
            { id: 'other-user-id', userId: 'other-user-id', name: 'Other User' }
        ]
    };
    mockDbData['users/test-user-id'] = { walletBalance: 100 };

    const response = await request(app)
      .post('/api/add-expense')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        groupId: 'group123',
        amount: -5000, // Negative Amount Attack
        paidBy: 'test-user-id',
        participants: ['test-user-id', 'other-user-id'],
        note: 'Malicious Expense'
      });

    // Check if the server accepted the request
    if (response.status === 200) {
        console.log('🚨 VULNERABILITY CONFIRMED: add-expense accepted negative amount');
    } else if (response.status === 400) {
        console.log('✅ SECURE: add-expense rejected negative amount');
    }

    // Expect Bad Request (400) - Fix Applied
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/greater than zero/);
  });

  it('VULNERABILITY 2: record-payment allows negative amounts', async () => {
     // Setup Data
     mockDbData['groups/group123'] = {
         members: [
             { id: 'test-user-id', userId: 'test-user-id', name: 'Test User' },
             { id: 'other-user-id', userId: 'other-user-id', name: 'Other User' }
         ]
     };
     mockDbData['users/test-user-id'] = { walletBalance: 100 };

     const response = await request(app)
       .post('/api/record-payment')
       .set('Authorization', `Bearer ${validToken}`)
       .send({
         groupId: 'group123',
         fromMember: 'test-user-id',
         toMember: 'other-user-id',
         amount: -5000, // Negative Amount Attack
         method: 'cash'
       });

     if (response.status === 200) {
         console.log('🚨 VULNERABILITY CONFIRMED: record-payment accepted negative amount');
     } else if (response.status === 400) {
         console.log('✅ SECURE: record-payment rejected negative amount');
     }

     // Expect Bad Request (400) - Fix Applied
     expect(response.status).toBe(400);
     expect(response.body.error).toMatch(/greater than zero/);
   });

   it('VULNERABILITY 3: send-money allows insufficient funds (only checks amount > 0)', async () => {
       // Setup Data
       mockDbData['usernames/recipient'] = { uid: 'recipient-uid' };
       mockDbData['users/test-user-id'] = { name: 'Sender', walletBalance: 100 };
       mockDbData['users/recipient-uid'] = { name: 'Recipient', walletBalance: 0 };

      const response = await request(app)
        .post('/api/send-money')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          recipientUsername: 'recipient',
          amount: 1000 // > 100 (Balance)
        });

      // The send-money endpoint (phase 1) creates a pending transaction.
      // It does NOT check balance at this stage. It only checks amount > 0.
      // This is a design flaw/vulnerability: Users can spam requests they can't fulfill.
      // But the real damage is if it allows the transaction to complete later even if balance is low.

      if (response.status === 200) {
          console.log('🚨 VULNERABILITY CONFIRMED: send-money allowed request exceeding balance');
      } else if (response.status === 400) {
          console.log('✅ SECURE: send-money rejected insufficient funds');
      }

      // Expect Bad Request (400) - Fix Applied
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/Insufficient wallet balance/);
   });

});
