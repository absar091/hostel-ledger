## 2024-10-24 - Memoize React Context Providers to Avoid Cascading Re-renders
**Learning:** Returning a new object literal (e.g., `value={{ state, fn }}`) in a React Context Provider creates a new object reference on every render, which triggers unnecessary re-renders in all consumers of that context.
**Action:** Always memoize the `value` object with `useMemo` and the callback functions with `useCallback` when providing values through a React Context.
