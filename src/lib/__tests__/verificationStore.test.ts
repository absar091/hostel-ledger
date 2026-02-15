import { describe, expect, it } from 'vitest';
import { createVerificationDocId } from '../verificationStore';

describe('createVerificationDocId', () => {
  it('normalizes casing and whitespace', () => {
    const first = createVerificationDocId('  User@Example.com ');
    const second = createVerificationDocId('user@example.com');

    expect(first).toBe(second);
  });

  it('creates distinct ids for different unicode emails', () => {
    const jalapeno = createVerificationDocId('jalapeño@example.com');
    const plain = createVerificationDocId('jalapeno@example.com');

    expect(jalapeno).not.toBe(plain);
  });

  it('returns only alphanumeric characters', () => {
    const docId = createVerificationDocId('test+alias@example.com');

    expect(docId).toMatch(/^[a-zA-Z0-9]+$/);
  });
});
