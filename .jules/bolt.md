
## 2023-10-27 - SidebarContext Optimization
**Learning:** Found an unmemoized context provider `SidebarContext` passing inline functions (`toggleSidebar`, `openSidebar`, `closeSidebar`) and state to its consumers.
**Action:** Memoized the functions using `useCallback` with functional state updates `setIsOpen(prev => !prev)`, and memoized the context value with `useMemo`. This pattern should be consistently applied to other small unmemoized contexts.
