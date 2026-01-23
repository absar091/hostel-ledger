import { describe, it, expect } from 'vitest';
import {
  signupSchema,
  validateExpenseData,
  checkEmailDomain,
  validatePasswordStrength
} from './validation';

describe('Validation Logic', () => {
  describe('signupSchema', () => {
    it('should validate a correct signup object', () => {
      const validData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@gmail.com',
        phone: '03001234567',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        dateOfBirth: '2000-01-01',
        university: 'Test Uni',
        hostelName: 'Test Hostel',
        roomNumber: '101',
        termsAccepted: true,
        privacyAccepted: true
      };

      const result = signupSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should fail if passwords do not match', () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@gmail.com',
        password: 'Password123!',
        confirmPassword: 'Password123', // Mismatch
        dateOfBirth: '2000-01-01',
        university: 'Test Uni',
        termsAccepted: true,
        privacyAccepted: true
      };
       const result = signupSchema.safeParse(invalidData);
       expect(result.success).toBe(false);
    });

    it('should fail if age is under 13', () => {
        const today = new Date();
        const tenYearsAgo = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate()).toISOString().split('T')[0];

        const invalidData = {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@gmail.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          dateOfBirth: tenYearsAgo,
          university: 'Test Uni',
          termsAccepted: true,
          privacyAccepted: true
        };
        const result = signupSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });
  });

  describe('validateExpenseData', () => {
    it('should validate correct expense data', () => {
      const validData = {
        groupId: 'group1',
        amount: 100,
        paidBy: 'user1',
        participants: ['user1', 'user2'],
        note: 'Lunch',
        place: 'Cafe'
      };
      const result = validateExpenseData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail if amount is invalid', () => {
       const invalidData = {
        groupId: 'group1',
        amount: -50,
        paidBy: 'user1',
        participants: ['user1', 'user2'],
        note: 'Lunch',
        place: 'Cafe'
      };
      const result = validateExpenseData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Amount must be a positive number');
    });

    it('should fail if no participants selected', () => {
       const invalidData = {
        groupId: 'group1',
        amount: 100,
        paidBy: 'user1',
        participants: [],
        note: 'Lunch',
        place: 'Cafe'
      };
      const result = validateExpenseData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Please select at least one participant');
    });
  });

  describe('checkEmailDomain', () => {
      it('should allow whitelisted domains', () => {
          expect(checkEmailDomain('test@gmail.com')).toBe(true);
          expect(checkEmailDomain('student@pu.edu.pk')).toBe(true);
      });

      it('should allow .edu.pk subdomains', () => {
          expect(checkEmailDomain('someone@something.edu.pk')).toBe(true);
      });

      it('should reject unknown domains', () => {
          expect(checkEmailDomain('test@unknown.com')).toBe(false);
      });
  });

  describe('validatePasswordStrength', () => {
      it('should identify strong password', () => {
          const result = validatePasswordStrength('StrongP@ss1');
          expect(result.isStrong).toBe(true);
          expect(result.score).toBeGreaterThanOrEqual(5);
      });

      it('should identify weak password', () => {
          const result = validatePasswordStrength('weak');
          expect(result.isStrong).toBe(false);
      });
  });
});
