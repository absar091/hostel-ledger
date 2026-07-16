## 2026-07-16 - Prevent unmemoized array derivations from breaking React.memo
**Learning:** When optimizing list components with React.memo (like TransactionList), ensure that the parent component does not pass inline array derivations as props (e.g., transactions={allTransactions.slice(0, 5)}). Operations like .slice() or .map() create new array references on every render, defeating the memoization completely.
**Action:** Always wrap derived arrays or objects passed as props in useMemo() before passing them to memoized child components to ensure stable references across renders.
