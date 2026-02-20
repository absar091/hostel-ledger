import { describe, it, expect } from 'vitest';
import { checkEmailDomain } from '../validation';

describe('checkEmailDomain', () => {
  it('should allow common email domains', () => {
    const allowed = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    allowed.forEach(domain => {
      expect(checkEmailDomain(`user@${domain}`)).toBe(true);
    });
  });

  it('should allow educational domains', () => {
    const eduDomains = [
      'edu.pk', 'student.edu.pk', 'pu.edu.pk', 'lums.edu.pk',
      'nust.edu.pk', 'comsats.edu.pk', 'fast.edu.pk', 'cuvas.edu.pk'
    ];
    eduDomains.forEach(domain => {
      expect(checkEmailDomain(`student@${domain}`)).toBe(true);
    });
  });

  it('should allow any .edu.pk domain (wildcard)', () => {
    expect(checkEmailDomain('user@unknown.edu.pk')).toBe(true);
    expect(checkEmailDomain('user@sub.student.edu.pk')).toBe(true);
    expect(checkEmailDomain('user@any.edu.pk')).toBe(true);
  });

  it('should reject disallowed domains', () => {
    const disallowed = ['example.com', 'random.org', 'gmail.co', 'yahoo.co.uk'];
    disallowed.forEach(domain => {
      expect(checkEmailDomain(`user@${domain}`)).toBe(false);
    });
  });

  it('should handle case insensitivity', () => {
    expect(checkEmailDomain('USER@GMAIL.COM')).toBe(true);
    expect(checkEmailDomain('User@LUMS.EDU.PK')).toBe(true);
    expect(checkEmailDomain('user@YaHoo.CoM')).toBe(true);
  });

  it('should handle edge cases', () => {
    expect(checkEmailDomain('')).toBe(false);
    expect(checkEmailDomain('invalid-email')).toBe(false);
    expect(checkEmailDomain('user@')).toBe(false);
    expect(checkEmailDomain('@gmail.com')).toBe(true); // Technically valid domain part, though invalid email format
  });
});
