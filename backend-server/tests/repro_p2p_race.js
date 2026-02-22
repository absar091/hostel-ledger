const assert = require('assert');

// --- Mock Database Helper ---
const dbState = {
  'users/sender1/walletBalance': 100,
  'users/receiver1/walletBalance': 0,
  'p2p_transactions/tx1': {
    from: 'sender1',
    to: 'receiver1',
    amount: 10,
    status: 'pending'
  }
};

function getValue(path) {
  // Direct match
  if (dbState[path] !== undefined) return dbState[path];

  // Partial match for user object simulation
  if (path === 'users/sender1') return { walletBalance: dbState['users/sender1/walletBalance'] };
  if (path === 'users/receiver1') return { walletBalance: dbState['users/receiver1/walletBalance'] };

  return null;
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
        // FAST READ for Vulnerable logic (0 latency)
        // This ensures it reads the initial state (100) before concurrent logic writes.
        const val = getValue(path);
        return {
          exists: () => val !== null,
          val: () => val
        };
      },
      update: async (updates) => {
        // Atomic update simulation
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

// --- Vulnerable Function (Simulating respond-money-request BEFORE fix) ---
async function respondMoneyRequestVulnerable(transactionId, accept) {
  const db = mockAdmin.database();
  const txRef = db.ref(`p2p_transactions/${transactionId}`);
  const txSnap = await txRef.get(); // FAST READ
  const tx = txSnap.val();

  if (!accept) return;

  // 1. Get current balances (Read - FAST)
  const [senderSnap, receiverSnap] = await Promise.all([
    db.ref(`users/${tx.from}`).get(),
    db.ref(`users/${tx.to}`).get()
  ]);

  const sender = senderSnap.val();
  const receiver = receiverSnap.val();
  const amount = Number(tx.amount);

  // Simulate processing delay (allows concurrent write to happen)
  await new Promise(resolve => setTimeout(resolve, 50));

  const senderBalanceBefore = sender.walletBalance || 0; // Still 100 because read happened earlier
  const receiverBalanceBefore = receiver.walletBalance || 0;

  // 2. Calculate new balances (In Memory)
  const senderBalanceAfter = senderBalanceBefore - amount; // 100 - 10 = 90
  const receiverBalanceAfter = receiverBalanceBefore + amount;

  // 3. Batched Updates (Write Absolute Values)
  const updates = {};
  updates[`users/${tx.from}/walletBalance`] = senderBalanceAfter; // Writes 90. Overwrites the concurrent -20.
  updates[`users/${tx.to}/walletBalance`] = receiverBalanceAfter;

  await db.ref().update(updates);
}

// --- Concurrent Interfering Transaction (e.g. add-expense) ---
async function concurrentExpense(userId, amount) {
  const db = mockAdmin.database();
  // Uses atomic increment (safe)
  const updates = {};
  updates[`users/${userId}/walletBalance`] = db.ServerValue.increment(-amount);

  // Wait a bit to ensure we write AFTER the vulnerable read but BEFORE the vulnerable write
  await new Promise(resolve => setTimeout(resolve, 10));

  await db.ref().update(updates);
  // Writes at T=10. Balance becomes 80.
}

// --- Fixed Function (Simulating respond-money-request AFTER fix) ---
async function respondMoneyRequestFixed(transactionId, accept) {
  const db = mockAdmin.database();
  const txRef = db.ref(`p2p_transactions/${transactionId}`);
  const txSnap = await txRef.get();
  const tx = txSnap.val();

  if (!accept) return;

  // 1. Get current balances (Read - strictly for check)
  const [senderSnap] = await Promise.all([
    db.ref(`users/${tx.from}`).get()
  ]);

  const sender = senderSnap.val();
  const amount = Number(tx.amount);

  // CHECK: Insufficient funds (New)
  if ((sender.walletBalance || 0) < amount) {
    // throw new Error('Insufficient funds');
    return; // Stop processing
  }

  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 50));

  // 3. Batched Updates (Use Atomic Increment)
  const updates = {};
  updates[`users/${tx.from}/walletBalance`] = db.ServerValue.increment(-amount); // FIXED: Atomic
  updates[`users/${tx.to}/walletBalance`] = db.ServerValue.increment(amount);

  await db.ref().update(updates);
  // Writes at T=50. Balance is 80 - 10 = 70.
}


// --- Test Runner ---
async function runTest() {
  console.log('🧪 Starting P2P Race Condition Test (Lost Update)...\n');

  // Scenario 1: Vulnerable Logic
  dbState['users/sender1/walletBalance'] = 100;
  console.log('Initial Balance:', dbState['users/sender1/walletBalance']);

  console.log('Running concurrent requests (Vulnerable)...');

  // Race them!
  await Promise.all([
    respondMoneyRequestVulnerable('tx1', true),
    concurrentExpense('sender1', 20)
  ]);

  console.log('Final Balance (Vulnerable):', dbState['users/sender1/walletBalance']);

  if (dbState['users/sender1/walletBalance'] === 90) { // 100 - 10 = 90. The 20 was lost.
    console.log('✅ Vulnerability Reproduced! (Expected 70, Got 90)');
    console.log('   -> The concurrent expense of 20 was OVERWRITTEN/LOST.');
  } else if (dbState['users/sender1/walletBalance'] !== 70) {
    console.log('⚠️ Something weird happened. Got ' + dbState['users/sender1/walletBalance']);
  } else {
    console.log('❓ Could not reproduce. Got 70.');
  }

  // Scenario 2: Fixed Logic
  dbState['users/sender1/walletBalance'] = 100;
  console.log('\nInitial Balance:', dbState['users/sender1/walletBalance']);

  console.log('Running concurrent requests (Fixed)...');
  await Promise.all([
    respondMoneyRequestFixed('tx1', true),
    concurrentExpense('sender1', 20)
  ]);

  console.log('Final Balance (Fixed):', dbState['users/sender1/walletBalance']);

  if (dbState['users/sender1/walletBalance'] === 70) {
    console.log('✅ Fix Verified! (Expected 70, Got 70)');
  } else {
    console.log('❌ Fix Failed. Got ' + dbState['users/sender1/walletBalance']);
  }
}

runTest();
