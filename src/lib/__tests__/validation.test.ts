import { describe, it, expect } from 'vitest';
import { validatePasswordStrength } from '../validation';

describe('validatePasswordStrength', () => {
  it('should return low score for short passwords', () => {
    const result = validatePasswordStrength('short');
    expect(result.isStrong).toBe(false);
    expect(result.feedback).toContain('Use at least 8 characters');
  });

  it('should increase score for length >= 8', () => {
    // "password" length 8, lowercase
    const result = validatePasswordStrength('password');
    // score components: >=8 (+1), lower (+1), no repeat (+1) -> 3
    expect(result.score).toBeGreaterThanOrEqual(1);
    expect(result.feedback).not.toContain('Use at least 8 characters');
    expect(result.feedback).toContain('Consider using 12+ characters for better security');
  });

  it('should increase score for length >= 12', () => {
    // "longpassword" length 12, lowercase
    const result = validatePasswordStrength('longpassword');
    // score components: >=8 (+1), >=12 (+1), lower (+1), no repeat (+1) -> 4
    expect(result.score).toBeGreaterThanOrEqual(2);
    expect(result.feedback).not.toContain('Consider using 12+ characters for better security');
  });

  it('should check for lowercase letters', () => {
    const result = validatePasswordStrength('PASSWORD123!');
    expect(result.feedback).toContain('Include lowercase letters');
  });

  it('should check for uppercase letters', () => {
    const result = validatePasswordStrength('password123!');
    expect(result.feedback).toContain('Include uppercase letters');
  });

  it('should check for numbers', () => {
    const result = validatePasswordStrength('Password!');
    expect(result.feedback).toContain('Include numbers');
  });

  it('should check for special characters', () => {
    const result = validatePasswordStrength('Password123');
    expect(result.feedback).toContain('Include special characters (@$!%*?&)');
  });

  it('should check for repeating characters', () => {
    const result = validatePasswordStrength('aaabbbccc');
    expect(result.feedback).toContain('Avoid repeating characters');

    const resultNoRepeat = validatePasswordStrength('abcde');
    expect(resultNoRepeat.feedback).not.toContain('Avoid repeating characters');
  });

  it('should return strong for a password meeting all criteria', () => {
    const password = 'StrongP@ssw0rd!';
    const result = validatePasswordStrength(password);

    expect(result.score).toBeGreaterThanOrEqual(5);
    expect(result.isStrong).toBe(true);
    expect(result.feedback).toHaveLength(0);
  });

  it('should handle empty string', () => {
    const result = validatePasswordStrength('');
    // Empty string gets +1 for no repeating characters
    expect(result.score).toBe(1);
    expect(result.isStrong).toBe(false);
    expect(result.feedback).toContain('Use at least 8 characters');
  });
});
