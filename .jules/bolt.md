## 2024-03-24 - [Sidebar Context Re-Renders]
**Learning:** Found an unmemoized SidebarContext in the codebase. Every time its state toggles, it forces a re-render of all its consumers.
**Action:** Always memoize state updaters using useCallback with a functional state update (prev => !prev), and context values using useMemo so we provide stable references to consumers and avoid unnecessary UI thrashing.
