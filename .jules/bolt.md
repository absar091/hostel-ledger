## 2024-07-23 - Prevent re-renders from inline array derivations
**Learning:** Passing inline derived arrays (e.g. `array.slice()`) as props to React components creates new object references on every render. This completely breaks any memoization in child components (like `React.memo`), leading to cascading unnecessary re-renders in performance-sensitive areas like the Dashboard.
**Action:** Always wrap inline array operations in `useMemo` when passing them down as props to ensure referential stability, and wrap list components in `React.memo()`.
