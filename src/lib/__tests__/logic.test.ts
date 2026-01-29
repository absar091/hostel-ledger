import { describe, it, expect } from 'vitest';
import {
    calculateExpenseSplit,
    validatePaymentAmount,
    calculateExpenseSettlements,
    validateSettlementConsistency,
    netSettlements,
    calculateWalletBalanceAfter
} from '../expenseLogic';
import { validatePaymentData } from '../validation';

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

    describe('calculateExpenseSettlements', () => {
        it('should create settlements where others owe payer', () => {
            const splits = [
                { participantId: '1', participantName: 'Payer', amount: 10, isRemainder: false },
                { participantId: '2', participantName: 'Debtor', amount: 10, isRemainder: false },
            ];
            // Current user is payer (1)
            const updates = calculateExpenseSettlements(splits, '1', '1', 'g1');

            expect(updates).toHaveLength(1);
            expect(updates[0].personId).toBe('2');
            expect(updates[0].toReceiveChange).toBe(10);
        });

        it('should create debt when current user is not payer', () => {
             const splits = [
                { participantId: '1', participantName: 'Payer', amount: 10, isRemainder: false },
                { participantId: '2', participantName: 'Me', amount: 10, isRemainder: false },
            ];
            // Current user is '2', payer is '1'
            const updates = calculateExpenseSettlements(splits, '1', '2', 'g1');

            expect(updates).toHaveLength(1);
            expect(updates[0].personId).toBe('1');
            expect(updates[0].toPayChange).toBe(10);
        });
    });

    describe('validateSettlementConsistency', () => {
        it('should reject self-settlements', () => {
            const settlements = {
                '1': { toReceive: 10, toPay: 0 }
            };
            const result = validateSettlementConsistency(settlements, '1');
            expect(result.isValid).toBe(false);
            expect(result.errors[0]).toContain('cannot have settlements with themselves');
        });

        it('should reject simultaneous positive receive and pay', () => {
             const settlements = {
                '2': { toReceive: 10, toPay: 5 }
            };
            const result = validateSettlementConsistency(settlements, '1');
            expect(result.isValid).toBe(false);
            expect(result.errors[0]).toContain('both receivable and payable');
        });
    });

    describe('netSettlements', () => {
        it('should net mutually offsetting amounts', () => {
            const input = {
                'g1': {
                    'p1': { toReceive: 100, toPay: 40 }
                }
            };
            const result = netSettlements(input);
            expect(result['g1']['p1'].toReceive).toBe(60);
            expect(result['g1']['p1'].toPay).toBe(0);
        });
    });

    describe('calculateWalletBalanceAfter', () => {
        it('should add amount correctly', () => {
            expect(calculateWalletBalanceAfter(100, 'add', 50)).toBe(150);
        });
        it('should deduct amount correctly', () => {
            expect(calculateWalletBalanceAfter(100, 'deduct', 50)).toBe(50);
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

    describe('validatePaymentData', () => {
        it('should validate valid payment data', () => {
            const data = {
                groupId: 'g1',
                fromMember: 'm1',
                toMember: 'm2',
                amount: 100,
                method: 'cash'
            };
            const result = validatePaymentData(data);
            expect(result.isValid).toBe(true);
        });

        it('should require toMember', () => {
            const data = {
                groupId: 'g1',
                fromMember: 'm1',
                toMember: '',
                amount: 100,
                method: 'cash'
            };
            const result = validatePaymentData(data);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Please select who received payment');
        });
    });
});
