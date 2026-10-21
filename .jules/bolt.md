## 2024-06-25 - React Context Memoization
**Learning:** Providing an unmemoized object directly to a context provider (e.g., `<SidebarContext.Provider value={{ isOpen, toggleSidebar, openSidebar, closeSidebar }}>`) causes every component consuming that context to re-render whenever the provider re-renders, even if the context values haven't logically changed.
**Action:** Always wrap context values in `useMemo` and functions in `useCallback` (using functional state updates where possible to avoid stale closures) before passing them to the provider.
