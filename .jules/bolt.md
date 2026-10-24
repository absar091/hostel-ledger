
## 2025-02-23 - Memoizing Context Values
**Learning:** Found that `SidebarContext` was passing newly instantiated anonymous functions and objects on every render, forcing all sidebar consumers to re-render needlessly whenever `SidebarProvider` re-renders.
**Action:** Always wrap context provider value objects in `useMemo` and standard state-mutating callbacks (like toggles) in `useCallback` with empty dependency arrays (using functional state updates) to ensure referential stability and prevent cascading app re-renders.
