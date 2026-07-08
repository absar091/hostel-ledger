## 2025-05-19 - [Fix Memoization in Dashboard]
**Learning:** Passing inline array derivations as props (e.g., `transactions={allTransactions.slice(0, 5)}`) creates new array references on every render, defeating memoization completely in components like `TransactionList`.
**Action:** Always memoize derived arrays before passing them as props to memoized lists to preserve performance optimizations.
