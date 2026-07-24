## 2024-07-24 - Inline array slice breaks React memoization
**Learning:** Passing an inline derived array like `transactions={allTransactions.slice(0, 5)}` as a prop in React breaks child component memoization because a new array reference is created on every render, defeating `React.memo` (or causing unnecessary renders in standard components).
**Action:** Always wrap array derivations (like `.slice()`, `.filter()`, `.map()`) passed as props to list components in a `useMemo` hook to ensure stable object references across renders.
