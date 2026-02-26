/**
 * Logic for calculating debt summaries
 * Updated to support Multi-Payer logic
 */

const { calculateMultiPayerSettlements } = require('./expenseLogic');

/**
 * Convert calculated settlements into debt entry objects for the UI
 */
const createDebtEntriesFromSettlements = (
    expenseId,
    expenseTitle,
    expenseDate,
    settlements,
    currentUserId,
    otherPersonId = null
) => {
    const debts = [];

    settlements.forEach(s => {
        // Case 1: You Owe Them (Debtor = Me, Creditor = Them)
        if (s.debtorId === currentUserId) {
            // If filtering by person, Creditor must be that person
            if (otherPersonId && s.creditorId !== otherPersonId) return;

            debts.push({
                id: `${expenseId}_${currentUserId}_${s.creditorId}`,
                expenseId,
                expenseTitle,
                amount: s.amount, // Positive = you owe them
                date: expenseDate,
                createdAt: new Date().toISOString(),
                settled: false
            });
        }

        // Case 2: They Owe You (Debtor = Them, Creditor = Me)
        else if (s.creditorId === currentUserId) {
            // If filtering by person, Debtor must be that person
            if (otherPersonId && s.debtorId !== otherPersonId) return;

            debts.push({
                id: `${expenseId}_${s.debtorId}_${currentUserId}`,
                expenseId,
                expenseTitle,
                amount: -s.amount, // Negative = they owe you
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
            // Check involvement (Optimization: check if either user is involved at all)
            // But we need to calculate settlements first to know WHO owes WHO.
            // However, we can skip if neither user is in participants OR payers.

            let participants = Array.isArray(tx.participants) ? tx.participants : [];
            let payers = [];

            // Normalize Payers
            if (tx.payers && Array.isArray(tx.payers)) {
                payers = tx.payers.map(p => ({ participantId: p.id, amount: Number(p.amount) }));
            } else if (tx.paidBy) {
                // Legacy: Single payer
                payers = [{ participantId: tx.paidBy, amount: Number(tx.amount) }];
            }

            // Normalize Splits
            const splits = participants.map(p => ({ participantId: p.id, amount: Number(p.amount) }));

            // Optimization: If neither current user nor personId are in splits/payers, skip
            const allInvolvedIds = new Set([...splits.map(s => s.participantId), ...payers.map(p => p.participantId)]);
            if (!allInvolvedIds.has(currentUserId) || !allInvolvedIds.has(personId)) {
                return;
            }

            // Calculate Settlements
            const settlements = calculateMultiPayerSettlements(splits, payers);

            // Create Debt Entries
            const newDebts = createDebtEntriesFromSettlements(
                tx.id,
                tx.title || 'Expense',
                tx.date || new Date(tx.createdAt).toISOString(),
                settlements,
                currentUserId,
                personId
            );
            debts.push(...newDebts);
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

// Export createDebtEntries for backward compatibility if needed, though it's removed here
// We can re-export a dummy if strictly required by imports, but searching code showed no other imports than server.js which imports { processTransactions, calculateDebtSummary }

module.exports = {
    calculateDebtSummary,
    processTransactions
};
