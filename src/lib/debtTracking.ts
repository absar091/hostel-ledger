// Manual Debt Tracking System - No Automatic Balancing

export interface IndividualDebt {
  id: string;
  expenseId: string;
  expenseTitle: string;
  amount: number;
  date: string;
  createdAt: string;
  settled: boolean;
  settledAt?: string;
  settledAmount?: number;
}

export interface DebtSummary {
  youOwe: IndividualDebt[];      // Debts you owe to this person
  theyOwe: IndividualDebt[];     // Debts they owe to you
  totalYouOwe: number;           // Sum of unsettled debts you owe
  totalTheyOwe: number;          // Sum of unsettled debts they owe
  netAmount: number;             // Calculated net (positive = they owe you, negative = you owe them)
}

export interface SettlementOption {
  type: 'individual' | 'partial' | 'net';
  debtId?: string;               // For individual debt settlement
  amount: number;                // Amount to settle
  description: string;           // What's being settled
}

/**
 * Calculate debt summary between current user and another person
 */
export const calculateDebtSummary = (
  debts: Record<string, IndividualDebt[]>,
  personId: string
): DebtSummary => {
  const personDebts = debts[personId] || [];
  
  const youOwe = personDebts.filter(debt => !debt.settled && debt.amount > 0);
  const theyOwe = personDebts.filter(debt => !debt.settled && debt.amount < 0)
    .map(debt => ({ ...debt, amount: Math.abs(debt.amount) }));
  
  const totalYouOwe = youOwe.reduce((sum, debt) => sum + debt.amount, 0);
  const totalTheyOwe = theyOwe.reduce((sum, debt) => sum + debt.amount, 0);
  const netAmount = totalTheyOwe - totalYouOwe;
  
  return {
    youOwe,
    theyOwe,
    totalYouOwe,
    totalTheyOwe,
    netAmount
  };
};

/**
 * Create debt entries from expense splits (NO AUTOMATIC BALANCING)
 */
export const createDebtEntries = (
  expenseId: string,
  expenseTitle: string,
  expenseDate: string,
  splits: Array<{ participantId: string; amount: number }>,
  payerId: string,
  currentUserId: string
): IndividualDebt[] => {
  const debts: IndividualDebt[] = [];
  
  splits.forEach(split => {
    if (split.participantId === payerId) return; // Payer doesn't owe themselves
    
    // Create debt entry for each participant who owes the payer
    if (split.participantId === currentUserId) {
      // Current user owes the payer
      debts.push({
        id: `${expenseId}_${currentUserId}_${payerId}`,
        expenseId,
        expenseTitle,
        amount: split.amount, // Positive = you owe them
        date: expenseDate,
        createdAt: new Date().toISOString(),
        settled: false
      });
    } else if (payerId === currentUserId) {
      // Other participant owes current user
      debts.push({
        id: `${expenseId}_${split.participantId}_${currentUserId}`,
        expenseId,
        expenseTitle,
        amount: -split.amount, // Negative = they owe you
        date: expenseDate,
        createdAt: new Date().toISOString(),
        settled: false
      });
    }
  });
  
  return debts;
};

/**
 * Settle individual debt
 */
export const settleIndividualDebt = (
  debt: IndividualDebt,
  settledAmount?: number
): IndividualDebt => {
  const amountToSettle = settledAmount || debt.amount;
  
  return {
    ...debt,
    settled: amountToSettle >= debt.amount,
    settledAt: new Date().toISOString(),
    settledAmount: amountToSettle,
    amount: debt.amount - amountToSettle // Remaining amount if partial
  };
};

/**
 * Generate settlement options for a person
 */
export const generateSettlementOptions = (
  debtSummary: DebtSummary
): SettlementOption[] => {
  const options: SettlementOption[] = [];
  
  // Individual debt settlements
  debtSummary.youOwe.forEach(debt => {
    options.push({
      type: 'individual',
      debtId: debt.id,
      amount: debt.amount,
      description: `Pay ${debt.expenseTitle} (Rs ${debt.amount})`
    });
  });
  
  debtSummary.theyOwe.forEach(debt => {
    options.push({
      type: 'individual',
      debtId: debt.id,
      amount: debt.amount,
      description: `Collect ${debt.expenseTitle} (Rs ${debt.amount})`
    });
  });
  
  // Net settlement option
  if (debtSummary.netAmount !== 0) {
    options.push({
      type: 'net',
      amount: Math.abs(debtSummary.netAmount),
      description: debtSummary.netAmount > 0 
        ? `Collect net amount (Rs ${debtSummary.netAmount})`
        : `Pay net amount (Rs ${Math.abs(debtSummary.netAmount)})`
    });
  }
  
  return options;
};

/**
 * Validate settlement amount
 */
export const validateSettlement = (
  option: SettlementOption,
  debtSummary: DebtSummary
): { isValid: boolean; error?: string } => {
  if (option.amount <= 0) {
    return { isValid: false, error: "Settlement amount must be positive" };
  }
  
  if (option.type === 'individual' && option.debtId) {
    const debt = [...debtSummary.youOwe, ...debtSummary.theyOwe]
      .find(d => d.id === option.debtId);
    
    if (!debt) {
      return { isValid: false, error: "Debt not found" };
    }
    
    if (option.amount > debt.amount) {
      return { isValid: false, error: "Settlement amount exceeds debt amount" };
    }
  }
  
  if (option.type === 'net') {
    if (option.amount > Math.abs(debtSummary.netAmount)) {
      return { isValid: false, error: "Settlement amount exceeds net debt" };
    }
  }
  
  return { isValid: true };
};