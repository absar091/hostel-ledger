## 2025-03-20 - Memoizing Expensive Context Calculations
**Learning:** Large React Context providers like `FirebaseAuthContext` can cause unnecessary re-renders in downstream consumers if calculation functions are not memoized and recreate on every render.
**Action:** Selectively wrap exposed calculation functions (like `getSettlements` or `getTotalToReceive`) in `useCallback` to maintain referential equality and prevent unnecessary executions in downstream `useEffect` hooks, even if the main provider value remains unmemoized.
