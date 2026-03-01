const crypto = require('crypto');
import { test, expect } from 'vitest';

test('crypto random is secure for IDs', () => {
    const id = `member_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    expect(id).toMatch(/^member_[0-9]+_[a-f0-9]{8}$/);
});
