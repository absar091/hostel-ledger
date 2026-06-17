## 2024-06-17 - Context Memoization
**Learning:** Massive React Context providers that return literal objects on every render invalidate downstream memoization hooks (like `groupSettlementsMap` using `useMemo`).
**Action:** Always `useCallback` on heavily requested functions like `getSettlements` to prevent downstream re-renders, but avoid memoizing the entire Provider `value` object if it contains many un-memoized functions, as that will lead to stale closures and broken app state.
