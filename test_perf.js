const transactions = Array.from({ length: 1000 }, (_, i) => ({
  type: 'expense',
  paidBy: `user${i % 10}`,
  amount: Math.random() * 100
}));

const members = Array.from({ length: 10 }, (_, i) => ({
  id: `user${i}`
}));

console.time('No Memo');
for (let j = 0; j < 1000; j++) {
  const memberExpenseContributions = members.map((member) => {
    const totalPaid = transactions
      .filter(t => t.type === "expense" && t.paidBy === member.id)
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      ...member,
      totalPaid
    };
  });
  const topSpender = memberExpenseContributions.length > 0
    ? memberExpenseContributions.reduce((prev, curr) => {
      return curr.totalPaid > prev.totalPaid ? curr : prev;
    })
    : null;
}
console.timeEnd('No Memo');
