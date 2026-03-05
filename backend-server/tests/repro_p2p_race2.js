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
  },
  'p2p_transactions/tx1/status': 'pending'
};

function getValue(path) {
  if (dbState[path] !== undefined) return dbState[path];
  if (path === 'users/sender1') return { walletBalance: dbState['users/sender1/walletBalance'] };
  if (path === 'users/receiver1') return { walletBalance: dbState['users/receiver1/walletBalance'] };
  return null;
}

function setValue(path, value) {
  dbState[path] = value;
  // Update parent object if updating status directly
  if (path === 'p2p_transactions/tx1/status') {
    dbState['p2p_transactions/tx1'].status = value;
  }
}

function updateValue(path, delta) {
  const current = dbState[path] || 0;
  dbState[path] = current + delta;
}

const mockAdmin = {
  database: () => ({
    ref: (path) => ({
      get: async () => {
        const val = getValue(path);
        return {
          exists: () => val !== null,
          val: () => val
        };
      },
      update: async (updates) => {
        for (const key in updates) {
          const val = updates[key];
          if (val && val.type === 'increment') {
            updateValue(key, val.delta);
          } else {
            setValue(key, val);
          }
        }
      },
      set: async (val) => {
        setValue(path, val);
      },
      transaction: async (updateFunction) => {
        const currentVal = getValue(path);
        const nextVal = updateFunction(currentVal);
        if (nextVal !== undefined) {
          setValue(path, nextVal);
          return { committed: true, snapshot: { val: () => nextVal } };
        } else {
          return { committed: false, snapshot: { val: () => currentVal } };
        }
      }
    }),
    ServerValue: {
      increment: (delta) => ({ type: 'increment', delta })
    }
  })
};

const resMock = {
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  json: function(data) {
    this.data = data;
    return this;
  }
};

async function respondMoneyRequestFixed(transactionId, accept) {
  const db = mockAdmin.database();
  const txRef = db.ref(`p2p_transactions/${transactionId}`);
  const txSnap = await txRef.get();
  const tx = txSnap.val();

  const lockResult = await db.ref(`p2p_transactions/${transactionId}/status`).transaction((currentStatus) => {
    if (currentStatus === 'pending') {
      return 'processing';
    }
    return undefined;
  });

  if (!lockResult.committed) {
    return; // Aborted due to lock
  }

  const updates = {};
  const now = new Date().toISOString();

  if (!accept) {
    updates[`p2p_transactions/${transactionId}/status`] = 'rejected';
    await db.ref().update(updates);
    return;
  }

  const [senderSnap, receiverSnap] = await Promise.all([
    db.ref(`users/${tx.from}`).get(),
    db.ref(`users/${tx.to}`).get()
  ]);

  const sender = senderSnap.val();
  const receiver = receiverSnap.val();
  const amount = Number(tx.amount);

  if ((sender.walletBalance || 0) < amount) {
    await db.ref(`p2p_transactions/${transactionId}/status`).set('pending');
    return;
  }

  await new Promise(resolve => setTimeout(resolve, 50)); // Simulate delay

  updates[`p2p_transactions/${transactionId}/status`] = 'completed';
  updates[`users/${tx.from}/walletBalance`] = mockAdmin.database().ServerValue.increment(-amount);
  updates[`users/${tx.to}/walletBalance`] = mockAdmin.database().ServerValue.increment(amount);

  await db.ref().update(updates);
}

// --- Concurrent Interfering Transaction ---
async function concurrentRequest(transactionId) {
  // Try to process the same transaction while the first one is running
  await new Promise(resolve => setTimeout(resolve, 10)); // start slightly after
  await respondMoneyRequestFixed(transactionId, true);
}

// --- Test Runner ---
async function runTest() {
  dbState['users/sender1/walletBalance'] = 100;
  console.log('Initial Balance:', dbState['users/sender1/walletBalance']);
  console.log('Running concurrent respond-money-request...');

  await Promise.all([
    respondMoneyRequestFixed('tx1', true),
    concurrentRequest('tx1')
  ]);

  console.log('Final Balance:', dbState['users/sender1/walletBalance']);
  if (dbState['users/sender1/walletBalance'] === 90) {
    console.log('✅ Fix Verified! Double charge prevented. (Expected 90, Got 90)');
  } else {
    console.log('❌ Fix Failed. Got ' + dbState['users/sender1/walletBalance']);
  }
}

runTest();
