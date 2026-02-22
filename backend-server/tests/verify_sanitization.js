const { sanitize } = require('../utils/sanitize');

const testCases = [
  { input: 'Hello World', expected: 'Hello World', desc: 'Safe string' },
  { input: '<script>alert(1)</script>', expected: '', desc: 'Script tag removal' },
  { input: '<b>Bold</b>', expected: 'Bold', desc: 'HTML tag stripping' },
  { input: '<img src=x onerror=alert(1)>', expected: '', desc: 'Image onerror' },
  { input: 'Hello <script>alert("XSS")</script> World', expected: 'Hello  World', desc: 'Embedded script' },
  { input: '   Trim Me   ', expected: 'Trim Me', desc: 'Whitespace trimming' },
  { input: 123, expected: '123', desc: 'Number converted to string' },
  { input: null, expected: '', desc: 'Null input returns empty string' },
  { input: undefined, expected: '', desc: 'Undefined input returns empty string' },
  { input: { a: 1 }, expected: '', desc: 'Object input rejected' },
  { input: [1, 2], expected: '', desc: 'Array input rejected' },
  { input: true, expected: 'true', desc: 'Boolean converted to string' },
  { input: '<a href="javascript:alert(1)">Click me</a>', expected: 'Click me', desc: 'Javascript href' }
];

let failed = false;

console.log('🛡️ Verifying Sanitization Logic...\n');

testCases.forEach(({ input, expected, desc }) => {
  const result = sanitize(input);
  if (result === expected) {
    console.log(`✅ PASS: ${desc}`);
  } else {
    console.error(`❌ FAIL: ${desc}`);
    console.error(`   Input:    ${JSON.stringify(input)}`);
    console.error(`   Expected: ${JSON.stringify(expected)}`);
    console.error(`   Actual:   ${JSON.stringify(result)}`);
    failed = true;
  }
});

if (failed) {
  console.error('\n❌ Verification Failed');
  process.exit(1);
} else {
  console.log('\n✅ Sanitization verification passed');
  process.exit(0);
}
