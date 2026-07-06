## 2026-07-06 - Memoizing List Props for React.memo
**Learning:** Passing inline array derivations (e.g., `allTransactions.slice(0, 5)`) as props to list components defeats `React.memo` entirely because a new array reference is created on every render of the parent component.
**Action:** Always wrap array derivations (like `.map()`, `.filter()`, or `.slice()`) in `useMemo` when passing them down as props to child components that are expected to be memoized. Also remember to wrap the child component itself in `React.memo()` if it isn't already.
