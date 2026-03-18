## 2026-03-18 - Selective Memoization in Large Context Providers
**Learning:** Large unmemoized functions within context providers cause unnecessary recalculations in downstream components, but fully memoizing the provider `value` can lead to stale closures.
**Action:** Selectively wrap specific pure calculation functions (like `getSettlements`) with `useCallback` rather than memoizing the entire context object.
