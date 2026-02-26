/**
 * Logic for calculating expense settlements and splits
 */

/**
 * Calculates settlements for multi-payer expenses.
 *
 * @param {Array<{participantId: string, amount: number}>} splits - Who consumed what
 * @param {Array<{participantId: string, amount: number}>} payers - Who paid what
 * @returns {Array<{debtorId: string, creditorId: string, amount: number}>} - List of debts
 */
const calculateMultiPayerSettlements = (splits, payers) => {
    const balances = {};

    // Initialize balances
    splits.forEach(s => balances[s.participantId] = 0);
    payers.forEach(p => {
        if (!balances[p.participantId]) balances[p.participantId] = 0;
    });

    // Add Paid (Credit)
    payers.forEach(p => {
        balances[p.participantId] += p.amount;
    });

    // Subtract Consumed (Debit)
    splits.forEach(s => {
        balances[s.participantId] -= s.amount;
    });

    let debtors = [];
    let creditors = [];

    Object.entries(balances).forEach(([id, amount]) => {
        const roundedAmount = Math.round(amount * 100) / 100;
        if (roundedAmount < -0.01) {
            debtors.push({ id, amount: roundedAmount });
        } else if (roundedAmount > 0.01) {
            creditors.push({ id, amount: roundedAmount });
        }
    });

    // Optimization: Sort by magnitude
    debtors.sort((a, b) => a.amount - b.amount); // Most negative first
    creditors.sort((a, b) => b.amount - a.amount); // Most positive first

    const settlements = [];
    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
        let debtor = debtors[i];
        let creditor = creditors[j];

        // The amount that can be settled is the minimum of debt magnitude and credit magnitude
        let amount = Math.min(Math.abs(debtor.amount), creditor.amount);
        amount = Math.round(amount * 100) / 100;

        if (amount > 0) {
            settlements.push({
                debtorId: debtor.id,
                creditorId: creditor.id,
                amount: amount
            });
        }

        // Adjust remaining balances
        debtor.amount += amount;
        creditor.amount -= amount;

        // Round to avoid tiny floating point leftovers
        debtor.amount = Math.round(debtor.amount * 100) / 100;
        creditor.amount = Math.round(creditor.amount * 100) / 100;

        // Move indices if settled (within epsilon)
        if (Math.abs(debtor.amount) < 0.01) i++;
        if (creditor.amount < 0.01) j++;
    }

    return settlements;
};

/**
 * Calculates debts between participants and the payer (Legacy Wrapper)
 * @param {Array<{participantId: string, amount: number}>} splits
 * @param {string} payerId
 * @returns {Array} Array of debt objects { debtorId, creditorId, amount }
 */
const calculateExpenseSettlements = (splits, payerId) => {
    // Calculate total amount from splits
    const totalAmount = splits.reduce((sum, s) => sum + s.amount, 0);

    // Construct single payer list
    const payers = [{ participantId: payerId, amount: totalAmount }];

    return calculateMultiPayerSettlements(splits, payers);
};

/**
 * Safely calculates a split amount
 * @param {number} totalAmount Total expense amount
 * @param {number} participantCount Number of participants
 * @returns {number} Amount per participant
 */
const calculateEqualSplit = (totalAmount, participantCount) => {
    if (!participantCount || participantCount <= 0) return 0;
    return Math.round((totalAmount / participantCount) * 100) / 100;
};

module.exports = {
    calculateMultiPayerSettlements,
    calculateExpenseSettlements,
    calculateEqualSplit
};
