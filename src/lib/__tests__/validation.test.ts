
import { describe, it, expect } from 'vitest';
import {
    validateExpenseData,
    validatePaymentData,
    validateGroupData,
    validateAmount,
    sanitizeString,
    sanitizeAmount
} from '../validation';

describe('Validation Logic', () => {

    describe('validateAmount', () => {
        it('should accept positive numbers', () => {
            expect(validateAmount(100).isValid).toBe(true);
        });

        it('should reject zero', () => {
            const result = validateAmount(0);
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('positive number');
        });

        it('should reject negative numbers', () => {
            const result = validateAmount(-10);
            expect(result.isValid).toBe(false);
        });

        it('should reject amounts > 1,000,000', () => {
            const result = validateAmount(1000001);
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('cannot exceed');
        });
    });

    describe('sanitizeString', () => {
        it('should remove HTML tags', () => {
            expect(sanitizeString('Hello <script>alert(1)</script>')).toBe('Hello scriptalert(1)/script');
        });
        it('should trim whitespace', () => {
            expect(sanitizeString('  hello  ')).toBe('hello');
        });
        it('should truncate to 200 chars', () => {
            const longString = 'a'.repeat(300);
            expect(sanitizeString(longString)).toHaveLength(200);
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

        it('should require groupId', () => {
            const result = validateExpenseData({ ...validData, groupId: '' });
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Group is required');
        });

        it('should require amount > 0', () => {
            const result = validateExpenseData({ ...validData, amount: 0 });
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Amount must be a positive number');
        });

        it('should require paidBy', () => {
            const result = validateExpenseData({ ...validData, paidBy: '' });
            expect(result.isValid).toBe(false);
        });

        it('should require at least one participant', () => {
            const result = validateExpenseData({ ...validData, participants: [] });
            expect(result.isValid).toBe(false);
        });
    });

    describe('validatePaymentData', () => {
        const validData = {
            groupId: 'group1',
            fromMember: 'user1',
            amount: 50,
            method: 'cash',
            note: 'Payment'
        };

        it('should validate correct data', () => {
            const result = validatePaymentData(validData);
            expect(result.isValid).toBe(true);
        });

        it('should validate payment method', () => {
            const result = validatePaymentData({ ...validData, method: 'check' });
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Please select a payment method');
        });
    });

    describe('validateGroupData', () => {
        const validData = {
            name: 'My Group',
            emoji: '🏠',
            members: [{ name: 'User 1' }, { name: 'User 2' }]
        };

        it('should validate correct data', () => {
            const result = validateGroupData(validData);
            expect(result.isValid).toBe(true);
        });

        it('should require group name', () => {
            const result = validateGroupData({ ...validData, name: '' });
            expect(result.isValid).toBe(false);
        });

        it('should check for duplicate names', () => {
            const result = validateGroupData({
                ...validData,
                members: [{ name: 'John' }, { name: 'John' }]
            });
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Member names must be unique');
        });
    });

});
