## 2024-11-05 - Optimize React Context Providers
**Learning:** Context providers passing new object literal references on every render (`value={{ ... }}`) cause unnecessary cascading re-renders of all consuming components, even if the actual state values haven't changed.
**Action:** Always wrap context provider value objects in `useMemo` and memoize state updater functions with `useCallback` (using functional state updates where possible to minimize dependencies) to ensure reference stability.
