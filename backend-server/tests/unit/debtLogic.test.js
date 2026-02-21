
const { processTransactions, calculateDebtSummary } = require('../../utils/debtLogic');

describe('debtLogic', () => {
  const currentUserId = 'userA';
  const personId = 'userB';

  it('should calculate simple debt (You Owe Them)', () => {
    // A owes B
    const transactions = [
      {
        id: 'tx1',
        type: 'expense',
        title: 'Lunch',
        amount: 200,
        paidBy: personId, // B paid
        participants: [
          { id: currentUserId, amount: 100 }, // A owes 100
          { id: personId, amount: 100 }
        ],
        date: '2023-01-01',
        createdAt: new Date().toISOString()
      }
    ];

    const debts = processTransactions(transactions, currentUserId, personId);
    expect(debts).toHaveLength(1);
    expect(debts[0].amount).toBe(100); // Positive = You Owe

    const summary = calculateDebtSummary(debts);
    expect(summary.totalYouOwe).toBe(100);
    expect(summary.totalTheyOwe).toBe(0);
    expect(summary.netAmount).toBe(-100); // Net negative = You Owe
  });

  it('should calculate simple debt (They Owe You)', () => {
    // B owes A
    const transactions = [
      {
        id: 'tx2',
        type: 'expense',
        title: 'Dinner',
        amount: 300,
        paidBy: currentUserId, // A paid
        participants: [
          { id: currentUserId, amount: 150 },
          { id: personId, amount: 150 } // B owes 150
        ],
        date: '2023-01-02',
        createdAt: new Date().toISOString()
      }
    ];

    const debts = processTransactions(transactions, currentUserId, personId);
    expect(debts).toHaveLength(1);
    expect(debts[0].amount).toBe(-150); // Negative = They Owe

    const summary = calculateDebtSummary(debts);
    expect(summary.totalYouOwe).toBe(0);
    expect(summary.totalTheyOwe).toBe(150);
    expect(summary.netAmount).toBe(150); // Net positive = They Owe
  });

  it('should filter out unrelated debts in 3-way split (Correctness Fix)', () => {
    // A paid for B and C.
    // Current User = B. Person Viewed = C.
    // B owes A. C owes A. B and C do not owe each other.
    const transactions = [
      {
        id: 'tx3',
        type: 'expense',
        title: 'Party',
        amount: 300,
        paidBy: 'userA', // A paid
        participants: [
          { id: 'userA', amount: 100 },
          { id: 'userB', amount: 100 }, // B owes 100 to A
          { id: 'userC', amount: 100 }  // C owes 100 to A
        ],
        date: '2023-01-03',
        createdAt: new Date().toISOString()
      }
    ];

    // B viewing C
    const debts = processTransactions(transactions, 'userB', 'userC');
    // Expect NO debts between B and C
    expect(debts).toHaveLength(0);
  });

  it('should handle payments', () => {
    // A owed B 100. A pays B 50.
    const transactions = [
      {
        id: 'tx1',
        type: 'expense',
        amount: 200,
        paidBy: personId, // B paid
        participants: [{ id: currentUserId, amount: 100 }, { id: personId, amount: 100 }],
        createdAt: new Date().toISOString()
      },
      {
        id: 'pay1',
        type: 'payment',
        amount: 50,
        from: currentUserId, // A pays
        to: personId,        // B receives
        date: '2023-01-04',
        createdAt: new Date().toISOString()
      }
    ];

    const debts = processTransactions(transactions, currentUserId, personId);
    expect(debts).toHaveLength(2);
    // Expense: +100
    // Payment: -50

    const summary = calculateDebtSummary(debts);
    // You Owe: 100
    // They Owe: 50 (Payment treated as negative debt, so moves to 'theyOwe' list)

    expect(summary.totalYouOwe).toBe(100);
    expect(summary.totalTheyOwe).toBe(50);
    expect(summary.netAmount).toBe(50 - 100); // -50.
  });
});
