## 2023-10-26 - Memoizing React Context Values
**Learning:** In a large React application, unmemoized context values create new object references on every render of the provider, causing cascading unnecessary re-renders in all consumer components even if the actual data hasn't changed.
**Action:** When creating or modifying React Context Providers, always wrap the provider's `value` object in `useMemo` and memoize any callback functions passed within it using `useCallback`. Use the functional state updater (e.g., `setIsOpen(prev => !prev)`) in callbacks to avoid unnecessary dependencies.
