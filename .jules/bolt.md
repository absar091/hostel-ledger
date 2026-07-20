## 2024-07-20 - Optimize TransactionList by memoizing inline slice array
**Learning:** In React, passing inline array derivations (e.g. `allTransactions.slice(0, 5)`) creates a new array reference on every render, completely defeating the memoization of any child component like `TransactionList`.
**Action:** Always memoize derived arrays using `useMemo` before passing them as props to lists, and wrap long-list components in `React.memo` to skip unnecessary re-renders.
