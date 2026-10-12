## 2024-05-24 - Context Derived State Memoization
**Learning:** Re-deriving context variables using array maps/filters or returning unmemoized empty objects (e.g. `{}`) creates new references on every render, invalidating deep `useMemo` hooks (cascading re-renders) even if the source data hasn't changed.
**Action:** When destructuring contextual context or transforming raw fallback groups, explicitly wrap the transformation or fallback inside a `useMemo` with minimal dependencies (e.g., `id`, `allTransactions`).
