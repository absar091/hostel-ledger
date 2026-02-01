import { describe, it, expect } from 'vitest';
import { calculateExpenseSettlements, ExpenseSplit } from '../expenseLogic';

describe('calculateExpenseSettlements', () => {
  const groupId = 'group1';
  const userA = 'userA';
  const userB = 'userB';
  const userC = 'userC';

  it('should return settlements for all participants when payer is not current user', () => {
    // Scenario: User B pays 300. Participants are A, B, C.
    // Split is 100 each.
    // User A owes B 100.
    // User C owes B 100.
    // Current User is A (but the function no longer cares about current user).

    const splits: ExpenseSplit[] = [
      { participantId: userA, participantName: 'User A', amount: 100, isRemainder: false },
      { participantId: userB, participantName: 'User B', amount: 100, isRemainder: false },
      { participantId: userC, participantName: 'User C', amount: 100, isRemainder: false }
    ];

    // New signature: (splits, payerId, groupId)
    const updates = calculateExpenseSettlements(splits, userB, groupId);

    // It should return:
    // 1. A owes B 100
    // 2. C owes B 100

    expect(updates).toHaveLength(2);

    const aOwesB = updates.find(u => u.debtorId === userA);
    expect(aOwesB).toBeDefined();
    expect(aOwesB?.creditorId).toBe(userB);
    expect(aOwesB?.amount).toBe(100);

    const cOwesB = updates.find(u => u.debtorId === userC);
    expect(cOwesB).toBeDefined();
    expect(cOwesB?.creditorId).toBe(userB);
    expect(cOwesB?.amount).toBe(100);
  });

  it('should return correct settlements when payer is not a participant', () => {
     // Scenario: User D pays 300 for A, B, C.
     const userD = 'userD';
     const splits: ExpenseSplit[] = [
      { participantId: userA, participantName: 'User A', amount: 100, isRemainder: false },
      { participantId: userB, participantName: 'User B', amount: 100, isRemainder: false },
      { participantId: userC, participantName: 'User C', amount: 100, isRemainder: false }
    ];

    const updates = calculateExpenseSettlements(splits, userD, groupId);

    expect(updates).toHaveLength(3);
    expect(updates.some(u => u.debtorId === userA && u.creditorId === userD && u.amount === 100)).toBe(true);
    expect(updates.some(u => u.debtorId === userB && u.creditorId === userD && u.amount === 100)).toBe(true);
    expect(updates.some(u => u.debtorId === userC && u.creditorId === userD && u.amount === 100)).toBe(true);
  });
});
