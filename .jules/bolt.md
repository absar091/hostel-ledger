## 2026-03-18 - Avoid full value memoization in large context providers
**Learning:** In large React Context providers like `FirebaseAuthContext`, memoizing the entire value object with `useMemo` when it contains many unmemoized state-dependent functions risks stale closures.
**Action:** Selectively wrap exposed calculation functions (like `getSettlements` or `getTotalToReceive`) in `useCallback` to maintain referential equality and prevent unnecessary downstream `useEffect` executions, even if the main provider value remains unmemoized.
