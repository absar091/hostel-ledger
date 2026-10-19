## 2024-10-19 - Context Value Memoization
**Learning:** Returning unmemoized objects in React Context providers (like AuthContext, FirebaseAuthContext, DataContext) causes unnecessary re-renders for all consuming components whenever the context state updates, even if the consumed values haven't changed.
**Action:** Use `useMemo` to memoize context values and `useCallback` to memoize context functions.
