
## 2024-11-21 - Avoid Attempting to Memoize Massive Contexts
**Learning:** Attempting to optimize `FirebaseAuthContext.tsx` by wrapping the `value` in `useMemo` without also wrapping its 30+ internal functions in `useCallback` makes the `useMemo` completely ineffective, as the functions are recreated on every render anyway.
**Action:** When working under a <50 lines constraint, avoid attempting to optimize massive contexts. Focus on smaller, manageable contexts like `AuthContext` or `SidebarContext` where both functions and the value object can be safely and completely memoized.
