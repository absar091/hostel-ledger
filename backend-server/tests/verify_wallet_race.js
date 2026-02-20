const assert = require('assert');

// --- Mock Database Helper ---
const dbState = {
  'users/user1/walletBalance': 100,
  'users/user1': { name: 'User 1', email: 'user1@test.com' }, // Partial object for user
  'groups/group1': {
     name: 'Test Group',
     members: [
       { id: 'user1', userId: 'user1', name: 'User 1' },
       { id: 'user2', userId: 'user2', name: 'User 2' }
     ]
  }
};

function getValue(path) {
  // Special handling for user object to merge walletBalance
  if (path === 'users/user1') {
    return {
      ...dbState['users/user1'],
      walletBalance: dbState['users/user1/walletBalance']
    };
  }

  // Direct match
  return dbState[path];
}

function setValue(path, value) {
  dbState[path] = value;
}

function updateValue(path, delta) {
  const current = dbState[path] || 0;
  dbState[path] = current + delta;
}

const mockAdmin = {
  database: () => ({
    ref: (path) => ({
      get: async () => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 20)); // Random delay for concurrency
        const val = getValue(path);
        return {
          exists: () => val !== undefined,
          val: () => val
        };
      },
      push: () => ({ key: 'tx_' + Math.random() }),
      update: async (updates) => {
        // Atomic update simulation
        // In a real DB, these happen "at once". In mock, we apply them sequentially but synchronized.
        for (const key in updates) {
          const val = updates[key];
          if (val && val.type === 'increment') {
            updateValue(key, val.delta);
          } else {
            setValue(key, val);
          }
        }
      }
    }),
    ServerValue: {
      increment: (delta) => ({ type: 'increment', delta })
    }
  })
};

// --- Logic from server.js ---
function normalizeMembers(members) {
  if (!members) return [];
  if (Array.isArray(members)) return members;
  return Object.entries(members).map(([key, value]) => ({
    ...value,
    id: value.id || key
  }));
}

const calculateExpenseSplit = (totalAmount, participants, payerId) => {
  if (!participants || participants.length === 0) return [];
  // Simplified for test
  return participants.map(p => ({
    participantId: p.id,
    amount: totalAmount / participants.length
  }));
};

const calculateExpenseSettlements = (splits, payerId) => []; // Simplified

// --- Vulnerable/Fixed Function ---
async function addExpense(req, res, useFix) {
  const { groupId, amount, paidBy, participants } = req.body;
  const currentUserId = req.user.uid;
  const db = mockAdmin.database();

  const [groupSnap, userSnap] = await Promise.all([
    db.ref(`groups/${groupId}`).get(),
    db.ref(`users/${currentUserId}`).get()
  ]);

  const user = userSnap.val();
  const updates = {};

  // Simulate async operation (e.g. member hydration) which yields control
  // This allows the race condition to manifest in a single-threaded Node.js environment
  await new Promise(resolve => setTimeout(resolve, 10));

  const isCurrentUserPayer = paidBy === currentUserId;

  if (isCurrentUserPayer) {
    if (useFix) {
       // FIXED
       if ((user.walletBalance || 0) < amount) {
         // return res.status(400)... but we continue for race test unless strict
       }
       updates[`users/${currentUserId}/walletBalance`] = db.ServerValue.increment(-amount);
    } else {
      // VULNERABLE
      let walletBalanceAfter = user.walletBalance || 0;
      if ((user.walletBalance || 0) < amount) {
         // check
      }
      walletBalanceAfter -= amount;
      updates[`users/${currentUserId}/walletBalance`] = walletBalanceAfter;
    }
  }

  await db.ref().update(updates);
}

// --- Test Runner ---
async function runTest() {
  console.log('🧪 Starting Wallet Race Condition Test...\n');

  // Scenario 1: Vulnerable
  dbState['users/user1/walletBalance'] = 100;
  console.log('Initial Balance:', dbState['users/user1/walletBalance']);

  const req1 = { body: { groupId: 'group1', amount: 10, paidBy: 'user1', participants: ['user1'] }, user: { uid: 'user1' } };
  const req2 = { body: { groupId: 'group1', amount: 20, paidBy: 'user1', participants: ['user1'] }, user: { uid: 'user1' } };
  const res = { status: () => ({ json: () => {} }), json: () => {} };

  console.log('Running concurrent requests (Vulnerable)...');
  await Promise.all([
    addExpense(req1, res, false),
    addExpense(req2, res, false)
  ]);

  console.log('Final Balance (Vulnerable):', dbState['users/user1/walletBalance']);

  if (dbState['users/user1/walletBalance'] !== 70) {
    console.log('✅ Vulnerability Reproduced! (Expected 70, Got ' + dbState['users/user1/walletBalance'] + ')');
  } else {
    console.log('❓ Could not reproduce. Got 70.');
  }

  // Scenario 2: Fixed
  dbState['users/user1/walletBalance'] = 100;
  console.log('\nInitial Balance:', dbState['users/user1/walletBalance']);

  console.log('Running concurrent requests (Fixed)...');
  await Promise.all([
    addExpense(req1, res, true),
    addExpense(req2, res, true)
  ]);

  console.log('Final Balance (Fixed):', dbState['users/user1/walletBalance']);

  if (dbState['users/user1/walletBalance'] === 70) {
    console.log('✅ Fix Verified! (Expected 70, Got 70)');
  } else {
    console.log('❌ Fix Failed. Got ' + dbState['users/user1/walletBalance']);
  }
}

runTest();
