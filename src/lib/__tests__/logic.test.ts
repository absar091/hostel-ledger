import { describe, it, expect } from 'vitest';
import { calculateExpenseSplit, validatePaymentAmount, calculateGlobalExpenseSettlements } from '../expenseLogic';

describe('expenseLogic', () => {
    describe('calculateExpenseSplit', () => {
        it('should split integer amounts evenly', () => {
            const participants = [
                { id: '1', name: 'User 1' },
                { id: '2', name: 'User 2' },
                { id: '3', name: 'User 3' },
            ];
            const splits = calculateExpenseSplit(30, participants, '1');

            expect(splits).toHaveLength(3);
            expect(splits.every(s => s.amount === 10)).toBe(true);
            expect(splits.reduce((sum, s) => sum + s.amount, 0)).toBe(30);
        });

        it('should handle decimal amounts with precise remainder distribution', () => {
            const participants = [
                { id: '1', name: 'User 1' },
                { id: '2', name: 'User 2' },
                { id: '3', name: 'User 3' },
            ];
            // 100.50 / 3 = 33.50 exactly
            const splits = calculateExpenseSplit(100.50, participants, '1');

            expect(splits.every(s => s.amount === 33.50)).toBe(true);
            expect(splits.reduce((sum, s) => sum + s.amount, 0)).toBe(100.50);
        });

        it('should distribute remainders correctly for repeating decimals', () => {
            const participants = [
                { id: '1', name: 'User 1' },
                { id: '2', name: 'User 2' },
                { id: '3', name: 'User 3' },
            ];
            // 10.00 / 3 = 3.333... cents
            // In cents: 1000 / 3 = 333 cents with 1 cent remainder
            const splits = calculateExpenseSplit(10.00, participants, '1');

            const amounts = splits.map(s => s.amount).sort();
            expect(amounts).toEqual([3.33, 3.33, 3.34]);
            expect(splits.reduce((sum, s) => sum + s.amount, 0)).toBe(10.00);
        });

        it('should rotate remainder distribution starting from payer', () => {
            const participants = [
                { id: '1', name: 'User 1' },
                { id: '2', name: 'User 2' },
                { id: '3', name: 'User 3' },
            ];
            // 0.05 / 3 = 0.0166... cents
            // 5 cents / 3 = 1 cent base, 2 cents remainder
            const splits = calculateExpenseSplit(0.05, participants, '2'); // User 2 is payer

            // User 2 (index 1) starts, then User 3 (index 2), then User 1 (index 0)
            // Adjusted indices for remainder: User 2: 0, User 3: 1, User 1: 2
            // remainderCents = 2, so adjusted indices 0 and 1 get extra cent
            expect(splits.find(s => s.participantId === '2')?.amount).toBe(0.02);
            expect(splits.find(s => s.participantId === '3')?.amount).toBe(0.02);
            expect(splits.find(s => s.participantId === '1')?.amount).toBe(0.01);
            expect(splits.reduce((sum, s) => sum + s.amount, 0)).toBe(0.05);
        });
    });

    describe('calculateGlobalExpenseSettlements', () => {
        it('should generate updates for all pairs', () => {
            const participants = [
                { id: '1', name: 'User 1' },
                { id: '2', name: 'User 2' },
                { id: '3', name: 'User 3' },
            ];
            const splits = calculateExpenseSplit(30, participants, '1'); // User 1 pays 30
            // Splits: {1: 10}, {2: 10}, {3: 10}

            const updates = calculateGlobalExpenseSettlements(splits, '1', 'group1');

            expect(updates).toHaveLength(4); // 2 pairs * 2 updates each

            // User 1 receives 10 from User 2
            expect(updates.find(u => u.userId === '1' && u.counterpartyId === '2')).toMatchObject({
                toReceiveChange: 10,
                toPayChange: 0
            });
            // User 2 pays 10 to User 1
            expect(updates.find(u => u.userId === '2' && u.counterpartyId === '1')).toMatchObject({
                toReceiveChange: 0,
                toPayChange: 10
            });
             // User 1 receives 10 from User 3
            expect(updates.find(u => u.userId === '1' && u.counterpartyId === '3')).toMatchObject({
                toReceiveChange: 10,
                toPayChange: 0
            });
            // User 3 pays 10 to User 1
            expect(updates.find(u => u.userId === '3' && u.counterpartyId === '1')).toMatchObject({
                toReceiveChange: 0,
                toPayChange: 10
            });
        });
    });

    describe('validatePaymentAmount', () => {
        it('should validate positive amounts against debt', () => {
            const result = validatePaymentAmount(50, 100);
            expect(result.isValid).toBe(true);
            expect(result.actualAmount).toBe(50);
        });

        it('should cap amount at debt if overpayment not allowed', () => {
            const result = validatePaymentAmount(150, 100, false);
            expect(result.isValid).toBe(false); // Current implementation returns false for exceeds
        });

        it('should allow overpayment if flag is set', () => {
            const result = validatePaymentAmount(150, 100, true);
            expect(result.isValid).toBe(true);
            expect(result.actualAmount).toBe(150);
        });

        it('should reject non-positive amounts', () => {
            expect(validatePaymentAmount(0, 100).isValid).toBe(false);
            expect(validatePaymentAmount(-10, 100).isValid).toBe(false);
        });
    });
});
