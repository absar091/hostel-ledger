## 2024-05-15 - Memoized Context Providers
**Learning:** Found unmemoized object literals passed to React Context Provider `value` props across the codebase (e.g., `SidebarContext`, `AuthContext`, `DataContext`). This anti-pattern creates new object references on every render, invalidating downstream memoization and causing cascading unnecessary re-renders of all consumer components.
**Action:** Wrap context `value` objects with `useMemo` and memoize any functions passed within it using `useCallback`. Ensure to provide stable dependencies to the dependency arrays.
