## 2024-05-18 - AuthContext useMemo optimization
**Learning:** Found that AuthContext, SidebarContext and FirebaseAuthContext were missing useMemo/useCallback on their provided values. This is an anti-pattern as it causes all consuming components to re-render whenever the Provider re-renders, even if the actual context values didn't change.
**Action:** Always wrap context values in `useMemo` and functions in `useCallback` when creating Context Providers.
