
## 2024-05-14 - Context Re-render Bottleneck
**Learning:** Contexts like `SidebarContext` in React often cause unnecessary cascading re-renders across the entire app if the `value` object is recreated on every render. Inline functions without functional state updates lead to stale closures when memoized incorrectly.
**Action:** Use `useMemo` for context `value` objects and `useCallback` for context functions. For toggle functions, use functional state updates (e.g., `setIsOpen(prev => !prev)`) with an empty dependency array `[]` to prevent stale closures while keeping the function reference stable.
