// Corrected expense splitting and settlement logic

export interface ExpenseSplit {
  participantId: string;
  participantName: string;
  amount: number;
  isRemainder: boolean; // Track who gets remainder
}

export interface SettlementUpdate {
  personId: string;
  groupId: string;
  toReceiveChange: number; // Positive = increase receivable
  toPayChange: number;     // Positive = increase payable
}

export interface GlobalSettlementUpdate {
  fromId: string; // Debtor
  toId: string;   // Creditor
  amount: number;
  groupId: string;
}

/**
 * CORRECTED: Fair distribution of expense amount with proper remainder handling
 */
export const calculateExpenseSplit = (
  totalAmount: number,
  participants: Array<{ id: string, name: string }>,
  payerId: string
): ExpenseSplit[] => {
  if (participants.length === 0) {
    throw new Error("Must have at least one participant");
  }

  // Work with cents to avoid floating point errors
  const totalCents = Math.round(totalAmount * 100);
  const baseCents = Math.floor(totalCents / participants.length);
  const remainderCents = totalCents % participants.length;

  // Distribute remainder fairly - rotate who gets extra amount
  const payerIndex = participants.findIndex(p => p.id === payerId);
  const startIndex = payerIndex >= 0 ? payerIndex : 0;

  return participants.map((participant, index) => {
    const adjustedIndex = (index + participants.length - startIndex) % participants.length;
    const getsRemainder = adjustedIndex < remainderCents;

    return {
      participantId: participant.id,
      participantName: participant.name,
      amount: (baseCents + (getsRemainder ? 1 : 0)) / 100,
      isRemainder: getsRemainder
    };
  });
};

/**
 * CORRECTED: Calculate global settlement updates for expense
 * Returns all debt relationships created by this transaction
 */
export const calculateGlobalExpenseSettlements = (
  splits: ExpenseSplit[],
  payerId: string,
  groupId: string
): GlobalSettlementUpdate[] => {
  const updates: GlobalSettlementUpdate[] = [];

  const payerSplit = splits.find(s => s.participantId === payerId);
  if (!payerSplit) {
    throw new Error("Payer must be a participant");
  }

  // Everyone else owes the payer their split amount
  splits.forEach(split => {
    if (split.participantId !== payerId) {
      updates.push({
        fromId: split.participantId,
        toId: payerId,
        amount: split.amount,
        groupId
      });
    }
  });

  return updates;
};

/**
 * Legacy support wrapper using global calculation
 */
export const calculateExpenseSettlements = (
  splits: ExpenseSplit[],
  payerId: string,
  currentUserId: string,
  groupId: string
): SettlementUpdate[] => {
  const globalUpdates = calculateGlobalExpenseSettlements(splits, payerId, groupId);
  const updates: SettlementUpdate[] = [];

  globalUpdates.forEach(update => {
    if (update.toId === currentUserId) {
      // Someone owes current user
      updates.push({
        personId: update.fromId,
        groupId,
        toReceiveChange: update.amount,
        toPayChange: 0
      });
    } else if (update.fromId === currentUserId) {
      // Current user owes someone
      updates.push({
        personId: update.toId,
        groupId,
        toReceiveChange: 0,
        toPayChange: update.amount
      });
    }
  });

  return updates;
};

/**
 * CORRECTED: Validate settlement consistency
 */
export const validateSettlementConsistency = (
  groupSettlements: Record<string, { toReceive: number, toPay: number }>,
  currentUserId: string
): { isValid: boolean, errors: string[] } => {
  const errors: string[] = [];

  // Rule 1: User cannot owe money to themselves
  if (groupSettlements[currentUserId]) {
    const selfSettlement = groupSettlements[currentUserId];
    if (selfSettlement.toReceive > 0 || selfSettlement.toPay > 0) {
      errors.push("User cannot have settlements with themselves");
    }
  }

  // Rule 2: For each person, either toReceive OR toPay should be 0 (not both positive)
  Object.entries(groupSettlements).forEach(([personId, settlement]) => {
    if (settlement.toReceive > 0 && settlement.toPay > 0) {
      errors.push(`Person ${personId} has both receivable and payable amounts - should be netted`);
    }

    if (settlement.toReceive < 0 || settlement.toPay < 0) {
      errors.push(`Person ${personId} has negative settlement amounts`);
    }
  });

  // Rule 3: Total receivables should equal total payables in the group
  // (This would require group-wide validation, not just current user's view)

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * CORRECTED: Net settlements to prevent both owing and being owed by same person
 */
export const netSettlements = (
  settlements: Record<string, Record<string, { toReceive: number, toPay: number }>>
): Record<string, Record<string, { toReceive: number, toPay: number }>> => {
  const netted = JSON.parse(JSON.stringify(settlements)); // Deep clone

  Object.keys(netted).forEach(groupId => {
    const groupSettlements = netted[groupId];

    Object.keys(groupSettlements).forEach(personId => {
      const settlement = groupSettlements[personId];

      if (settlement.toReceive > 0 && settlement.toPay > 0) {
        // Net the amounts
        if (settlement.toReceive > settlement.toPay) {
          settlement.toReceive -= settlement.toPay;
          settlement.toPay = 0;
        } else if (settlement.toPay > settlement.toReceive) {
          settlement.toPay -= settlement.toReceive;
          settlement.toReceive = 0;
        } else {
          // Equal amounts - both become 0
          settlement.toReceive = 0;
          settlement.toPay = 0;
        }
      }
    });
  });

  return netted;
};

/**
 * CORRECTED: Calculate actual wallet balance after transaction
 */
export const calculateWalletBalanceAfter = (
  currentBalance: number,
  transactionType: 'add' | 'deduct',
  amount: number
): number => {
  switch (transactionType) {
    case 'add':
      return currentBalance + amount;
    case 'deduct':
      return currentBalance - amount;
    default:
      throw new Error(`Invalid transaction type: ${transactionType}`);
  }
};

/**
 * CORRECTED: Validate payment amount against actual debt
 */
export const validatePaymentAmount = (
  paymentAmount: number,
  actualDebt: number,
  allowOverpayment: boolean = false
): { isValid: boolean, actualAmount: number, error?: string } => {
  if (paymentAmount <= 0) {
    return { isValid: false, actualAmount: 0, error: "Payment amount must be positive" };
  }

  if (actualDebt <= 0) {
    return { isValid: false, actualAmount: 0, error: "No debt exists to pay" };
  }

  if (paymentAmount > actualDebt && !allowOverpayment) {
    return { isValid: false, actualAmount: 0, error: `Payment amount (${paymentAmount}) exceeds debt (${actualDebt})` };
  }

  const actualAmount = allowOverpayment ? paymentAmount : Math.min(paymentAmount, actualDebt);

  return { isValid: true, actualAmount };
};