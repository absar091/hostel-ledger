
const assert = require('assert');
const { validateAmount } = require('../utils/validation');

console.log('Testing validateAmount from utils/validation.js:');

function check(amount, expected) {
  const result = validateAmount(amount);
  const status = result === expected ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} | amount: ${JSON.stringify(amount)} (${typeof amount}) -> ${result} (Expected: ${expected})`);
  if (result !== expected) {
    process.exit(1);
  }
}

// Valid cases
check(100, true);
check(0.01, true);
check(999999.99, true);

// Invalid cases
check(0, false);
check(-1, false);
check("100", false);
check("abc", false);
check(NaN, false);
check(Infinity, false);
check(-Infinity, false);
check(null, false);
check(undefined, false);
check({}, false);
check([], false);

console.log('All tests passed!');
