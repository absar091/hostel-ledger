import { describe, it, expect } from 'vitest';
import { validateExpenseData, validatePaymentData } from '../validation';

describe('Validation Logic', () => {
    describe('validateExpenseData', () => {
        it('should validate valid expense data', () => {
            const data = {
                groupId: 'group1',
                amount: 100,
                paidBy: 'user1',
                participants: ['user1', 'user2'],
                note: 'Dinner',
                place: 'Restaurant'
            };
            const result = validateExpenseData(data);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject invalid amount', () => {
             const data = {
                groupId: 'group1',
                amount: -100,
                paidBy: 'user1',
                participants: ['user1'],
                note: '',
                place: ''
            };
            const result = validateExpenseData(data);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Amount must be a positive number');
        });

         it('should reject missing group', () => {
             const data = {
                groupId: '',
                amount: 100,
                paidBy: 'user1',
                participants: ['user1'],
                note: '',
                place: ''
            };
            const result = validateExpenseData(data);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Group is required');
        });

        it('should reject note too long', () => {
             const data = {
                groupId: 'group1',
                amount: 100,
                paidBy: 'user1',
                participants: ['user1'],
                note: 'a'.repeat(201),
                place: ''
            };
            const result = validateExpenseData(data);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Note must be less than 200 characters');
        });
    });

    describe('validatePaymentData', () => {
        it('should validate valid payment data', () => {
            const data = {
                groupId: 'group1',
                fromMember: 'user2',
                amount: 50,
                method: 'cash',
                note: 'Settlement'
            };
            const result = validatePaymentData(data);
            expect(result.isValid).toBe(true);
        });

        it('should reject invalid payment method', () => {
            const data = {
                groupId: 'group1',
                fromMember: 'user2',
                amount: 50,
                method: 'bitcoin',
                note: 'Settlement'
            };
            const result = validatePaymentData(data);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Please select a payment method');
        });
    });
});
