## 2025-06-12 - Memoize Context Values
**Learning:** In React, if a Context Provider recreates its `value` object on every render, it will cause all consuming components to unnecessarily re-render, even if the actual state values haven't changed.
**Action:** Always wrap Context Provider `value` objects in `useMemo` and any provided functions in `useCallback` to maintain referential equality and prevent performance bottlenecks across the application.
