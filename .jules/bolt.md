## 2024-06-05 - Avoid returning unmemoized array references dynamically in context values
**Learning:** Returning dynamically generated arrays in context values without memoization (like unmemoized filter functions) causes all dependent consumers to unnecessarily re-render and recompute useMemo hooks constantly because the dependencies change every render.
**Action:** Always wrap context functions returning new object/array instances with `useCallback` when they depend on state.
