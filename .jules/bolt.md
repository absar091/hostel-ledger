## 2025-06-25 - React Context performance

**Learning:** Missing `useCallback` on context functions like `getSettlements` or `getAllTransactions` in large contexts (`FirebaseAuthContext`, `FirebaseDataContext`) can cause cascading unnecessary re-renders in consumer components, especially since they are used inside `useMemo` hooks or `useEffect` dependencies across the app.
**Action:** Always wrap exported functions from context providers in `useCallback` when they are placed into the context value, unless there's a specific reason not to.
