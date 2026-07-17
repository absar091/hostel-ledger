## $(date +%Y-%m-%d) - Optimize TransactionList re-renders
**Learning:** Using inline array derivations like `.slice()` or `.map()` as props completely defeats `React.memo` because they create a new reference on every render.
**Action:** Always wrap array derivations in `useMemo` when passing them to a memoized list component to preserve referential equality.
