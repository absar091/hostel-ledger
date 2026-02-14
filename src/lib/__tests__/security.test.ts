import { describe, it, expect } from 'vitest';
import {
  validatePassword,
  validateAmount,
  validateName,
  validatePhone,
  isValidEmail,
  sanitizeInput,
  sanitizeForSQL
} from '../security';

describe('security', () => {
  describe('validatePassword', () => {
    it('should validate a correct password', () => {
      const result = validatePassword('Password123!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail if password is too short', () => {
      const result = validatePassword('Pass1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should fail if password is missing uppercase', () => {
      const result = validatePassword('password123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should fail if password is missing lowercase', () => {
      const result = validatePassword('PASSWORD123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should fail if password is missing number', () => {
      const result = validatePassword('Password!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should fail if password is missing special character', () => {
      const result = validatePassword('Password123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should fail if password is too long', () => {
      const longPassword = 'A'.repeat(129) + '1!';
      const result = validatePassword(longPassword);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be less than 128 characters');
    });

    it('should return multiple errors for multiple violations', () => {
      const result = validatePassword('pass');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
      expect(result.errors).toContain('Password must contain at least one number');
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should handle boundary length (8 characters)', () => {
      const result = validatePassword('Pass123!');
      expect(result.isValid).toBe(true);
    });

    it('should handle boundary length (128 characters)', () => {
      const password = 'P' + 'a'.repeat(125) + '1!';
      expect(password.length).toBe(128);
      const result = validatePassword(password);
      expect(result.isValid).toBe(true);
    });

    it('should accept various special characters', () => {
      const specials = '!@#$%^&*(),.?":{}|<>';
      for (const char of specials) {
        const password = `Pass123${char}`;
        const result = validatePassword(password);
        expect(result.isValid).toBe(true);
      }
    });
  });

  describe('validateAmount', () => {
    it('should validate a correct number', () => {
      const result = validateAmount(100.50);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedAmount).toBe(100.50);
    });

    it('should validate a correct string number', () => {
      const result = validateAmount('100.50');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedAmount).toBe(100.50);
    });

    it('should fail for non-numeric input', () => {
      const result = validateAmount('abc');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Amount must be a valid number');
    });

    it('should fail for zero or negative amount', () => {
      expect(validateAmount(0).isValid).toBe(false);
      expect(validateAmount(-10).isValid).toBe(false);
    });

    it('should fail for amount exceeding limit', () => {
      expect(validateAmount(1000001).isValid).toBe(false);
    });

    it('should round to 2 decimal places', () => {
      const result = validateAmount(10.556);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedAmount).toBe(10.56);
    });
  });

  describe('validateName', () => {
    it('should validate a correct name', () => {
      const result = validateName('John Doe');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedName).toBe('John Doe');
    });

    it('should sanitize input (trim)', () => {
      const result = validateName('  John Doe  ');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedName).toBe('John Doe');
    });

    it('should fail for empty name', () => {
      const result = validateName('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Name is required');
    });

    it('should fail for name too long', () => {
      const result = validateName('a'.repeat(51));
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Name must be less than 50 characters');
    });

    it('should fail for invalid characters', () => {
      const result = validateName('John123');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Name can only contain letters, spaces, hyphens, and apostrophes');
    });

    it('should allow hyphens and apostrophes', () => {
      const result = validateName("O'Connor-Smith");
      expect(result.isValid).toBe(true);
    });
  });

  describe('validatePhone', () => {
    it('should validate a correct phone number', () => {
      const result = validatePhone('1234567890');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedPhone).toBe('1234567890');
    });

    it('should strip non-digits', () => {
      const result = validatePhone('(123) 456-7890');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedPhone).toBe('1234567890');
    });

    it('should allow empty phone (optional)', () => {
      const result = validatePhone('');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedPhone).toBe('');
    });

    it('should fail if phone is too short', () => {
      const result = validatePhone('12345');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Phone number must be between 10 and 15 digits');
    });

    it('should fail if phone is too long', () => {
      const result = validatePhone('1'.repeat(16));
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Phone number must be between 10 and 15 digits');
    });
  });

  describe('isValidEmail', () => {
    it('should return true for valid email', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
    });

    it('should return false for invalid email', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@example')).toBe(false); // Regex requires . something
    });
  });

  describe('sanitizeInput', () => {
    it('should return empty string for non-string input', () => {
      // @ts-ignore
      expect(sanitizeInput(null)).toBe('');
      // @ts-ignore
      expect(sanitizeInput(123)).toBe('');
    });

    it('should escape HTML characters', () => {
      const input = '<script>alert("xss")</script>';
      const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;';
      expect(sanitizeInput(input)).toBe(expected);
    });

    it('should escape single quotes and ampersands', () => {
      const input = "Tom & Jerry's";
      const expected = 'Tom &amp; Jerry&#x27;s';
      expect(sanitizeInput(input)).toBe(expected);
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello');
    });

    it('should truncate long input', () => {
      const input = 'a'.repeat(1001);
      expect(sanitizeInput(input).length).toBe(1000);
    });
  });
});
