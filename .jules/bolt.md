## 2024-06-18 - Selective Context Provider Memoization
**Learning:** In massive React Context providers like `FirebaseAuthContext` that return many state variables and functions, wrapping the entire `value` object in `useMemo` is an anti-pattern as omitting dependencies causes stale closures and broken app state.
**Action:** Instead of memoizing the entire context object, selectively wrap heavily requested functions (like `getSettlements` or aggregations) in `useCallback` to prevent deep child component re-renders while safely maintaining fresh closures for simpler functions.
