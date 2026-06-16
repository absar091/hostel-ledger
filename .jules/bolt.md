## 2024-06-16 - Memoizing React Context Providers
**Learning:** Passing a dynamically created object (like `{ isOpen, toggleSidebar }`) directly into a Context Provider's `value` prop forces all consuming components to re-render whenever the Provider's parent re-renders, even if the actual state hasn't changed.
**Action:** When creating Context Providers, always memoize the context `value` object using `useMemo` and any provided functions using `useCallback` to prevent unnecessary re-renders of all downstream consumers.
