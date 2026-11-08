const transactions = Array.from({ length: 1000 }, (_, i) => ({
  type: 'expense',
  paidBy: `user${i % 10}`,
  amount: Math.random() * 100
}));

const members = Array.from({ length: 10 }, (_, i) => ({
  id: `user${i}`
}));

console.time('Optimized');
for (let j = 0; j < 1000; j++) {
  const expenseTotals = {};
  for (const t of transactions) {
    if (t.type === "expense") {
       expenseTotals[t.paidBy] = (expenseTotals[t.paidBy] || 0) + t.amount;
    }
  }

  let topSpender = null;
  let maxAmount = -1;
  for (const member of members) {
      const amount = expenseTotals[member.id] || 0;
      if (amount > maxAmount) {
         maxAmount = amount;
         topSpender = { ...member, totalPaid: amount };
      }
  }
}
console.timeEnd('Optimized');
