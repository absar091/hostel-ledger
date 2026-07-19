
## 2024-07-19 - Prevent Unnecessary Re-renders in Dashboard TransactionList
**Learning:** In React, passing inline arrays (like `allTransactions.slice(0, 5)`) as props to child components completely defeats memoization (`React.memo`) because `.slice()` creates a new array reference on every render, causing the child to re-render unnecessarily.
**Action:** Always memoize derived array computations using `useMemo` before passing them as props to memoized child list components. Ensure the list component itself is wrapped in `React.memo` if its rendering is potentially expensive.
