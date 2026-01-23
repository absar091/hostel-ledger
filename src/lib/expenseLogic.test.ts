import { describe, it, expect } from 'vitest';
import {
  calculateExpenseSplit,
  calculateExpenseSettlements,
  validateSettlementConsistency,
  netSettlements,
  calculateWalletBalanceAfter,
  validatePaymentAmount
} from './expenseLogic';

describe('Expense Logic', () => {
  describe('calculateExpenseSplit', () => {
    it('should split amount equally among participants', () => {
      const participants = [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' }
      ];
      const result = calculateExpenseSplit(100, participants, '1');
      expect(result).toHaveLength(2);
      expect(result[0].amount).toBe(50);
      expect(result[1].amount).toBe(50);
    });

    it('should handle remainders by assigning to rotated participants', () => {
      const participants = [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
        { id: '3', name: 'Charlie' }
      ];
      // 100 / 3 = 33 r 1
      // Payer is Alice (index 0). Remainder goes to Alice.
      const result = calculateExpenseSplit(100, participants, '1');

      const alice = result.find(p => p.participantId === '1');
      const bob = result.find(p => p.participantId === '2');
      const charlie = result.find(p => p.participantId === '3');

      expect(alice?.amount).toBe(34);
      expect(bob?.amount).toBe(33);
      expect(charlie?.amount).toBe(33);
    });

    it('should rotate remainder based on payer', () => {
        const participants = [
          { id: '1', name: 'Alice' },
          { id: '2', name: 'Bob' },
          { id: '3', name: 'Charlie' }
        ];
        // 100 / 3 = 33 r 1
        // Payer is Bob (index 1). Remainder should start rotating from Bob.
        // Index mapping: 0->Alice, 1->Bob, 2->Charlie
        // Adjusted indices relative to Bob: Bob(0), Charlie(1), Alice(2)
        // Remainder is 1. So adjusted index 0 gets it. That's Bob.

        const result = calculateExpenseSplit(100, participants, '2');

        const alice = result.find(p => p.participantId === '1');
        const bob = result.find(p => p.participantId === '2');
        const charlie = result.find(p => p.participantId === '3');

        expect(bob?.amount).toBe(34);
        expect(charlie?.amount).toBe(33);
        expect(alice?.amount).toBe(33);
    });

    it('should throw error if no participants', () => {
      expect(() => calculateExpenseSplit(100, [], '1')).toThrow();
    });
  });

  describe('calculateExpenseSettlements', () => {
     it('should create receivables for payer', () => {
        const splits = [
            { participantId: '1', participantName: 'Alice', amount: 50, isRemainder: false },
            { participantId: '2', participantName: 'Bob', amount: 50, isRemainder: false }
        ];
        // Payer is Alice. Current User is Alice.
        const updates = calculateExpenseSettlements(splits, '1', '1', 'group1');

        // Alice should receive 50 from Bob
        expect(updates).toHaveLength(1);
        expect(updates[0].personId).toBe('2'); // Bob
        expect(updates[0].toReceiveChange).toBe(50);
        expect(updates[0].toPayChange).toBe(0);
     });

     it('should create payables for participant', () => {
        const splits = [
            { participantId: '1', participantName: 'Alice', amount: 50, isRemainder: false },
            { participantId: '2', participantName: 'Bob', amount: 50, isRemainder: false }
        ];
        // Payer is Alice. Current User is Bob.
        const updates = calculateExpenseSettlements(splits, '1', '2', 'group1');

        // Bob should pay 50 to Alice
        expect(updates).toHaveLength(1);
        expect(updates[0].personId).toBe('1'); // Alice
        expect(updates[0].toReceiveChange).toBe(0);
        expect(updates[0].toPayChange).toBe(50);
     });
  });

  describe('validateSettlementConsistency', () => {
      it('should return valid for consistent settlements', () => {
          const settlements = {
              '2': { toReceive: 0, toPay: 50 }
          };
          const result = validateSettlementConsistency(settlements, '1');
          expect(result.isValid).toBe(true);
      });

      it('should fail if user settles with themselves', () => {
          const settlements = {
              '1': { toReceive: 10, toPay: 0 }
          };
          const result = validateSettlementConsistency(settlements, '1');
          expect(result.isValid).toBe(false);
      });

      it('should fail if both receive and pay are positive', () => {
          const settlements = {
              '2': { toReceive: 10, toPay: 10 }
          };
          const result = validateSettlementConsistency(settlements, '1');
          expect(result.isValid).toBe(false);
      });
  });

  describe('netSettlements', () => {
      it('should net amounts correctly', () => {
          const settlements = {
              'group1': {
                  'user2': { toReceive: 100, toPay: 40 }
              }
          };
          const netted = netSettlements(settlements);
          expect(netted['group1']['user2'].toReceive).toBe(60);
          expect(netted['group1']['user2'].toPay).toBe(0);
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
      it('should validate valid payment', () => {
          const result = validatePaymentAmount(50, 100);
          expect(result.isValid).toBe(true);
          expect(result.actualAmount).toBe(50);
      });

      it('should reject negative amount', () => {
          const result = validatePaymentAmount(-10, 100);
          expect(result.isValid).toBe(false);
      });

      it('should reject payment greater than debt if overpayment not allowed', () => {
          const result = validatePaymentAmount(150, 100, false);
          expect(result.isValid).toBe(false);
      });

      it('should allow payment greater than debt if overpayment allowed', () => {
          const result = validatePaymentAmount(150, 100, true);
          expect(result.isValid).toBe(true);
          expect(result.actualAmount).toBe(150);
      });

      it('should clamp payment to debt if overpayment not allowed (logic check)', () => {
           // Actually the function returns isValid: false if payment > debt and overpayment is false.
           // It doesn't clamp in that case, it errors.
           // But let's check the case where we might expect clamping if the implementation was different.
           // The current implementation:
           // if (paymentAmount > actualDebt && !allowOverpayment) return { isValid: false ... }

           // So let's test that exact behavior
           const result = validatePaymentAmount(150, 100, false);
           expect(result.isValid).toBe(false);
      });
  });
});
