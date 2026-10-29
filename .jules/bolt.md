## 2025-02-23 - Memoizing Context Values
**Learning:** In React, passing unmemoized values to a Context provider (like `SidebarContext`) causes all consumers of that context to re-render whenever the provider re-renders, even if the state hasn't conceptually changed.
**Action:** Always wrap context values in `useMemo` and state updater functions in `useCallback`. Use the functional state update pattern (`setState(prev => !prev)`) inside `useCallback` to avoid adding the state variable itself to the dependency array, keeping the function reference stable.
