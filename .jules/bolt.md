## 2024-05-18 - [Optimizing Component Props for Memoization]
**Learning:** [When passing derived arrays like `.slice()` as props, the child component will re-render even if it is wrapped in `React.memo()`, because `.slice()` creates a new array reference on every parent render.]
**Action:** [Always memoize derived array props (e.g., using `useMemo`) in the parent before passing them down to a `React.memo` child component to truly prevent unnecessary re-renders.]
