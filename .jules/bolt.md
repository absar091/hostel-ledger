## 2024-11-05 - Stable Context References

**Learning:** When using React Context (like `SidebarContext`), providing an unmemoized object directly to the `value` prop causes all consuming components to re-render every time the provider's parent re-renders or any state within the provider changes.
**Action:** Always wrap the context value object in `useMemo` and the provided functions in `useCallback` (using functional state updates to avoid dependencies) to maintain stable references and prevent unnecessary cascading re-renders.
