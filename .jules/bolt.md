## 2024-06-28 - Avoid redundant renders in React Context Providers
**Learning:** Large React Context Providers like `FirebaseAuthContext.Provider` that pass a non-memoized object directly into the `value` prop will cause all consuming components to re-render whenever the provider re-renders, even if the underlying state they care about hasn't changed.
**Action:** Always memoize the `value` object using `useMemo` in Context Providers.
