import { describe, it, expect } from 'vitest';
import { generateSettlementOptions, DebtSummary, IndividualDebt } from '../debtTracking';

describe('debtTracking', () => {
  describe('generateSettlementOptions', () => {
    const mockDebt = (id: string, title: string, amount: number): IndividualDebt => ({
      id,
      expenseId: 'exp1',
      expenseTitle: title,
      amount,
      date: '2023-01-01',
      createdAt: '2023-01-01T00:00:00Z',
      settled: false
    });

    it('should return an empty array when there are no debts', () => {
      const summary: DebtSummary = {
        youOwe: [],
        theyOwe: [],
        totalYouOwe: 0,
        totalTheyOwe: 0,
        netAmount: 0
      };
      const options = generateSettlementOptions(summary);
      expect(options).toEqual([]);
    });

    it('should return individual options and a pay net option when you owe debts', () => {
      const summary: DebtSummary = {
        youOwe: [
          mockDebt('d1', 'Dinner', 50),
          mockDebt('d2', 'Lunch', 30)
        ],
        theyOwe: [],
        totalYouOwe: 80,
        totalTheyOwe: 0,
        netAmount: -80
      };
      const options = generateSettlementOptions(summary);

      expect(options).toHaveLength(3); // 2 individual + 1 net

      expect(options[0]).toEqual({
        type: 'individual',
        debtId: 'd1',
        amount: 50,
        description: 'Pay Dinner (Rs 50)'
      });

      expect(options[1]).toEqual({
        type: 'individual',
        debtId: 'd2',
        amount: 30,
        description: 'Pay Lunch (Rs 30)'
      });

      expect(options[2]).toEqual({
        type: 'net',
        amount: 80,
        description: 'Pay net amount (Rs 80)'
      });
    });

    it('should return individual options and a collect net option when they owe debts', () => {
      const summary: DebtSummary = {
        youOwe: [],
        theyOwe: [
          mockDebt('d3', 'Movie', 100)
        ],
        totalYouOwe: 0,
        totalTheyOwe: 100,
        netAmount: 100
      };
      const options = generateSettlementOptions(summary);

      expect(options).toHaveLength(2); // 1 individual + 1 net

      expect(options[0]).toEqual({
        type: 'individual',
        debtId: 'd3',
        amount: 100,
        description: 'Collect Movie (Rs 100)'
      });

      expect(options[1]).toEqual({
        type: 'net',
        amount: 100,
        description: 'Collect net amount (Rs 100)'
      });
    });

    it('should return mixed individual options and correct net option when both owe', () => {
      const summary: DebtSummary = {
        youOwe: [mockDebt('d1', 'Dinner', 50)],
        theyOwe: [mockDebt('d3', 'Movie', 120)],
        totalYouOwe: 50,
        totalTheyOwe: 120,
        netAmount: 70
      };
      const options = generateSettlementOptions(summary);

      expect(options).toHaveLength(3); // 2 individual + 1 net

      // youOwe comes first in implementation
      expect(options[0].type).toBe('individual');
      expect(options[0].description).toContain('Pay Dinner');

      expect(options[1].type).toBe('individual');
      expect(options[1].description).toContain('Collect Movie');

      expect(options[2]).toEqual({
        type: 'net',
        amount: 70,
        description: 'Collect net amount (Rs 70)'
      });
    });

    it('should return mixed individual options but no net option when net amount is zero', () => {
      const summary: DebtSummary = {
        youOwe: [mockDebt('d1', 'Dinner', 50)],
        theyOwe: [mockDebt('d3', 'Movie', 50)],
        totalYouOwe: 50,
        totalTheyOwe: 50,
        netAmount: 0
      };
      const options = generateSettlementOptions(summary);

      expect(options).toHaveLength(2); // only 2 individual options
      expect(options.every(opt => opt.type === 'individual')).toBe(true);
      expect(options.find(opt => opt.type === 'net')).toBeUndefined();
    });

    it('should handle negative net amount in mixed debts', () => {
      const summary: DebtSummary = {
        youOwe: [mockDebt('d1', 'Dinner', 150)],
        theyOwe: [mockDebt('d3', 'Movie', 50)],
        totalYouOwe: 150,
        totalTheyOwe: 50,
        netAmount: -100
      };
      const options = generateSettlementOptions(summary);

      expect(options).toHaveLength(3);
      expect(options[2]).toEqual({
        type: 'net',
        amount: 100,
        description: 'Pay net amount (Rs 100)'
      });
    });
  });
});
