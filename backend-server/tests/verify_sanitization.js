const { sanitize } = require('../utils/sanitize');

console.log("Testing sanitize function...");

const testCases = [
  // HTML stripping (Base functionality)
  { input: "Hello <script>alert(1)</script>", expected: "Hello" },
  { input: "<b>Bold</b>", expected: "Bold" },
  { input: "  Trim Me  ", expected: "Trim Me" },

  // Type Coercion (New functionality)
  { input: 123, expected: "123" },
  { input: true, expected: "true" },
  { input: false, expected: "false" },

  // Type Rejection (Security Fix)
  { input: { evil: "object" }, expected: "" },
  { input: ["array"], expected: "" },
  { input: null, expected: "" },
  { input: undefined, expected: "" }
];

let failed = false;

testCases.forEach(({ input, expected }, index) => {
  const result = sanitize(input);

  if (result !== expected) {
    console.error(`❌ Test ${index + 1} Failed!`);
    console.error(`   Input:    ${JSON.stringify(input)}`);
    console.error(`   Expected: "${expected}"`);
    console.error(`   Actual:   "${result}"`);
    failed = true;
  } else {
    console.log(`✅ Test ${index + 1} Passed`);
  }
});

if (failed) {
  console.error("\n❌ Sanitization tests FAILED.");
  process.exit(1);
} else {
  console.log("\n✅ All sanitization tests passed.");
  process.exit(0);
}
