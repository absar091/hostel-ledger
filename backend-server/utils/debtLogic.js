/**
 * Logic for calculating debt summaries
 * Ported from src/lib/debtTracking.ts
 */

/**
 * Create debt entries from expense splits
 * @param {string} expenseId
 * @param {string} expenseTitle
 * @param {string} expenseDate
 * @param {Array<{participantId: string, amount: number}>} splits
 * @param {string} payerId
 * @param {string} currentUserId
 * @param {string} [otherPersonId] - Optional: Filter for debts involving this person
 */
const createDebtEntries = (
    expenseId,
    expenseTitle,
    expenseDate,
    splits,
    payerId,
    currentUserId,
    otherPersonId = null
) => {
    const debts = [];

    splits.forEach(split => {
        if (split.participantId === payerId) return; // Payer doesn't owe themselves

        // Case 1: Current User is the Participant (You Owe Payer)
        if (split.participantId === currentUserId) {
            // If filtering by person, Payer must be that person
            if (otherPersonId && payerId !== otherPersonId) return;

            debts.push({
                id: `${expenseId}_${currentUserId}_${payerId}`,
                expenseId,
                expenseTitle,
                amount: split.amount, // Positive = you owe them
                date: expenseDate,
                createdAt: new Date().toISOString(),
                settled: false
            });
        }
        // Case 2: Current User is the Payer (Participant Owes You)
        else if (payerId === currentUserId) {
            // If filtering by person, Participant must be that person
            if (otherPersonId && split.participantId !== otherPersonId) return;

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
 * Calculate debt summary
 * @param {Array} debtsArray
 */
const calculateDebtSummary = (debtsArray) => {
    const youOwe = debtsArray.filter(debt => !debt.settled && debt.amount > 0);
    const theyOwe = debtsArray.filter(debt => !debt.settled && debt.amount < 0)
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
 * Process a list of transactions to generate debts
 * @param {Object|Array} transactions
 * @param {string} currentUserId
 * @param {string} personId
 */
const processTransactions = (transactions, currentUserId, personId) => {
    const debts = [];
    const txList = Array.isArray(transactions) ? transactions : Object.values(transactions || {});

    txList.forEach(tx => {
        if (tx.type === 'expense') {
            // Check involvement
            let participants = [];
            if (Array.isArray(tx.participants)) {
                participants = tx.participants;
            }

            const personInvolved = participants.some(p => p.id === personId) || tx.paidBy === personId;
            const userInvolved = participants.some(p => p.id === currentUserId) || tx.paidBy === currentUserId;

            if (personInvolved && userInvolved) {
                 const newDebts = createDebtEntries(
                     tx.id,
                     tx.title || 'Expense',
                     tx.date || new Date(tx.createdAt).toISOString(),
                     participants.map(p => ({ participantId: p.id, amount: p.amount })),
                     tx.paidBy,
                     currentUserId,
                     personId // Apply Filter to fix 3-way split bug
                 );
                 debts.push(...newDebts);
            }
        }

        if (tx.type === 'payment') {
            // Only include payments strictly between these two people
            if (tx.from === currentUserId && tx.to === personId) {
                debts.push({
                    id: tx.id,
                    expenseId: tx.id,
                    expenseTitle: `Payment: ${tx.note || 'Settlement'}`,
                    amount: -tx.amount, // You paid them -> Reduces "You Owe" (or adds to negative stack)
                    date: tx.date || new Date(tx.createdAt).toISOString(),
                    createdAt: tx.createdAt,
                    settled: false
                });
            } else if (tx.from === personId && tx.to === currentUserId) {
                debts.push({
                    id: tx.id,
                    expenseId: tx.id,
                    expenseTitle: `Payment: ${tx.note || 'Settlement'}`,
                    amount: tx.amount, // They paid you -> Increases "You Owe" (or reduces negative stack "They Owe")
                    date: tx.date || new Date(tx.createdAt).toISOString(),
                    createdAt: tx.createdAt,
                    settled: false
                });
            }
        }
    });

    return debts;
};

module.exports = {
    createDebtEntries,
    calculateDebtSummary,
    processTransactions
};
