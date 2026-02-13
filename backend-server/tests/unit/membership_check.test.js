
// Mock normalizeMembers from server.js
function normalizeMembers(members) {
  if (!members) return [];
  if (Array.isArray(members)) return members;
  return Object.entries(members).map(([key, value]) => ({
    ...value,
    id: value.id || key // Use stored id if present, otherwise the Firebase key
  }));
}

// Mock test scenarios
const scenarios = [
  {
    name: 'Sender is a member (Array format)',
    members: [
      { id: 'user1', userId: 'uid_user1' },
      { id: 'user2', userId: 'uid_user2' }
    ],
    senderUid: 'uid_user1',
    expected: true
  },
  {
    name: 'Sender is NOT a member (Array format)',
    members: [
      { id: 'user1', userId: 'uid_user1' },
      { id: 'user2', userId: 'uid_user2' }
    ],
    senderUid: 'uid_user3',
    expected: false
  },
  {
    name: 'Sender is a member (Object format)',
    members: {
      'member1': { userId: 'uid_user1' },
      'member2': { userId: 'uid_user2' }
    },
    senderUid: 'uid_user2',
    expected: true
  },
  {
    name: 'Sender is NOT a member (Object format)',
    members: {
      'member1': { userId: 'uid_user1' },
      'member2': { userId: 'uid_user2' }
    },
    senderUid: 'uid_user3',
    expected: false
  },
  {
    name: 'Sender created a temporary member but is NOT a member themselves (Should fail)',
    members: [
      { id: 'temp1', isTemporary: true, createdBy: 'uid_user3' } // sender created this
    ],
    senderUid: 'uid_user3',
    expected: false // The new logic should return false
  },
  {
    name: 'Sender is member AND created a temporary member (Should pass)',
    members: [
      { id: 'user3', userId: 'uid_user3' },
      { id: 'temp1', isTemporary: true, createdBy: 'uid_user3' }
    ],
    senderUid: 'uid_user3',
    expected: true
  }
];

let passed = 0;
let failed = 0;

scenarios.forEach(scenario => {
  const normalized = normalizeMembers(scenario.members);

  // The logic we want to implement: strict check on userId
  const isSenderMember = normalized.some(m => m.userId === scenario.senderUid);

  if (isSenderMember === scenario.expected) {
    console.log(`✅ Passed: ${scenario.name}`);
    passed++;
  } else {
    console.error(`❌ Failed: ${scenario.name}`);
    console.error(`   Expected: ${scenario.expected}, Got: ${isSenderMember}`);
    console.error('   Members:', JSON.stringify(normalized, null, 2));
    failed++;
  }
});

console.log(`\nTest Summary: ${passed} passed, ${failed} failed.`);

if (failed > 0) {
  process.exit(1);
}
