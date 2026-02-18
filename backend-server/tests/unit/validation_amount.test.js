import { describe, it, expect } from 'vitest';
import { validateAmount } from '../../utils/validation';

describe('validateAmount', () => {
  it('should pass with valid positive integer', () => {
    expect(validateAmount(100)).toBeNull();
  });

  it('should pass with valid positive float', () => {
    expect(validateAmount(99.99)).toBeNull();
  });

  it('should pass with valid numeric string', () => {
    expect(validateAmount('50')).toBeNull();
  });

  it('should fail if amount is missing', () => {
    expect(validateAmount(undefined)).toBe('Amount is required.');
    expect(validateAmount(null)).toBe('Amount is required.');
  });

  it('should fail if amount is not a valid number (string)', () => {
    expect(validateAmount('abc')).toBe('Amount must be a valid number.');
  });

  it('should fail if amount is NaN', () => {
    expect(validateAmount(NaN)).toBe('Amount must be a valid number.');
  });

  it('should fail if amount is Infinity', () => {
    expect(validateAmount(Infinity)).toBe('Amount must be a finite number.');
  });

  it('should fail if amount is zero', () => {
    expect(validateAmount(0)).toBe('Amount must be greater than 0.');
    expect(validateAmount('0')).toBe('Amount must be greater than 0.');
  });

  it('should fail if amount is negative', () => {
    expect(validateAmount(-10)).toBe('Amount must be greater than 0.');
    expect(validateAmount('-5')).toBe('Amount must be greater than 0.');
  });

  it('should fail if amount exceeds limit', () => {
    expect(validateAmount(10000001)).toBe('Amount exceeds maximum limit (10,000,000).');
  });

  it('should pass if amount is exactly limit', () => {
    expect(validateAmount(10000000)).toBeNull();
  });
});
