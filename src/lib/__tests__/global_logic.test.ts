
import { describe, it, expect } from 'vitest';
import { calculateExpenseSplit, calculateGlobalExpenseSettlements } from '../expenseLogic';

describe('calculateGlobalExpenseSettlements', () => {
    it('should calculate debts for all participants regardless of payer', () => {
        const participants = [
            { id: 'A', name: 'User A' },
            { id: 'B', name: 'User B' },
            { id: 'C', name: 'User C' },
        ];
        const amount = 300;
        const payerId = 'B';
        const groupId = 'group1';

        const splits = calculateExpenseSplit(amount, participants, payerId);
        const settlements = calculateGlobalExpenseSettlements(splits, payerId, groupId);

        // Expect: A owes B 100, C owes B 100
        expect(settlements).toHaveLength(2);

        const debtA = settlements.find(s => s.fromId === 'A');
        expect(debtA).toBeDefined();
        expect(debtA?.toId).toBe('B');
        expect(debtA?.amount).toBe(100);

        const debtC = settlements.find(s => s.fromId === 'C');
        expect(debtC).toBeDefined();
        expect(debtC?.toId).toBe('B');
        expect(debtC?.amount).toBe(100);
    });

    it('should handle uneven splits', () => {
         const participants = [
            { id: 'A', name: 'User A' },
            { id: 'B', name: 'User B' },
            { id: 'C', name: 'User C' },
        ];
        const amount = 100; // 33.33, 33.33, 33.34
        const payerId = 'A';
        const groupId = 'group1';

        const splits = calculateExpenseSplit(amount, participants, payerId);
        const settlements = calculateGlobalExpenseSettlements(splits, payerId, groupId);

        expect(settlements).toHaveLength(2);

        // B owes A
        const debtB = settlements.find(s => s.fromId === 'B');
        expect(debtB?.toId).toBe('A');
        expect(debtB?.amount).toBeGreaterThan(33.32);

        // C owes A
        const debtC = settlements.find(s => s.fromId === 'C');
        expect(debtC?.toId).toBe('A');
        expect(debtC?.amount).toBeGreaterThan(33.32);

        const totalDebt = (debtB?.amount || 0) + (debtC?.amount || 0);
        expect(totalDebt).toBeLessThan(100);
    });
});
