import { describe, it, expect } from 'vitest';
import { checkEmailDomain } from '../validation';

describe('checkEmailDomain', () => {
    it('should validate allowed domains', () => {
        expect(checkEmailDomain('user@gmail.com')).toBe(true);
        expect(checkEmailDomain('user@yahoo.com')).toBe(true);
        expect(checkEmailDomain('user@hotmail.com')).toBe(true);
        expect(checkEmailDomain('user@outlook.com')).toBe(true);
        expect(checkEmailDomain('user@edu.pk')).toBe(true);
        expect(checkEmailDomain('user@student.edu.pk')).toBe(true);
        expect(checkEmailDomain('user@pu.edu.pk')).toBe(true);
        expect(checkEmailDomain('user@lums.edu.pk')).toBe(true);
        expect(checkEmailDomain('user@nust.edu.pk')).toBe(true);
        expect(checkEmailDomain('user@comsats.edu.pk')).toBe(true);
        expect(checkEmailDomain('user@fast.edu.pk')).toBe(true);
        expect(checkEmailDomain('user@cuvas.edu.pk')).toBe(true);
    });

    it('should validate subdomains ending with .edu.pk', () => {
        expect(checkEmailDomain('user@sub.edu.pk')).toBe(true);
        expect(checkEmailDomain('user@my.university.edu.pk')).toBe(true);
    });

    it('should handle case insensitivity', () => {
        expect(checkEmailDomain('User@GMAIL.COM')).toBe(true);
        expect(checkEmailDomain('User@Student.Edu.Pk')).toBe(true);
    });

    it('should reject invalid domains', () => {
        expect(checkEmailDomain('user@example.com')).toBe(false);
        expect(checkEmailDomain('user@unknown.org')).toBe(false);
        expect(checkEmailDomain('user@gmail.co')).toBe(false); // Close but invalid
    });

    it('should reject malformed emails', () => {
        expect(checkEmailDomain('invalid-email')).toBe(false);
        expect(checkEmailDomain('')).toBe(false);
        expect(checkEmailDomain('user@')).toBe(false); // Empty domain
    });

    it('should return true for valid domain even with missing local part', () => {
        // Since the function only checks the domain part
        expect(checkEmailDomain('@gmail.com')).toBe(true);
    });
});
