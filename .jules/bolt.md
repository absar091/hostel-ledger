## 2024-05-18 - Selective Memoization in Large Contexts
**Learning:** Memoizing an entire large provider value object with `useMemo` can lead to stale closures if it contains many unmemoized state-dependent functions.
**Action:** Selectively wrap exposed calculation functions (like `getSettlements`) in `useCallback` to maintain referential equality and prevent unnecessary downstream executions, even if the main provider value is unmemoized.
