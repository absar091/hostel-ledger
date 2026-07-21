## 2024-06-25 - Prevent Unnecessary Re-renders in Dashboard TransactionList
**Learning:** Inline array derivations like `allTransactions.slice(0, 5)` passed as props to a child component (e.g. `TransactionList`) create new object references on every render, completely defeating React memoization.
**Action:** Always memoize derived array/object slices with `useMemo` in parent components before passing them to child components when optimizing for performance.
