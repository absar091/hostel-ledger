## 2024-05-18 - Selective Memoization in Large Context Providers
**Learning:** In large React Context providers (e.g., FirebaseAuthContext), memoizing the entire value object with `useMemo` risks stale closures and violates refactoring constraints. However, exposed calculation functions like `getSettlements` or `getTotalToReceive` must maintain referential equality to prevent unnecessary downstream re-renders in hooks.
**Action:** Selectively wrap only the pure calculation functions in `useCallback` instead of memoizing the entire value object.
