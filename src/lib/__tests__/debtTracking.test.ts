import { describe, it, expect } from 'vitest';
import { calculateDebtSummary, createDebtEntries, IndividualDebt } from '../debtTracking';

describe('debtTracking', () => {
    describe('createDebtEntries', () => {
        it('should create debts for participants owing the payer', () => {
            const splits = [
                { participantId: 'user1', amount: 50 }, // Payer
                { participantId: 'user2', amount: 50 }, // Debtor
            ];
            const debts = createDebtEntries(
                'exp1',
                'Lunch',
                '2023-10-27',
                splits,
                'user1', // Payer
                'user2'  // Current User (Debtor)
            );

            expect(debts).toHaveLength(1);
            expect(debts[0].amount).toBe(50); // Positive means I owe them
            expect(debts[0].expenseId).toBe('exp1');
        });

        it('should create debts for payer being owed by others', () => {
            const splits = [
                { participantId: 'user1', amount: 50 }, // Payer
                { participantId: 'user2', amount: 50 }, // Debtor
            ];
            // If I am user1 (payer), for user2 split, user2 owes me.
            const debts = createDebtEntries(
                'exp1',
                'Lunch',
                '2023-10-27',
                splits,
                'user1', // Payer
                'user1'  // Current User (Payer)
            );

            expect(debts).toHaveLength(1);
            expect(debts[0].amount).toBe(-50); // Negative means they owe me
            expect(debts[0].expenseId).toBe('exp1');
        });
    });

    describe('calculateDebtSummary', () => {
        it('should calculate totals correctly', () => {
            const debts: IndividualDebt[] = [
                {
                    id: '1',
                    expenseId: 'exp1',
                    expenseTitle: 'Lunch',
                    amount: 50, // I owe
                    date: '2023-10-27',
                    createdAt: '2023-10-27',
                    settled: false
                },
                {
                    id: '2',
                    expenseId: 'exp2',
                    expenseTitle: 'Dinner',
                    amount: -30, // They owe
                    date: '2023-10-28',
                    createdAt: '2023-10-28',
                    settled: false
                }
            ];

            const summary = calculateDebtSummary({ 'user2': debts }, 'user2');

            expect(summary.totalYouOwe).toBe(50);
            expect(summary.totalTheyOwe).toBe(30);
            expect(summary.netAmount).toBe(-20); // 30 - 50 = -20 (I owe 20)
        });

        it('should handle settled debts', () => {
            const debts: IndividualDebt[] = [
                {
                    id: '1',
                    expenseId: 'exp1',
                    expenseTitle: 'Lunch',
                    amount: 50,
                    date: '2023-10-27',
                    createdAt: '2023-10-27',
                    settled: true // Settled
                }
            ];

            const summary = calculateDebtSummary({ 'user2': debts }, 'user2');

            expect(summary.totalYouOwe).toBe(0);
            expect(summary.totalTheyOwe).toBe(0);
            expect(summary.netAmount).toBe(0);
        });
    });
});
