## 2024-05-18 - Memoizing Context Values
**Learning:** Returning unmemoized context values or unmemoized inline functions from Context Providers (like `SidebarContext`) creates new object references on every render, causing severe cascading re-renders in all consumers of that context.
**Action:** Always wrap context values in `useMemo` and functions in `useCallback` inside Context Providers.
