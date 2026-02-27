const { describe, it, expect } = require('vitest');

// --- THE LOGIC TO TEST ---

/**
 * Calculates settlements for multi-payer expenses.
 *
 * @param {Array<{participantId: string, amount: number}>} splits - Who consumed what (total must match totalAmount)
 * @param {Array<{participantId: string, amount: number}>} payers - Who paid what (total must match totalAmount)
 * @returns {Array<{debtorId: string, creditorId: string, amount: number}>} - List of debts
 */
const calculateMultiPayerSettlements = (splits, payers) => {
    // 1. Calculate Net Balance for each person
    // Net = Paid - Consumed
    // Positive = Creditor (Owed money)
    // Negative = Debtor (Owes money)

    const balances = {};

    // Initialize with 0
    splits.forEach(s => balances[s.participantId] = 0);
    payers.forEach(p => {
        if (!balances[p.participantId]) balances[p.participantId] = 0;
    });

    // Add Paid
    payers.forEach(p => {
        balances[p.participantId] += p.amount;
    });

    // Subtract Consumed
    splits.forEach(s => {
        balances[s.participantId] -= s.amount;
    });

    // 2. Separate into Debtors and Creditors
    let debtors = [];
    let creditors = [];

    Object.entries(balances).forEach(([id, amount]) => {
        // Round to 2 decimal places to avoid floating point errors
        const roundedAmount = Math.round(amount * 100) / 100;

        if (roundedAmount < 0) {
            debtors.push({ id, amount: roundedAmount });
        } else if (roundedAmount > 0) {
            creditors.push({ id, amount: roundedAmount });
        }
    });

    // Sort by magnitude (largest debt/credit first) to minimize number of transactions
    debtors.sort((a, b) => a.amount - b.amount); // Ascending (most negative first)
    creditors.sort((a, b) => b.amount - a.amount); // Descending (most positive first)

    const settlements = [];

    // 3. Match Debtors to Creditors
    let i = 0; // Debtor index
    let j = 0; // Creditor index

    while (i < debtors.length && j < creditors.length) {
        let debtor = debtors[i];
        let creditor = creditors[j];

        // The amount that can be settled is the minimum of debt magnitude and credit magnitude
        let amount = Math.min(Math.abs(debtor.amount), creditor.amount);

        // Round to 2 decimals
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

        // Move indices if settled
        if (Math.abs(debtor.amount) < 0.01) i++;
        if (creditor.amount < 0.01) j++;
    }

    return settlements;
};

// --- TESTS ---

describe('Multi-Payer Settlements Logic', () => {

    it('Scenario 1: Simple 2 person split (A pays 700, B pays 300, Split 500 each)', () => {
        const splits = [
            { participantId: 'A', amount: 500 },
            { participantId: 'B', amount: 500 }
        ];
        const payers = [
            { participantId: 'A', amount: 700 },
            { participantId: 'B', amount: 300 }
        ];

        const result = calculateMultiPayerSettlements(splits, payers);

        // A Net: +200, B Net: -200
        // Expect: B owes A 200
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ debtorId: 'B', creditorId: 'A', amount: 200 });
    });

    it('Scenario 2: 3 person split (A pays 200, B pays 100, Split 100 each)', () => {
        const splits = [
            { participantId: 'A', amount: 100 },
            { participantId: 'B', amount: 100 },
            { participantId: 'C', amount: 100 }
        ];
        const payers = [
            { participantId: 'A', amount: 200 },
            { participantId: 'B', amount: 100 }
        ];

        const result = calculateMultiPayerSettlements(splits, payers);

        // A Net: +100, B Net: 0, C Net: -100
        // Expect: C owes A 100
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ debtorId: 'C', creditorId: 'A', amount: 100 });
    });

    it('Scenario 3: 3 person split (A pays 150, B pays 150, Split 100 each)', () => {
        const splits = [
            { participantId: 'A', amount: 100 },
            { participantId: 'B', amount: 100 },
            { participantId: 'C', amount: 100 }
        ];
        const payers = [
            { participantId: 'A', amount: 150 },
            { participantId: 'B', amount: 150 }
        ];

        const result = calculateMultiPayerSettlements(splits, payers);

        // A Net: +50, B Net: +50, C Net: -100
        // Expect: C owes A 50, C owes B 50 (Order depends on sorting but amounts correct)
        expect(result).toHaveLength(2);

        // Sorting check: Largest debt first (C is only debtor). Largest credit first (A and B equal).
        // It might be C->A then C->B or vice versa.

        const totalDebt = result.reduce((sum, r) => sum + r.amount, 0);
        expect(totalDebt).toBe(100);

        const debtors = result.map(r => r.debtorId);
        expect(debtors).toEqual(['C', 'C']); // C pays both

        const creditors = result.map(r => r.creditorId).sort();
        expect(creditors).toEqual(['A', 'B']); // A and B receive
    });

    it('Scenario 4: Single Payer (Backward Compatibility Check)', () => {
        // A pays 1000. Split A(500), B(500).
        const splits = [
            { participantId: 'A', amount: 500 },
            { participantId: 'B', amount: 500 }
        ];
        const payers = [
            { participantId: 'A', amount: 1000 }
        ];

        const result = calculateMultiPayerSettlements(splits, payers);

        // A Net: +500, B Net: -500
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ debtorId: 'B', creditorId: 'A', amount: 500 });
    });

    it('Scenario 5: Uneven Split and Uneven Pay', () => {
        // Total 100.
        // Consumed: A(10), B(20), C(70).
        // Paid: A(80), B(20).
        const splits = [
            { participantId: 'A', amount: 10 },
            { participantId: 'B', amount: 20 },
            { participantId: 'C', amount: 70 }
        ];
        const payers = [
            { participantId: 'A', amount: 80 },
            { participantId: 'B', amount: 20 }
        ];

        // A Net: 80 - 10 = +70.
        // B Net: 20 - 20 = 0.
        // C Net: 0 - 70 = -70.

        const result = calculateMultiPayerSettlements(splits, payers);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ debtorId: 'C', creditorId: 'A', amount: 70 });
    });

});
