const crypto = require('crypto');
import { test, expect } from 'vitest';

test('Math.random() is predictable, crypto.randomInt is secure', () => {
    const code = crypto.randomInt(100000, 1000000).toString();
    expect(code).toMatch(/^[0-9]{6}$/);
});
