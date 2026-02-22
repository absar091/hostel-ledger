const adminAuth = require('../middleware/adminAuth');

// Mock helpers
const createMockReq = (headers = {}) => ({
  headers,
  ip: '127.0.0.1'
});

const createMockRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  return res;
};

const createMockNext = () => {
  let called = false;
  const next = () => { called = true; };
  next.isCalled = () => called;
  return next;
};

// Test Runner
const runTests = () => {
  let passed = 0;
  let failed = 0;

  console.log('🧪 Starting Admin Auth Middleware Tests...\n');

  // Scenario 1: No ADMIN_API_KEY in env
  process.env.ADMIN_API_KEY = '';
  try {
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    // Silence error log for this expected error
    const originalError = console.error;
    console.error = () => {};
    adminAuth(req, res, next);
    console.error = originalError;

    if (res.statusCode === 500 && res.body.error === 'Server configuration error') {
      console.log('✅ Scenario 1 Passed: Returns 500 when ADMIN_API_KEY missing');
      passed++;
    } else {
      console.error('❌ Scenario 1 Failed');
      failed++;
    }
  } catch (e) {
    console.error('❌ Scenario 1 Exception:', e);
    failed++;
  }

  // Set env key for remaining tests
  process.env.ADMIN_API_KEY = 'secret-key-123';

  // Scenario 2: No x-admin-key header
  try {
    const req = createMockReq({});
    const res = createMockRes();
    const next = createMockNext();

    // Silence warn log
    const originalWarn = console.warn;
    console.warn = () => {};
    adminAuth(req, res, next);
    console.warn = originalWarn;

    if (res.statusCode === 401 && res.body.error === 'Unauthorized: Invalid or missing admin key') {
      console.log('✅ Scenario 2 Passed: Returns 401 when header missing');
      passed++;
    } else {
      console.error('❌ Scenario 2 Failed');
      failed++;
    }
  } catch (e) {
    console.error('❌ Scenario 2 Exception:', e);
    failed++;
  }

  // Scenario 3: Invalid x-admin-key header
  try {
    const req = createMockReq({ 'x-admin-key': 'wrong-key' });
    const res = createMockRes();
    const next = createMockNext();

    // Silence warn log
    const originalWarn = console.warn;
    console.warn = () => {};
    adminAuth(req, res, next);
    console.warn = originalWarn;

    if (res.statusCode === 401 && res.body.error === 'Unauthorized: Invalid or missing admin key') {
      console.log('✅ Scenario 3 Passed: Returns 401 when key is invalid');
      passed++;
    } else {
      console.error('❌ Scenario 3 Failed');
      failed++;
    }
  } catch (e) {
    console.error('❌ Scenario 3 Exception:', e);
    failed++;
  }

  // Scenario 4: Valid x-admin-key header (Single Key)
  try {
    const req = createMockReq({ 'x-admin-key': 'secret-key-123' });
    const res = createMockRes();
    const next = createMockNext();

    adminAuth(req, res, next);

    if (next.isCalled() && !res.statusCode) {
      console.log('✅ Scenario 4 Passed: Calls next() when single key is valid');
      passed++;
    } else {
      console.error('❌ Scenario 4 Failed');
      failed++;
    }
  } catch (e) {
    console.error('❌ Scenario 4 Exception:', e);
    failed++;
  }

  // Scenario 5: Multiple Valid Keys (Comma Separated)
  process.env.ADMIN_API_KEY = 'key1, key2, key3';

  // Test key1
  try {
    const req = createMockReq({ 'x-admin-key': 'key1' });
    const res = createMockRes();
    const next = createMockNext();

    adminAuth(req, res, next);

    if (next.isCalled() && !res.statusCode) {
      console.log('✅ Scenario 5a Passed: Calls next() when first key in list is valid');
      passed++;
    } else {
      console.error('❌ Scenario 5a Failed');
      failed++;
    }
  } catch (e) {
    console.error('❌ Scenario 5a Exception:', e);
    failed++;
  }

  // Test key2 (trim check)
  try {
    const req = createMockReq({ 'x-admin-key': 'key2' });
    const res = createMockRes();
    const next = createMockNext();

    adminAuth(req, res, next);

    if (next.isCalled() && !res.statusCode) {
      console.log('✅ Scenario 5b Passed: Calls next() when second key (trimmed) is valid');
      passed++;
    } else {
      console.error('❌ Scenario 5b Failed');
      failed++;
    }
  } catch (e) {
    console.error('❌ Scenario 5b Exception:', e);
    failed++;
  }

  // Test invalid key against multiple list
  try {
    const req = createMockReq({ 'x-admin-key': 'key4' });
    const res = createMockRes();
    const next = createMockNext();

    const originalWarn = console.warn;
    console.warn = () => {};
    adminAuth(req, res, next);
    console.warn = originalWarn;

    if (res.statusCode === 401) {
      console.log('✅ Scenario 5c Passed: Returns 401 when key is not in list');
      passed++;
    } else {
      console.error('❌ Scenario 5c Failed');
      failed++;
    }
  } catch (e) {
    console.error('❌ Scenario 5c Exception:', e);
    failed++;
  }

  console.log(`\n🎉 Summary: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) process.exit(1);
};

runTests();
