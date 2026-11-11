## 2024-03-08 - Context Values Causing Re-renders
**Learning:** In large contexts like FirebaseAuthContext, exposing complex unmemoized calculation functions (like `getSettlements` which aggregates object values) causes downstream consumers to constantly recalculate and potentially re-render, especially since they're bundled into the context provider value object.
**Action:** Always wrap derived helper functions inside context providers with `useCallback` when they depend on specific slices of context state rather than creating them anew on every render.
