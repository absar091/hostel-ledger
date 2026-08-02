## 2024-05-15 - Optimize context method references with useCallback
**Learning:** Context methods like `getSettlements` passed down without `useCallback` cause consumer hooks (like `useMemo` depending on them) and components to re-run frequently, leading to unnecessary re-renders in consumers like `Groups.tsx`.
**Action:** Always wrap context methods with `useCallback` when they are exposed in the context value to maintain referential stability.
