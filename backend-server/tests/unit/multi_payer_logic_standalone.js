const assert = require('assert');

// --- THE LOGIC TO TEST ---

const calculateMultiPayerSettlements = (splits, payers) => {
    const balances = {};

    splits.forEach(s => balances[s.participantId] = 0);
    payers.forEach(p => {
        if (!balances[p.participantId]) balances[p.participantId] = 0;
    });

    payers.forEach(p => {
        balances[p.participantId] += p.amount;
    });

    splits.forEach(s => {
        balances[s.participantId] -= s.amount;
    });

    let debtors = [];
    let creditors = [];

    Object.entries(balances).forEach(([id, amount]) => {
        const roundedAmount = Math.round(amount * 100) / 100;
        if (roundedAmount < 0) {
            debtors.push({ id, amount: roundedAmount });
        } else if (roundedAmount > 0) {
            creditors.push({ id, amount: roundedAmount });
        }
    });

    debtors.sort((a, b) => a.amount - b.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const settlements = [];
    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
        let debtor = debtors[i];
        let creditor = creditors[j];

        let amount = Math.min(Math.abs(debtor.amount), creditor.amount);
        amount = Math.round(amount * 100) / 100;

        if (amount > 0) {
            settlements.push({
                debtorId: debtor.id,
                creditorId: creditor.id,
                amount: amount
            });
        }

        debtor.amount += amount;
        creditor.amount -= amount;

        debtor.amount = Math.round(debtor.amount * 100) / 100;
        creditor.amount = Math.round(creditor.amount * 100) / 100;

        if (Math.abs(debtor.amount) < 0.01) i++;
        if (creditor.amount < 0.01) j++;
    }

    return settlements;
};

// --- TESTS ---

try {
    console.log('Running Test 1: Simple 2 person split...');
    const result1 = calculateMultiPayerSettlements(
        [{ participantId: 'A', amount: 500 }, { participantId: 'B', amount: 500 }],
        [{ participantId: 'A', amount: 700 }, { participantId: 'B', amount: 300 }]
    );
    assert.deepStrictEqual(result1, [{ debtorId: 'B', creditorId: 'A', amount: 200 }]);
    console.log('✅ Passed Test 1');

    console.log('Running Test 2: 3 person split...');
    const result2 = calculateMultiPayerSettlements(
        [{ participantId: 'A', amount: 100 }, { participantId: 'B', amount: 100 }, { participantId: 'C', amount: 100 }],
        [{ participantId: 'A', amount: 200 }, { participantId: 'B', amount: 100 }]
    );
    assert.deepStrictEqual(result2, [{ debtorId: 'C', creditorId: 'A', amount: 100 }]);
    console.log('✅ Passed Test 2');

    console.log('Running Test 3: Complex 3 person split...');
    const result3 = calculateMultiPayerSettlements(
        [{ participantId: 'A', amount: 100 }, { participantId: 'B', amount: 100 }, { participantId: 'C', amount: 100 }],
        [{ participantId: 'A', amount: 150 }, { participantId: 'B', amount: 150 }]
    );
    // Sort results for consistent assertion
    result3.sort((a, b) => a.creditorId.localeCompare(b.creditorId));
    assert.deepStrictEqual(result3, [
        { debtorId: 'C', creditorId: 'A', amount: 50 },
        { debtorId: 'C', creditorId: 'B', amount: 50 }
    ]);
    console.log('✅ Passed Test 3');

    console.log('Running Test 4: Single Payer...');
    const result4 = calculateMultiPayerSettlements(
        [{ participantId: 'A', amount: 500 }, { participantId: 'B', amount: 500 }],
        [{ participantId: 'A', amount: 1000 }]
    );
    assert.deepStrictEqual(result4, [{ debtorId: 'B', creditorId: 'A', amount: 500 }]);
    console.log('✅ Passed Test 4');

    console.log('🎉 All manual tests passed!');
} catch (e) {
    console.error('❌ Test Failed:', e);
    process.exit(1);
}
