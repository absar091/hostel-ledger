const { validateNote, validatePlace, validateMethod } = require('../../utils/validation');

console.log("Testing validation limits...");

let failed = false;

function expect(actual, expected, message) {
  if (actual !== expected) {
    console.error(`❌ ${message} FAILED!`);
    console.error(`   Expected: "${expected}"`);
    console.error(`   Actual:   "${actual}"`);
    failed = true;
  } else {
    console.log(`✅ ${message} Passed`);
  }
}

// validateNote
expect(validateNote('Valid note'), null, 'validateNote valid');
expect(validateNote('A'.repeat(500)), null, 'validateNote boundary (500)');
expect(validateNote('A'.repeat(501)), 'Note must be 500 characters or less.', 'validateNote exceed');
expect(validateNote(null), null, 'validateNote null');
expect(validateNote(undefined), null, 'validateNote undefined');
expect(validateNote(123), 'Note must be a string.', 'validateNote non-string');

// validatePlace
expect(validatePlace('Valid place'), null, 'validatePlace valid');
expect(validatePlace('A'.repeat(100)), null, 'validatePlace boundary (100)');
expect(validatePlace('A'.repeat(101)), 'Place name must be 100 characters or less.', 'validatePlace exceed');
expect(validatePlace(null), null, 'validatePlace null');
expect(validatePlace(undefined), null, 'validatePlace undefined');

// validateMethod
expect(validateMethod('Cash'), null, 'validateMethod valid');
expect(validateMethod('A'.repeat(50)), null, 'validateMethod boundary (50)');
expect(validateMethod('A'.repeat(51)), 'Payment method must be 50 characters or less.', 'validateMethod exceed');
expect(validateMethod(null), null, 'validateMethod null');
expect(validateMethod(undefined), null, 'validateMethod undefined');

if (failed) {
  console.error("\n❌ Validation limit tests FAILED.");
  process.exit(1);
} else {
  console.log("\n✅ All validation limit tests passed.");
  process.exit(0);
}
