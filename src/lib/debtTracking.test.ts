import { describe, it, expect } from 'vitest';
import {
  calculateDebtSummary,
  createDebtEntries,
  settleIndividualDebt,
  generateSettlementOptions,
  validateSettlement
} from './debtTracking';

describe('Debt Tracking', () => {
    const mockDebt = {
        id: '1',
        expenseId: 'exp1',
        expenseTitle: 'Lunch',
        amount: 100,
        date: '2023-01-01',
        createdAt: '2023-01-01',
        settled: false
    };

    describe('calculateDebtSummary', () => {
        it('should calculate correct summaries', () => {
            const debts = {
                'person1': [
                    { ...mockDebt, amount: 100 }, // You owe
                    { ...mockDebt, id: '2', amount: -50 } // They owe
                ]
            };
            const summary = calculateDebtSummary(debts, 'person1');

            expect(summary.totalYouOwe).toBe(100);
            expect(summary.totalTheyOwe).toBe(50);
            expect(summary.netAmount).toBe(-50); // They owe 50, you owe 100 -> net you owe 50 (-50)
        });

        it('should handle empty debts', () => {
            const summary = calculateDebtSummary({}, 'person1');
            expect(summary.totalYouOwe).toBe(0);
            expect(summary.totalTheyOwe).toBe(0);
            expect(summary.netAmount).toBe(0);
        });
    });

    describe('createDebtEntries', () => {
        it('should create correct debt entries', () => {
            // Payer: user1
            // Current User: user2
            // Split: user2 owes 50
            const splits = [{ participantId: 'user2', amount: 50 }];

            // Case 1: user2 viewing. user1 paid. user2 owes user1.
            // payerId='user1', currentUserId='user2'
            const debts1 = createDebtEntries('exp1', 'Lunch', '2023-01-01', splits, 'user1', 'user2');
            expect(debts1).toHaveLength(1);
            expect(debts1[0].amount).toBe(50); // Positive means current user owes

            // Case 2: user1 viewing. user1 paid. user2 owes user1.
            // payerId='user1', currentUserId='user1'
            // split is for user2.
            const splits2 = [{ participantId: 'user2', amount: 50 }];
            const debts2 = createDebtEntries('exp1', 'Lunch', '2023-01-01', splits2, 'user1', 'user1');
            expect(debts2).toHaveLength(1);
            expect(debts2[0].amount).toBe(-50); // Negative means they owe current user
        });
    });

    describe('settleIndividualDebt', () => {
        it('should settle debt fully', () => {
            const result = settleIndividualDebt(mockDebt, 100);
            expect(result.settled).toBe(true);
            expect(result.amount).toBe(0);
        });

        it('should settle debt partially', () => {
            const result = settleIndividualDebt(mockDebt, 40);
            expect(result.settled).toBe(false);
            expect(result.amount).toBe(60);
            expect(result.settledAmount).toBe(40);
        });
    });

    describe('generateSettlementOptions', () => {
        it('should generate individual and net options', () => {
            const summary = {
                youOwe: [{ ...mockDebt, amount: 100 }],
                theyOwe: [{ ...mockDebt, id: '2', amount: 50 }], // Note: amount is positive here as per calculateDebtSummary logic (Math.abs)
                totalYouOwe: 100,
                totalTheyOwe: 50,
                netAmount: -50 // You owe 50 net
            };

            const options = generateSettlementOptions(summary);
            // 1 individual you owe
            // 1 individual they owe
            // 1 net option
            expect(options).toHaveLength(3);

            const netOption = options.find(o => o.type === 'net');
            expect(netOption).toBeDefined();
            expect(netOption?.amount).toBe(50);
        });
    });

    describe('validateSettlement', () => {
        const summary = {
                youOwe: [{ ...mockDebt, amount: 100 }],
                theyOwe: [],
                totalYouOwe: 100,
                totalTheyOwe: 0,
                netAmount: -100
        };

        it('should validate valid individual settlement', () => {
             const option = { type: 'individual', debtId: '1', amount: 100, description: '' };
             // @ts-ignore
             const result = validateSettlement(option, summary);
             expect(result.isValid).toBe(true);
        });

        it('should reject invalid amount', () => {
             const option = { type: 'individual', debtId: '1', amount: 150, description: '' };
             // @ts-ignore
             const result = validateSettlement(option, summary);
             expect(result.isValid).toBe(false);
        });

         it('should validate net settlement', () => {
             const option = { type: 'net', amount: 100, description: '' };
             // @ts-ignore
             const result = validateSettlement(option, summary);
             expect(result.isValid).toBe(true);
        });
    });
});
