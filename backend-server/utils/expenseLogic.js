/**
 * Logic for calculating expense settlements and splits
 */

/**
 * Calculates debts between participants and the payer
 * @param {Array} splits Array of split objects { participantId, amount }
 * @param {string} payerId ID of the member who paid
 * @returns {Array} Array of debt objects { debtorId, creditorId, amount }
 */
const calculateExpenseSettlements = (splits, payerId) => {
    const debts = [];

    // If payer is NOT a participant, they are just a "creditor" for the whole amount
    // This is a valid use case (e.g., someone paying for others)

    splits.forEach(split => {
        if (split.participantId !== payerId) {
            // Participant owes Payer
            debts.push({
                debtorId: split.participantId,
                creditorId: payerId,
                amount: split.amount
            });
        }
    });

    return debts;
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
    calculateExpenseSettlements,
    calculateEqualSplit
};
