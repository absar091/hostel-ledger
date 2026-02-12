
const assert = require('assert');

// Mock data
const groupId = 'group123';
const paidBy = 'userC'; // C pays
const participants = ['userA', 'userB', 'userC'];
const amount = 300; // 300 total, 100 each

// Mock Group
const group = {
  members: [
    { id: 'userA', userId: 'uidA' },
    { id: 'userB', userId: 'uidB' },
    { id: 'userC', userId: 'uidC' }
  ]
};

// Mock Settlements Map (Initial State)
// userA has no settlements
// userB owes userC 50 already
const settlementsMap = {
  'uidA': {},
  'uidB': {
    'userC': { toReceive: 0, toPay: 50 }
  },
  'uidC': {
    'userB': { toReceive: 50, toPay: 0 }
  }
};

// Helper from server.js
const getStorageKey = (memberId) => {
  const m = group.members.find(mem => mem.id === memberId);
  return (m && m.userId) ? m.userId : memberId;
};

// Mock calculateExpenseSettlements (Logic assumed correct from server.js/logic.test.ts)
const debts = [
  { debtorId: 'userA', creditorId: 'userC', amount: 100 },
  { debtorId: 'userB', creditorId: 'userC', amount: 100 }
];

// --- The Logic Under Test ---
const updates = {};

for (const debt of debts) {
  const { debtorId, creditorId, amount } = debt;

  // We need to update two relationships:
  // 1. Creditor -> Debtor (Creditor expects to receive)
  // 2. Debtor -> Creditor (Debtor expects to pay)

  const creditorStorageKey = getStorageKey(creditorId);
  const debtorStorageKey = getStorageKey(debtorId);

  // --- 1. Update Creditor's View (Creditor -> Debtor) ---
  const creditorSettlements = settlementsMap[creditorStorageKey] || {};
  const creditorVsDebtor = creditorSettlements[debtorId] || { toReceive: 0, toPay: 0 };

  let cNewToReceive = (creditorVsDebtor.toReceive || 0) + amount;
  let cNewToPay = (creditorVsDebtor.toPay || 0);

  // Netting for Creditor
  if (cNewToReceive > 0 && cNewToPay > 0) {
      const min = Math.min(cNewToReceive, cNewToPay);
      cNewToReceive -= min;
      cNewToPay -= min;
  }

  updates[`users/${creditorStorageKey}/settlements/${groupId}/${debtorId}`] = {
      toReceive: cNewToReceive,
      toPay: cNewToPay
  };

  // --- 2. Update Debtor's View (Debtor -> Creditor) ---
  // Mirroring

  updates[`users/${debtorStorageKey}/settlements/${groupId}/${creditorId}`] = {
      toReceive: cNewToPay,
      toPay: cNewToReceive
  };

  // Update the map in memory
  if (!settlementsMap[creditorStorageKey]) settlementsMap[creditorStorageKey] = {};
  settlementsMap[creditorStorageKey][debtorId] = { toReceive: cNewToReceive, toPay: cNewToPay };

  if (!settlementsMap[debtorStorageKey]) settlementsMap[debtorStorageKey] = {};
  settlementsMap[debtorStorageKey][creditorId] = { toReceive: cNewToPay, toPay: cNewToReceive };
}

// --- Verification ---
console.log('Updates generated:', JSON.stringify(updates, null, 2));

// Check A -> C (New Debt)
// A owes C 100.
// C (Creditor) View: toReceive 100
assert.deepStrictEqual(updates[`users/uidC/settlements/${groupId}/userA`], { toReceive: 100, toPay: 0 }, 'C should expect 100 from A');
// A (Debtor) View: toPay 100
assert.deepStrictEqual(updates[`users/uidA/settlements/${groupId}/userC`], { toReceive: 0, toPay: 100 }, 'A should owe 100 to C');

// Check B -> C (Accumulated Debt)
// B already owed 50. New debt 100. Total 150.
// C (Creditor) View: toReceive 150
assert.deepStrictEqual(updates[`users/uidC/settlements/${groupId}/userB`], { toReceive: 150, toPay: 0 }, 'C should expect 150 from B');
// B (Debtor) View: toPay 150
assert.deepStrictEqual(updates[`users/uidB/settlements/${groupId}/userC`], { toReceive: 0, toPay: 150 }, 'B should owe 150 to C');

console.log('✅ Verification passed: Third-party debts and accumulated debts handled correctly.');
