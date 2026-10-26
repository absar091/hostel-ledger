## 2024-10-26 - Memoize SidebarContext values
**Learning:** Passing unmemoized object literals and updater functions to `Context.Provider`'s `value` prop causes all context consumers to re-render whenever the Provider's parent component re-renders.
**Action:** Use `useMemo` to memoize the context `value` object. Use `useCallback` with empty dependency arrays (by leveraging functional state updates like `prev => !prev` instead of depending on current state) to memoize the updater functions included in the context value.
