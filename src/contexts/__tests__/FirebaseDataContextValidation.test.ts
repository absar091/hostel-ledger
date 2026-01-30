import { describe, it, expect } from 'vitest';
import { validateExpenseData, validatePaymentData, validateAmount } from '@/lib/validation';

describe('Validation Logic', () => {
  describe('validateAmount', () => {
    it('should validate positive amounts', () => {
      expect(validateAmount(100).isValid).toBe(true);
      expect(validateAmount(0.01).isValid).toBe(true);
    });

    it('should reject zero or negative amounts', () => {
      expect(validateAmount(0).isValid).toBe(false);
      expect(validateAmount(-10).isValid).toBe(false);
    });

    it('should reject amounts > 1,000,000', () => {
      expect(validateAmount(1000001).isValid).toBe(false);
    });
  });

  describe('validateExpenseData', () => {
    const validData = {
      groupId: 'group1',
      amount: 100,
      paidBy: 'user1',
      participants: ['user1', 'user2'],
      note: 'Dinner',
      place: 'Restaurant'
    };

    it('should validate correct data', () => {
      const result = validateExpenseData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing groupId', () => {
      const result = validateExpenseData({ ...validData, groupId: '' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Group is required');
    });

    it('should reject invalid amount', () => {
      const result = validateExpenseData({ ...validData, amount: -5 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Amount must be a positive number');
    });

    it('should reject missing payer', () => {
      const result = validateExpenseData({ ...validData, paidBy: '' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Please select who paid');
    });

    it('should reject empty participants', () => {
      const result = validateExpenseData({ ...validData, participants: [] });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Please select at least one participant');
    });

    it('should reject long note', () => {
      const result = validateExpenseData({ ...validData, note: 'a'.repeat(201) });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Note must be less than 200 characters');
    });
  });

  describe('validatePaymentData', () => {
    const validData = {
      groupId: 'group1',
      fromMember: 'user1',
      amount: 50,
      method: 'cash',
      note: 'Refund'
    };

    it('should validate correct data', () => {
      const result = validatePaymentData(validData);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid payment method', () => {
      const result = validatePaymentData({ ...validData, method: 'invalid' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Please select a payment method');
    });
  });
});
